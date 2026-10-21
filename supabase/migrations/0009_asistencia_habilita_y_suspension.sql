-- Operación BEL · 0009
-- 1) La asistencia a una sesión de la misión es la que habilita sus actividades (aunque sea fuera del orden de la ruta).
-- 2) Las sesiones pueden suspenderse (p. ej. por atención de emergencias), con temas abordados/pendientes y reprogramación.
--    La asistencia de una sesión suspendida o cancelada queda registrada pero no habilita la misión ni otorga XP.
-- 3) Cada participante consulta sus propios resultados (reto, cuestionario y ejecución autónoma).

-- ───────────── Sesiones: estado «suspendida», observaciones y reprogramación ─────────────

alter table sesiones drop constraint if exists sesiones_estado_check;
alter table sesiones add constraint sesiones_estado_check
  check (estado in ('programada', 'realizada', 'suspendida', 'cancelada'));

alter table sesiones
  add column if not exists temas_abordados text,
  add column if not exists temas_pendientes text,
  add column if not exists observaciones_estado text,
  add column if not exists sesion_origen_id uuid references sesiones(id),
  add column if not exists reprogramada_en_id uuid references sesiones(id);

-- Historial de cambios de estado de cada sesión (nunca se borra)
create table if not exists sesion_historial (
  id               bigint generated always as identity primary key,
  sesion_id        uuid not null references sesiones(id) on delete cascade,
  estado_anterior  text,
  estado_nuevo     text not null,
  motivo           text,
  actor            uuid,
  fecha            timestamptz not null default now()
);
create index if not exists sesion_historial_sesion on sesion_historial (sesion_id, fecha);
alter table sesion_historial enable row level security;
create policy lectura on sesion_historial for select to authenticated
  using (es_gestor() or instructor_de(sesion_id) or ve_seguimiento());

-- ───────────── Asistencia que cuenta ─────────────

-- ¿La persona asistió a una sesión válida (no suspendida ni cancelada) de esta misión?
create or replace function asistio(p_perfil uuid, p_modulo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from asistencias a join sesiones s on s.id = a.sesion_id
                  where a.perfil_id = p_perfil and s.modulo_codigo = p_modulo and a.presente
                    and s.estado not in ('suspendida', 'cancelada'))
$$;
revoke execute on function asistio from public, anon, authenticated;

