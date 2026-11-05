-- Operación BEL · 0020 · Sesiones libres: una sesión puede cubrir varias misiones
-- La misión principal sigue en sesiones.modulo_codigo; las demás en modulos_extra.
-- La asistencia marcada en una sesión libre habilita las actividades de TODAS sus misiones
-- (y otorga la XP de asistencia de cada una).

alter table sesiones add column if not exists modulos_extra text[] not null default '{}';

-- Valida las misiones adicionales: existen, sin repetir la principal
create or replace function validar_modulos_extra() returns trigger
language plpgsql set search_path = public as $$
declare m text;
begin
  new.modulos_extra := coalesce((select array_agg(distinct x order by x) from unnest(new.modulos_extra) x
                                  where x is not null and x <> new.modulo_codigo), '{}');
  foreach m in array new.modulos_extra loop
    if not exists (select 1 from modulos where codigo = m) then raise exception 'Misión no existe: %', m; end if;
  end loop;
  return new;
end $$;
create trigger sesiones_modulos_extra before insert or update of modulos_extra, modulo_codigo on sesiones
  for each row execute function validar_modulos_extra();

-- Todas las misiones de una sesión
create or replace function modulos_de(s sesiones) returns text[]
language sql immutable as $$ select array[s.modulo_codigo] || s.modulos_extra $$;

create or replace function asistio(p_perfil uuid, p_modulo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from asistencias a join sesiones s on s.id = a.sesion_id
                  where a.perfil_id = p_perfil and a.presente and p_modulo = any (modulos_de(s))
                    and s.estado not in ('suspendida', 'cancelada'))
$$;
revoke execute on function asistio from public, anon, authenticated;

