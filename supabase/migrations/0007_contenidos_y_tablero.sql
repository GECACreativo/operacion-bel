-- Operación BEL · 0007 · Edición de contenidos y tablero de seguimiento

-- Las preguntas ya respondidas no se borran: se desactivan.
alter table preguntas add column if not exists activo boolean not null default true;

-- El cuestionario solo considera preguntas activas
create or replace function enviar_cuestionario(p_cuestionario uuid, p_respuestas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_c cuestionarios; v_total int; v_ok int := 0; v_intento uuid; v_aprobado boolean;
  v_usados int; r record; v_correcta boolean; v_detalle jsonb := '[]'::jsonb;
begin
  select * into v_c from cuestionarios where id = p_cuestionario and activo;
  if not found then raise exception 'Cuestionario no disponible'; end if;
  if not exists (select 1 from perfiles p join rol_modulo rm on rm.rol_bel_id = p.rol_bel_id
                 where p.id = auth.uid() and rm.modulo_codigo = v_c.modulo_codigo) then
    raise exception 'Esta misión no está en tu ruta';
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

-- Marcar la opción correcta de una pregunta (una sola) — solo administración, con auditoría.
create or replace function marcar_correcta(p_pregunta uuid, p_opcion uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_gestor() then raise exception 'No autorizado'; end if;
  if not exists (select 1 from opciones where id = p_opcion and pregunta_id = p_pregunta) then
    raise exception 'La opción no pertenece a la pregunta';
  end if;
  update opciones_correctas set opcion_id = p_opcion where pregunta_id = p_pregunta;
  if not found then
    insert into opciones_correctas (pregunta_id, opcion_id) values (p_pregunta, p_opcion);
  end if;
  perform auditar('marcar_correcta', 'opciones_correctas', p_pregunta::text, null, jsonb_build_object('opcion', p_opcion), null);
end $$;
revoke execute on function marcar_correcta from public, anon;
grant execute on function marcar_correcta to authenticated;

-- Tablero: una fila por persona y misión de su ruta (solo administración y coordinación).
create or replace function tablero()
returns table (perfil_id uuid, nombre text, correo text, rol text, familia text, estacion text, compania text,
               grupo_elite boolean, codigo text, estado text, xp int, asistencia boolean, cuestionario boolean, reto text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not ve_seguimiento() then raise exception 'No autorizado'; end if;
  return query
  select p.id, p.nombre, p.correo, rb.nombre, rb.familia, e.nombre, c.nombre, p.grupo_elite,
         r.codigo, r.estado, r.xp, r.asistencia, r.cuestionario, r.reto
    from perfiles p
    join roles_bel rb on rb.id = p.rol_bel_id
    left join unidades e on e.id = p.estacion_id
    left join unidades c on c.id = p.compania_id
    cross join lateral ruta_de(p.id) r
   where p.activo;
end $$;
revoke execute on function tablero from public, anon;
grant execute on function tablero to authenticated;