-- Recalcula XP de asistencia y estado de la misión. Si ya no hay asistencia válida, la misión aprobada
-- vuelve a «requiere refuerzo» (decisión del proyecto).
create or replace function recalcular_asistencia(p_perfil uuid, p_modulo text, p_fuente uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform asegurar_xp(p_perfil, p_modulo, 'asistencia', asistio(p_perfil, p_modulo), p_fuente,
                      coalesce(p_motivo, 'Asistencia validada'));
  if not asistio(p_perfil, p_modulo) then
    update misiones_aprobadas set revocada_en = now(), motivo_revocacion = p_motivo
     where perfil_id = p_perfil and modulo_codigo = p_modulo and via = 'evidencias' and revocada_en is null;
    if found then
      perform auditar('revocar_mision', 'misiones_aprobadas', p_perfil::text || ':' || p_modulo, null, null, p_motivo);
    end if;
  end if;
  perform verificar_mision(p_perfil, p_modulo);
end $$;
revoke execute on function recalcular_asistencia from public, anon, authenticated;

create or replace function registrar_asistencia(p_sesion uuid, p_perfil uuid, p_presente boolean,
                                                p_mecanismo text default 'instructor', p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_mod text; v_estado text; v_prev asistencias; v_id uuid;
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
  select modulo_codigo, estado into v_mod, v_estado from sesiones where id = p_sesion;
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
  perform recalcular_asistencia(p_perfil, v_mod, v_id, coalesce(p_motivo, 'Asistencia validada'));
end $$;
revoke execute on function registrar_asistencia from public, anon;
grant execute on function registrar_asistencia to authenticated;

-- La aprobación exige asistencia válida
create or replace function verificar_mision(p_perfil uuid, p_modulo text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_rol text; v_hay_cuest boolean; v_hay_crit boolean; v_cuest boolean; v_reto boolean;
begin
  if exists (select 1 from misiones_aprobadas where perfil_id = p_perfil and modulo_codigo = p_modulo
             and (revocada_en is null or via = 'convalidacion')) then
    return true;
  end if;
  select rol_bel_id into v_rol from perfiles where id = p_perfil;
  select exists (select 1 from cuestionarios where modulo_codigo = p_modulo and activo) into v_hay_cuest;
  select exists (select 1 from criterios where modulo_codigo = p_modulo and activo and (rol_bel_id is null or rol_bel_id = v_rol)) into v_hay_crit;
  if not v_hay_cuest and not v_hay_crit then return false; end if;
  select not v_hay_cuest or exists (select 1 from intentos i join cuestionarios c on c.id = i.cuestionario_id
                 where i.perfil_id = p_perfil and c.modulo_codigo = p_modulo and i.aprobado) into v_cuest;
  select not v_hay_crit or exists (select 1 from evaluaciones_reto
                 where perfil_id = p_perfil and modulo_codigo = p_modulo and aprobado) into v_reto;
  if asistio(p_perfil, p_modulo) and v_cuest and v_reto then
    insert into misiones_aprobadas (perfil_id, modulo_codigo) values (p_perfil, p_modulo)
    on conflict (perfil_id, modulo_codigo) do update set revocada_en = null, motivo_revocacion = null, fecha = now();
    return true;
  end if;
  return false;
end $$;

-- ───────────── Actividades habilitadas solo con asistencia ─────────────

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
  if not asistio(auth.uid(), v_c.modulo_codigo) then
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

create or replace function evaluar_reto(p_perfil uuid, p_modulo text, p_resultados jsonb,
                                        p_autonomo boolean, p_observaciones text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_rol text; v_eval uuid; v_aprobado boolean; v_total int; v_cumple int; v_critico_falla boolean; v_umbral numeric;
begin
  if not (tiene_rol('instructor') or es_gestor()) then raise exception 'Solo instructores pueden evaluar retos'; end if;
  if p_perfil = auth.uid() then raise exception 'No puedes evaluar tu propio reto'; end if;
  if not asistio(p_perfil, p_modulo) then
    raise exception 'Primero registra la asistencia de la persona en una sesión de esta misión';
  end if;
  select rol_bel_id into v_rol from perfiles where id = p_perfil;

  with c as (select id, critico from criterios
             where modulo_codigo = p_modulo and activo and (rol_bel_id is null or rol_bel_id = v_rol))
  select count(*),
         count(*) filter (where (p_resultados ->> c.id::text)::boolean is true),
         bool_or(c.critico and coalesce((p_resultados ->> c.id::text)::boolean, false) = false)
    into v_total, v_cumple, v_critico_falla from c;
  if v_total = 0 then raise exception 'Esta misión no tiene criterios configurados para el rol'; end if;

  v_umbral := coalesce((select (valor #>> '{}')::numeric from parametros where clave = 'umbral_reto'), 0.8);
  v_aprobado := not coalesce(v_critico_falla, false) and (v_cumple::numeric / v_total) >= v_umbral;

  insert into evaluaciones_reto (modulo_codigo, perfil_id, evaluador_id, autonomo, aprobado, observaciones)
  values (p_modulo, p_perfil, auth.uid(), p_autonomo, v_aprobado, p_observaciones) returning id into v_eval;
  insert into resultados_criterio (evaluacion_id, criterio_id, cumple)
  select v_eval, c.id, coalesce((p_resultados ->> c.id::text)::boolean, false)
    from criterios c where c.modulo_codigo = p_modulo and c.activo and (c.rol_bel_id is null or c.rol_bel_id = v_rol);

  if v_aprobado then
    perform asegurar_xp(p_perfil, p_modulo, 'reto', true, v_eval, 'Reto práctico aprobado');
    if p_autonomo then
      perform asegurar_xp(p_perfil, p_modulo, 'autonomia', true, v_eval, 'Ejecución autónoma validada');
    end if;
    perform verificar_mision(p_perfil, p_modulo);
  end if;
  return jsonb_build_object('aprobado', v_aprobado, 'cumplidos', v_cumple, 'total', v_total,
                            'critico_fallido', coalesce(v_critico_falla, false));
end $$;

-- ───────────── Estado de cada misión ─────────────
-- aprobada/convalidada → con asistencia válida: en curso, pendiente de validación o requiere refuerzo
-- (sin importar el orden de la ruta) → siguiente en la ruta sin asistencia: «disponible» (pendiente de asistencia)
-- → resto: bloqueada.
create or replace function ruta_de(p_perfil uuid default null)
returns table (codigo text, orden int, hace text, participacion text, estado text,
               xp int, xp_max int, asistencia boolean, cuestionario boolean, reto text, autonomia boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_p uuid := coalesce(p_perfil, auth.uid()); v_rol text; v_prev_ok boolean := true; r record;
        v_reto_ok boolean; v_reto_eval boolean; v_quiz_fail boolean; v_revocada boolean;
begin
  if v_p <> auth.uid() and not (ve_seguimiento() or tiene_rol('instructor') or tiene_rol('promotor_elite')) then
    raise exception 'No autorizado';
  end if;
  select rol_bel_id into v_rol from perfiles where id = v_p;
  for r in select m.codigo, m.orden, rm.hace, rm.participacion
             from rol_modulo rm join modulos m on m.codigo = rm.modulo_codigo
            where rm.rol_bel_id = v_rol and m.activo order by m.orden loop
    codigo := r.codigo; orden := r.orden; hace := r.hace; participacion := r.participacion;
    select coalesce(sum(e.xp), 0) into xp from eventos_xp e where e.perfil_id = v_p and e.modulo_codigo = r.codigo;
    xp_max := xp_regla('asistencia', r.codigo) + xp_regla('reto', r.codigo)
            + xp_regla('cuestionario', r.codigo) + xp_regla('autonomia', r.codigo);
    asistencia := asistio(v_p, r.codigo);
    cuestionario := exists (select 1 from intentos i join cuestionarios c on c.id = i.cuestionario_id
                            where i.perfil_id = v_p and c.modulo_codigo = r.codigo and i.aprobado);
    v_quiz_fail := not cuestionario and exists (select 1 from intentos i join cuestionarios c on c.id = i.cuestionario_id
                            where i.perfil_id = v_p and c.modulo_codigo = r.codigo);
    v_reto_ok := exists (select 1 from evaluaciones_reto where perfil_id = v_p and modulo_codigo = r.codigo and aprobado);
    v_reto_eval := exists (select 1 from evaluaciones_reto where perfil_id = v_p and modulo_codigo = r.codigo);
    reto := case when v_reto_ok then 'aprobado' when v_reto_eval then 'no_aprobado' else 'pendiente' end;
    autonomia := exists (select 1 from evaluaciones_reto where perfil_id = v_p and modulo_codigo = r.codigo and aprobado and autonomo);

    select case when ma.via = 'convalidacion' then 'convalidada' else 'aprobada' end into estado
      from misiones_aprobadas ma where ma.perfil_id = v_p and ma.modulo_codigo = r.codigo
       and (ma.revocada_en is null or ma.via = 'convalidacion');
    v_revocada := exists (select 1 from misiones_aprobadas ma where ma.perfil_id = v_p and ma.modulo_codigo = r.codigo
                          and ma.revocada_en is not null);
    if estado is null then
      estado := case
        when v_revocada then 'requiere_refuerzo'
        when asistencia and ((v_reto_eval and not v_reto_ok) or v_quiz_fail) then 'requiere_refuerzo'
        when asistencia and cuestionario and not v_reto_ok then 'pendiente_validacion'
        when asistencia then 'en_curso'
        when v_prev_ok then 'disponible'
        else 'bloqueada' end;
    end if;
    v_prev_ok := estado in ('aprobada', 'convalidada');
    return next;
    estado := null;
  end loop;
end $$;

-- ───────────── Historial y efectos del cambio de estado ─────────────

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
    -- Si la sesión deja de contar (o vuelve a contar), se recalcula la asistencia de quienes asistieron
    if (old.estado in ('suspendida', 'cancelada')) <> (new.estado in ('suspendida', 'cancelada')) then
      for r in select perfil_id from asistencias where sesion_id = new.id and presente loop
        perform recalcular_asistencia(r.perfil_id, new.modulo_codigo, new.id,
          case when new.estado = 'suspendida' then 'Sesión suspendida'
               when new.estado = 'cancelada' then 'Sesión cancelada' else 'Sesión reactivada' end);
      end loop;
    end if;
  end if;
  return new;
end $$;

create trigger sesion_cambio_estado after insert or update of estado on sesiones
  for each row execute function sesion_cambio_estado();

-- Estado inicial del historial para las sesiones existentes
insert into sesion_historial (sesion_id, estado_anterior, estado_nuevo, motivo, fecha)
select s.id, null, s.estado, 'Estado al activar el historial', now()
  from sesiones s where not exists (select 1 from sesion_historial h where h.sesion_id = s.id);

-- Suspender una sesión: exige temas abordados y pendientes.
create or replace function suspender_sesion(p_sesion uuid, p_abordados text, p_pendientes text, p_observaciones text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_estado text;
begin
  if not (instructor_de(p_sesion) or es_gestor()) then raise exception 'No autorizado para suspender esta sesión'; end if;
  select estado into v_estado from sesiones where id = p_sesion;
  if v_estado is null then raise exception 'La sesión no existe'; end if;
  if v_estado not in ('programada', 'realizada') then raise exception 'Solo se puede suspender una sesión programada o realizada'; end if;
  if coalesce(trim(p_abordados), '') = '' or coalesce(trim(p_pendientes), '') = '' then
    raise exception 'Indica los temas abordados y los temas pendientes';
  end if;
  perform set_config('bel.motivo_estado', coalesce(nullif(trim(p_observaciones), ''), 'Sesión suspendida'), true);
  update sesiones set estado = 'suspendida', temas_abordados = trim(p_abordados), temas_pendientes = trim(p_pendientes),
                      observaciones_estado = nullif(trim(p_observaciones), '')
   where id = p_sesion;
  perform set_config('bel.motivo_estado', '', true);
end $$;
revoke execute on function suspender_sesion from public, anon;
grant execute on function suspender_sesion to authenticated;

-- Cambiar el estado (realizada, cancelada, programada) dejando motivo en el historial.
create or replace function cambiar_estado_sesion(p_sesion uuid, p_estado text, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (instructor_de(p_sesion) or es_gestor()) then raise exception 'No autorizado'; end if;
  if p_estado not in ('programada', 'realizada', 'cancelada') then raise exception 'Estado no válido'; end if;
  if p_estado = 'cancelada' and coalesce(trim(p_motivo), '') = '' then raise exception 'Cancelar una sesión exige un motivo'; end if;
  perform set_config('bel.motivo_estado', coalesce(trim(p_motivo), ''), true);
  update sesiones set estado = p_estado,
         observaciones_estado = case when p_estado = 'cancelada' then trim(p_motivo) else observaciones_estado end
   where id = p_sesion;
  perform set_config('bel.motivo_estado', '', true);
end $$;
revoke execute on function cambiar_estado_sesion from public, anon;
grant execute on function cambiar_estado_sesion to authenticated;

-- Reprogramar: crea una nueva sesión enlazada a la original y traslada las inscripciones.
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
  insert into sesiones (modulo_codigo, modalidad, inicio, fin, lugar, enlace, instructor_id, cupo, estado, sesion_origen_id)
  values (v_s.modulo_codigo, v_s.modalidad, p_inicio, p_fin, coalesce(nullif(trim(p_lugar), ''), v_s.lugar),
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

-- Historial con nombre de quien hizo el cambio
create or replace function historial_sesion(p_sesion uuid)
returns table (estado_anterior text, estado_nuevo text, motivo text, actor text, fecha timestamptz)
language sql stable security definer set search_path = public as $$
  select h.estado_anterior, h.estado_nuevo, h.motivo, p.nombre, h.fecha
    from sesion_historial h left join perfiles p on p.id = h.actor
   where h.sesion_id = p_sesion and (es_gestor() or instructor_de(p_sesion) or ve_seguimiento())
   order by h.fecha, h.id
$$;
revoke execute on function historial_sesion from public, anon;
grant execute on function historial_sesion to authenticated;

-- ───────────── Mis resultados en una misión ─────────────
-- Nunca expone cuál era la opción correcta: solo si la respuesta propia fue correcta y la retroalimentación.
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
     where a.perfil_id = v_p and s.modulo_codigo = p_modulo), '[]'::jsonb),
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
