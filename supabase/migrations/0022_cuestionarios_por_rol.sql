-- 0022 · Cuestionarios dirigidos a roles específicos dentro de una misión.
-- cuestionarios.roles_bel = null → cuestionario general de la misión.
-- cuestionarios.roles_bel = {...} → solo para quienes TODOS sus roles en esa misión están en la lista.
-- Así, una persona con un rol que ejecuta en la misión (p. ej. Bombero + Encargado de Estación) sigue con el general.

alter table cuestionarios add column if not exists roles_bel text[];

/** Cuestionario que le corresponde a una persona en una misión. */
create or replace function cuestionario_de(p_perfil uuid, p_modulo text)
returns uuid language sql stable security definer set search_path = public as $$
  with mis_roles as (
    select coalesce(array_agg(rm.rol_bel_id), '{}') r from rol_modulo rm
     where rm.modulo_codigo = p_modulo and rm.rol_bel_id = any (roles_bel_de(p_perfil))
  )
  select c.id from cuestionarios c, mis_roles m
   where c.modulo_codigo = p_modulo and c.activo
     and (c.roles_bel is null or (cardinality(m.r) > 0 and m.r <@ c.roles_bel))
   order by (c.roles_bel is not null) desc, c.version desc
   limit 1
$$;
revoke execute on function cuestionario_de from public, anon;
grant execute on function cuestionario_de to authenticated;