-- Recalcula una persona en todas las misiones de una sesión
create or replace function recalcular_sesion_persona(p_sesion uuid, p_perfil uuid, p_fuente uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare m text;
begin
  foreach m in array (select modulos_de(s) from sesiones s where s.id = p_sesion) loop
    perform recalcular_asistencia(p_perfil, m, p_fuente, p_motivo);
  end loop;
end $$;
revoke execute on function recalcular_sesion_persona from public, anon, authenticated;

create or replace function registrar_asistencia(p_sesion uuid, p_perfil uuid, p_presente boolean,
                                                p_mecanismo text default 'instructor', p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_estado text; v_prev asistencias; v_id uuid;
begin
  if not (instructor_de(p_sesion) or es_gestor()) then
    raise exception 'No autorizado para registrar asistencia en esta sesión';
  end if;
  if p_perfil = auth.uid() and not es_gestor() then
    raise exception 'No puedes registrar tu propia asistencia';
  end if;
  if not exists (select 1 from inscripciones where sesion_id = p_sesion and perfil_id = p_perfil) then
    raise exception 'La persona no está inscrita en esta sesión';
  end if;
  select estado into v_estado from sesiones where id = p_sesion;
  if v_estado = 'cancelada' then raise exception 'La sesión está cancelada'; end if;
  select * into v_prev from asistencias where sesion_id = p_sesion and perfil_id = p_perfil;
  if found and v_prev.presente <> p_presente and coalesce(trim(p_motivo), '') = '' then
    raise exception 'Corregir una asistencia exige un motivo';
  end if;
  insert into asistencias (sesion_id, perfil_id, presente, mecanismo, registrado_por)
  values (p_sesion, p_perfil, p_presente, p_mecanismo, auth.uid())
  on conflict (sesion_id, perfil_id) do update
    set presente = excluded.presente, mecanismo = excluded.mecanismo,
        registrado_por = excluded.registrado_por, registrado_en = now()
  returning id into v_id;
  if v_prev.id is not null and v_prev.presente <> p_presente then
    perform auditar('corregir_asistencia', 'asistencias', v_id::text, to_jsonb(v_prev),
                    jsonb_build_object('presente', p_presente), p_motivo);
  end if;
  if p_perfil = auth.uid() then
    perform auditar('asistencia_propia', 'asistencias', v_id::text, null, jsonb_build_object('presente', p_presente), p_motivo);
  end if;
  perform recalcular_sesion_persona(p_sesion, p_perfil, v_id, coalesce(p_motivo, 'Asistencia validada'));
end $$;
revoke execute on function registrar_asistencia from public, anon;
grant execute on function registrar_asistencia to authenticated;

create or replace function sesion_cambio_estado() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; v_motivo text := nullif(current_setting('bel.motivo_estado', true), '');
begin
  if tg_op = 'INSERT' then
    insert into sesion_historial (sesion_id, estado_anterior, estado_nuevo, motivo, actor)
    values (new.id, null, new.estado, coalesce(v_motivo, 'Sesión creada'), auth.uid());
    return new;
  end if;
  if new.estado is distinct from old.estado then
    insert into sesion_historial (sesion_id, estado_anterior, estado_nuevo, motivo, actor)
    values (new.id, old.estado, new.estado, v_motivo, auth.uid());
    perform auditar('cambiar_estado_sesion', 'sesiones', new.id::text,
                    jsonb_build_object('estado', old.estado), jsonb_build_object('estado', new.estado), v_motivo);
    if (old.estado in ('suspendida', 'cancelada')) <> (new.estado in ('suspendida', 'cancelada')) then
      for r in select perfil_id from asistencias where sesion_id = new.id and presente loop
        perform recalcular_sesion_persona(new.id, r.perfil_id, new.id,
          case when new.estado = 'suspendida' then 'Sesión suspendida'
               when new.estado = 'cancelada' then 'Sesión cancelada' else 'Sesión reactivada' end);
      end loop;
    end if;
  end if;
  return new;
end $$;

-- Si se agregan o quitan misiones de una sesión con asistencia, se recalcula
create or replace function sesion_cambio_modulos() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; m text;
begin
  if modulos_de(new) is distinct from modulos_de(old) then
    for r in select perfil_id from asistencias where sesion_id = new.id and presente loop
      foreach m in array (select array(select distinct x from unnest(modulos_de(new) || modulos_de(old)) x)) loop
        perform recalcular_asistencia(r.perfil_id, m, new.id, 'Cambio de misiones de la sesión');
      end loop;
    end loop;
  end if;
  return new;
end $$;
create trigger sesion_cambio_modulos after update of modulo_codigo, modulos_extra on sesiones
  for each row execute function sesion_cambio_modulos();

create or replace function reprogramar_sesion(p_sesion uuid, p_inicio timestamptz, p_fin timestamptz,
                                              p_lugar text default null, p_enlace text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_s sesiones; v_nueva uuid;
begin
  if not (instructor_de(p_sesion) or es_gestor()) then raise exception 'No autorizado para reprogramar esta sesión'; end if;
  select * into v_s from sesiones where id = p_sesion;
  if not found then raise exception 'La sesión no existe'; end if;
  if v_s.estado not in ('suspendida', 'cancelada') then raise exception 'Solo se reprograma una sesión suspendida o cancelada'; end if;
  if v_s.reprogramada_en_id is not null then raise exception 'Esta sesión ya fue reprogramada'; end if;
  if p_fin <= p_inicio then raise exception 'La hora de fin debe ser posterior a la de inicio'; end if;
  perform set_config('bel.motivo_estado', 'Reprogramación de una sesión ' || v_s.estado, true);
  insert into sesiones (modulo_codigo, modulos_extra, modalidad, inicio, fin, lugar, enlace, instructor_id, cupo, estado, sesion_origen_id)
  values (v_s.modulo_codigo, v_s.modulos_extra, v_s.modalidad, p_inicio, p_fin, coalesce(nullif(trim(p_lugar), ''), v_s.lugar),
          coalesce(nullif(trim(p_enlace), ''), v_s.enlace), v_s.instructor_id, v_s.cupo, 'programada', p_sesion)
  returning id into v_nueva;
  perform set_config('bel.motivo_estado', '', true);
  update sesiones set reprogramada_en_id = v_nueva where id = p_sesion;
  insert into inscripciones (sesion_id, perfil_id) select v_nueva, perfil_id from inscripciones where sesion_id = p_sesion
  on conflict do nothing;
  insert into sesion_historial (sesion_id, estado_anterior, estado_nuevo, motivo, actor)
  values (p_sesion, v_s.estado, v_s.estado, 'Reprogramada para el ' || to_char(p_inicio at time zone 'America/Bogota', 'DD/MM/YYYY HH24:MI'), auth.uid());
  perform auditar('reprogramar_sesion', 'sesiones', p_sesion::text, null, jsonb_build_object('nueva', v_nueva, 'inicio', p_inicio), null);
  return v_nueva;
end $$;
revoke execute on function reprogramar_sesion from public, anon;
grant execute on function reprogramar_sesion to authenticated;

create or replace function resultados_mision(p_modulo text, p_perfil uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_p uuid := coalesce(p_perfil, auth.uid()); v_ultimo uuid;
begin
  if v_p <> auth.uid() and not (ve_seguimiento() or tiene_rol('instructor')) then raise exception 'No autorizado'; end if;
  select i.id into v_ultimo from intentos i join cuestionarios c on c.id = i.cuestionario_id
   where i.perfil_id = v_p and c.modulo_codigo = p_modulo order by i.enviado_en desc limit 1;
  return jsonb_build_object(
    'asistencias', coalesce((select jsonb_agg(jsonb_build_object(
        'inicio', s.inicio, 'modalidad', s.modalidad, 'presente', a.presente, 'estado_sesion', s.estado,
        'cuenta', a.presente and s.estado not in ('suspendida', 'cancelada')) order by s.inicio)
      from asistencias a join sesiones s on s.id = a.sesion_id
     where a.perfil_id = v_p and p_modulo = any (modulos_de(s))), '[]'::jsonb),
    'retos', coalesce((select jsonb_agg(jsonb_build_object(
        'fecha', e.fecha, 'aprobado', e.aprobado, 'autonomo', e.autonomo, 'observaciones', e.observaciones,
        'evaluador', ev.nombre,
        'criterios', coalesce((select jsonb_agg(jsonb_build_object('descripcion', c.descripcion, 'critico', c.critico, 'cumple', rc.cumple)
                                               order by c.orden)
                                 from resultados_criterio rc join criterios c on c.id = rc.criterio_id
                                where rc.evaluacion_id = e.id), '[]'::jsonb)) order by e.fecha desc)
      from evaluaciones_reto e left join perfiles ev on ev.id = e.evaluador_id
     where e.perfil_id = v_p and e.modulo_codigo = p_modulo), '[]'::jsonb),
    'intentos', coalesce((select jsonb_agg(jsonb_build_object('fecha', i.enviado_en, 'puntaje', i.puntaje, 'aprobado', i.aprobado)
                                           order by i.enviado_en desc)
      from intentos i join cuestionarios c on c.id = i.cuestionario_id
     where i.perfil_id = v_p and c.modulo_codigo = p_modulo), '[]'::jsonb),
    'ultimo_intento', coalesce((select jsonb_agg(jsonb_build_object('enunciado', pr.enunciado, 'respuesta', o.texto,
                                   'correcta', r.correcta, 'retroalimentacion', pr.retroalimentacion) order by pr.orden)
      from respuestas r join preguntas pr on pr.id = r.pregunta_id left join opciones o on o.id = r.opcion_id
     where r.intento_id = v_ultimo), '[]'::jsonb)
  );
end $$;
revoke execute on function resultados_mision from public, anon;
grant execute on function resultados_mision to authenticated;

-- Pendientes de firma: muestra todas las misiones de la sesión
create or replace function firmas_pendientes()
returns table (sesion_id uuid, inicio timestamptz, modulo_codigo text, mision text, modalidad text, lugar text)
language sql stable security definer set search_path = public as $$
  select s.id, s.inicio, array_to_string(modulos_de(s), ', '),
         case when cardinality(s.modulos_extra) > 0 then 'Sesión libre' else m.mision end,
         s.modalidad::text, s.lugar
    from asistencias a join sesiones s on s.id = a.sesion_id join modulos m on m.codigo = s.modulo_codigo
   where a.perfil_id = auth.uid() and a.presente and a.firma_path is null
   order by s.inicio desc
$$;

-- Listas de asistencia: misiones de la sesión y filtro por cualquiera de ellas
create or replace function lista_asistencia(p_sesion uuid default null, p_desde date default null,
                                            p_hasta date default null, p_modulo text default null)
returns table (sesion_id uuid, inicio timestamptz, fin timestamptz, modulo_codigo text, modulo text, mision text,
               modalidad text, lugar text, enlace text, instructor text, estado_sesion text,
               temas_abordados text, temas_pendientes text,
               nombre text, correo text, rol text, estacion text, compania text, grupo_elite boolean,
               asistencia text, registrado_por text, registrado_en timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.inicio, s.fin, array_to_string(modulos_de(s), ' + '),
         (select string_agg(mm.nombre, ' · ' order by mm.orden) from modulos mm where mm.codigo = any (modulos_de(s))),
         case when cardinality(s.modulos_extra) > 0 then 'Sesión libre' else m.mision end,
         s.modalidad::text, s.lugar, s.enlace, ins.nombre, s.estado,
         s.temas_abordados, s.temas_pendientes,
         p.nombre, p.correo,
         rb.nombre || coalesce(' + ' || (select string_agg(x.nombre, ' + ' order by x.orden) from roles_bel x where x.id = any (p.roles_bel_extra)), ''),
         e.nombre, c.nombre, p.grupo_elite,
         case when a.presente then 'Asistió' when a.presente = false then 'No asistió' else 'Sin registrar' end,
         rp.nombre, a.registrado_en
    from sesiones s
    join modulos m on m.codigo = s.modulo_codigo
    left join perfiles ins on ins.id = s.instructor_id
    join inscripciones i on i.sesion_id = s.id
    join perfiles p on p.id = i.perfil_id
    left join roles_bel rb on rb.id = p.rol_bel_id
    left join unidades e on e.id = p.estacion_id
    left join unidades c on c.id = p.compania_id
    left join asistencias a on a.sesion_id = s.id and a.perfil_id = p.id
    left join perfiles rp on rp.id = a.registrado_por
   where (ve_seguimiento() or s.instructor_id = auth.uid())
     and (p_sesion is null or s.id = p_sesion)
     and (p_desde is null or (s.inicio at time zone 'America/Bogota')::date >= p_desde)
     and (p_hasta is null or (s.inicio at time zone 'America/Bogota')::date <= p_hasta)
     and (p_modulo is null or p_modulo = any (modulos_de(s)))
   order by s.inicio, s.id, p.nombre
$$;

create or replace function firmas_lista(p_sesion uuid default null, p_desde date default null, p_hasta date default null, p_modulo text default null)
returns table (sesion_id uuid, correo text, firma_path text, firmado_en timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, p.correo, a.firma_path, a.firmado_en
    from sesiones s join asistencias a on a.sesion_id = s.id join perfiles p on p.id = a.perfil_id
   where a.firma_path is not null
     and (ve_seguimiento() or s.instructor_id = auth.uid())
     and (p_sesion is null or s.id = p_sesion)
     and (p_desde is null or (s.inicio at time zone 'America/Bogota')::date >= p_desde)
     and (p_hasta is null or (s.inicio at time zone 'America/Bogota')::date <= p_hasta)
     and (p_modulo is null or p_modulo = any (modulos_de(s)))
$$;