-- Solo se puede responder el cuestionario que corresponde a la persona
create or replace function enviar_cuestionario(p_cuestionario uuid, p_respuestas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_c cuestionarios; v_total int; v_ok int := 0; v_intento uuid; v_aprobado boolean;
  v_usados int; r record; v_correcta boolean; v_detalle jsonb := '[]'::jsonb;
begin
  select * into v_c from cuestionarios where id = p_cuestionario and activo;
  if not found then raise exception 'Cuestionario no disponible'; end if;
  if not exists (select 1 from rol_modulo rm where rm.modulo_codigo = v_c.modulo_codigo
                  and rm.rol_bel_id = any (roles_bel_de(auth.uid()))) then
    raise exception 'Esta misión no está en tu ruta';
  end if;
  if cuestionario_de(auth.uid(), v_c.modulo_codigo) is distinct from p_cuestionario then
    raise exception 'Este cuestionario no corresponde a tu rol. Vuelve a abrir el cuestionario de la misión.';
  end if;
  if not habilitada(auth.uid(), v_c.modulo_codigo) then
    raise exception 'El cuestionario se habilita cuando tu instructor registra tu asistencia a la sesión de esta misión';
  end if;
  select count(*) into v_usados from intentos where perfil_id = auth.uid() and cuestionario_id = p_cuestionario;
  if v_c.max_intentos is not null and v_usados >= v_c.max_intentos then
    raise exception 'Ya usaste los % intentos permitidos', v_c.max_intentos;
  end if;
  select count(*) into v_total from preguntas where cuestionario_id = p_cuestionario and activo;
  if v_total = 0 then raise exception 'El cuestionario no tiene preguntas'; end if;

  insert into intentos (cuestionario_id, version, perfil_id, puntaje, aprobado)
  values (p_cuestionario, v_c.version, auth.uid(), 0, false) returning id into v_intento;

  for r in select id, retroalimentacion from preguntas where cuestionario_id = p_cuestionario and activo order by orden loop
    v_correcta := exists (select 1 from opciones_correctas oc
                          where oc.pregunta_id = r.id and oc.opcion_id::text = p_respuestas ->> r.id::text);
    if v_correcta then v_ok := v_ok + 1; end if;
    insert into respuestas (intento_id, pregunta_id, opcion_id, correcta)
    values (v_intento, r.id, nullif(p_respuestas ->> r.id::text, '')::uuid, v_correcta);
    v_detalle := v_detalle || jsonb_build_object('pregunta_id', r.id, 'correcta', v_correcta, 'retroalimentacion', r.retroalimentacion);
  end loop;

  v_aprobado := (v_ok::numeric / v_total) >= v_c.umbral;
  update intentos set puntaje = round(v_ok::numeric / v_total, 3), aprobado = v_aprobado where id = v_intento;
  if v_aprobado then
    perform asegurar_xp(auth.uid(), v_c.modulo_codigo, 'cuestionario', true, v_intento, 'Cuestionario aprobado');
    perform verificar_mision(auth.uid(), v_c.modulo_codigo);
  end if;
  return jsonb_build_object('puntaje', round(v_ok::numeric / v_total, 3), 'aprobado', v_aprobado,
                            'correctas', v_ok, 'total', v_total, 'detalle', v_detalle);
end $$;

-- ═════════ M01 · Cuestionario de consulta para el personal de línea ═════════
-- Bombero, Bombero Maquinista y Guardia Permanente: en Control Turnos solo consultan su cronograma («Mis turnos»).
do $$
declare c uuid;
begin
  if exists (select 1 from cuestionarios where modulo_codigo = 'M01' and roles_bel is not null) then return; end if;
  insert into cuestionarios (modulo_codigo, titulo, descripcion, umbral, roles_bel) values
  ('M01', 'Mi turno a la vista',
   'Borrador por validar. 8 preguntas sobre lo que el personal de línea consulta en Control Turnos: su cronograma, sus turnos anteriores y siguientes, y las novedades de cada día.',
   0.8, array['bombero', 'bombero_maquinista', 'guardia_permanente'])
  returning id into c;

  perform _cargar_pregunta(c, 1, '¿Dónde encuentras tus turnos en BEL?',
    'Control Turnos está en Menú › Gestión de Novedades › Control Turnos. Allí consultas tu cronograma.',
    array['Menú › Minuta Digital › Bitácora Diaria', 'Menú › Gestión de Novedades › Control Turnos', 'Menú › Gestión de Nómina', 'Menú › Administración'], 2);
  perform _cargar_pregunta(c, 2, 'Como bombero, ¿qué turnos ves en Control Turnos?',
    'Los mandos ven la programación completa y el Encargado de Estación la de su estación. Tú ves solo los turnos donde estás asignado: «Mis turnos».',
    array['La programación de todas las compañías', 'Solo los turnos donde estás asignado', 'Solo los turnos de tu estación, de todo el personal', 'El Consolidado General del día'], 2);
  perform _cargar_pregunta(c, 3, '¿Qué vistas ofrece el cronograma de tus turnos?',
    'El cronograma se puede ver en vista «Semanal» o «Mensual».',
    array['Solo vista diaria', 'Vista «Semanal» o «Mensual»', 'Solo una lista en PDF', 'Vista anual por compañía'], 2);
  perform _cargar_pregunta(c, 4, 'Quieres revisar los turnos que ya trabajaste la semana pasada. ¿Qué haces?',
    'Con «Semana Anterior» recorres tu historial de turnos; la vista «Mensual» te muestra el mes completo.',
    array['Pedirle el registro a la Secretaria', 'Pulsar «Semana Anterior» en el cronograma', 'Abrir el Consolidado General', 'No se puede: solo se ven los turnos futuros'], 2);
  perform _cargar_pregunta(c, 5, 'Te moviste por varias semanas del cronograma. ¿Cómo regresas a la fecha actual?',
    'El botón «Hoy» lleva el cronograma de nuevo a la fecha actual.',
    array['Cerrando sesión y volviendo a entrar', 'Pulsando «Hoy»', 'Pulsando «Semana Siguiente» varias veces', 'Cambiando a la vista «Mensual»'], 2);
  perform _cargar_pregunta(c, 6, '¿Cómo ves si un día tienes una novedad o horas extras?',
    'Al pulsar la celda de un día en el cronograma ves la novedad o las horas extras de ese día.',
    array['Pulsando la celda de ese día en el cronograma', 'Solo en la Bitácora Diaria', 'Preguntando al Encargado de Estación', 'Descargando el informe de nómina'], 1);
  perform _cargar_pregunta(c, 7, 'Te aprobaron una novedad (por ejemplo, vacaciones) para un día. ¿Qué pasa en Control Turnos?',
    'Con una novedad aprobada, el sistema te muestra con esa novedad en el cronograma y apareces deshabilitado para asignarte ese día.',
    array['Nada, hay que avisar a mano', 'Se muestra en tu cronograma y apareces deshabilitado para ser asignado ese día', 'Se borra tu turno de todo el mes', 'Debes registrar tú mismo el cambio de turno'], 2);
  perform _cargar_pregunta(c, 8, 'Ves un dato de tu turno que no corresponde. ¿Qué haces?',
    'Tu rol consulta: no crea ni modifica turnos. Los turnos los programan y ajustan el Subcomandante y el Encargado Operativo; comunica la diferencia a tu Encargado de Estación o a tu mando.',
    array['Lo corriges tú mismo en Control Turnos', 'Lo comunicas a tu Encargado de Estación o a tu mando', 'Creas un turno nuevo con los datos correctos', 'Lo anotas en la nómina'], 2);
end $$;
