-- Operación BEL · 0010 · Habilitación manual de actividades por administración
-- Permite habilitar el cuestionario y el reto de una misión a una persona sin asistencia válida
-- (p. ej. su sesión fue suspendida). Exige motivo y queda auditada. No otorga XP de asistencia.

create table if not exists habilitaciones (
  perfil_id        uuid not null references perfiles(id) on delete cascade,
  modulo_codigo    text not null references modulos(codigo),
  motivo           text not null,
  autorizado_por   uuid references perfiles(id),
  fecha            timestamptz not null default now(),
  revocada_en      timestamptz,
  motivo_revocacion text,
  primary key (perfil_id, modulo_codigo)
);
alter table habilitaciones enable row level security;
create policy lectura on habilitaciones for select to authenticated
  using (perfil_id = auth.uid() or ve_seguimiento() or tiene_rol('instructor'));

-- ¿Puede hacer las actividades? Asistencia válida o habilitación manual vigente.
create or replace function habilitada(p_perfil uuid, p_modulo text) returns boolean
language sql stable security definer set search_path = public as $$
  select asistio(p_perfil, p_modulo)
      or exists (select 1 from habilitaciones h where h.perfil_id = p_perfil and h.modulo_codigo = p_modulo and h.revocada_en is null)
$$;
revoke execute on function habilitada from public, anon, authenticated;

create or replace function recalcular_asistencia(p_perfil uuid, p_modulo text, p_fuente uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform asegurar_xp(p_perfil, p_modulo, 'asistencia', asistio(p_perfil, p_modulo), p_fuente,
                      coalesce(p_motivo, 'Asistencia validada'));
  if not habilitada(p_perfil, p_modulo) then
    update misiones_aprobadas set revocada_en = now(), motivo_revocacion = p_motivo
     where perfil_id = p_perfil and modulo_codigo = p_modulo and via = 'evidencias' and revocada_en is null;
    if found then
      perform auditar('revocar_mision', 'misiones_aprobadas', p_perfil::text || ':' || p_modulo, null, null, p_motivo);
    end if;
  end if;
  perform verificar_mision(p_perfil, p_modulo);
end $$;
revoke execute on function recalcular_asistencia from public, anon, authenticated;

create or replace function habilitar_actividades(p_perfil uuid, p_modulo text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_gestor() then raise exception 'Solo administración puede habilitar actividades manualmente'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'La habilitación exige un motivo'; end if;
  insert into habilitaciones (perfil_id, modulo_codigo, motivo, autorizado_por)
  values (p_perfil, p_modulo, trim(p_motivo), auth.uid())
  on conflict (perfil_id, modulo_codigo) do update
    set motivo = excluded.motivo, autorizado_por = excluded.autorizado_por, fecha = now(),
        revocada_en = null, motivo_revocacion = null;
  perform auditar('habilitar_actividades', 'habilitaciones', p_perfil::text || ':' || p_modulo, null, null, trim(p_motivo));
  perform verificar_mision(p_perfil, p_modulo);
end $$;
revoke execute on function habilitar_actividades from public, anon;
grant execute on function habilitar_actividades to authenticated;

create or replace function quitar_habilitacion(p_perfil uuid, p_modulo text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_gestor() then raise exception 'No autorizado'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Quitar la habilitación exige un motivo'; end if;
  update habilitaciones set revocada_en = now(), motivo_revocacion = trim(p_motivo)
   where perfil_id = p_perfil and modulo_codigo = p_modulo and revocada_en is null;
  perform auditar('quitar_habilitacion', 'habilitaciones', p_perfil::text || ':' || p_modulo, null, null, trim(p_motivo));
  perform recalcular_asistencia(p_perfil, p_modulo, null, trim(p_motivo));
end $$;
revoke execute on function quitar_habilitacion from public, anon;
grant execute on function quitar_habilitacion to authenticated;

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
  if habilitada(p_perfil, p_modulo) and v_cuest and v_reto then
    insert into misiones_aprobadas (perfil_id, modulo_codigo) values (p_perfil, p_modulo)
    on conflict (perfil_id, modulo_codigo) do update set revocada_en = null, motivo_revocacion = null, fecha = now();
    return true;
  end if;
  return false;
end $$;

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

create or replace function evaluar_reto(p_perfil uuid, p_modulo text, p_resultados jsonb,
                                        p_autonomo boolean, p_observaciones text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_rol text; v_eval uuid; v_aprobado boolean; v_total int; v_cumple int; v_critico_falla boolean; v_umbral numeric;
begin
  if not (tiene_rol('instructor') or es_gestor()) then raise exception 'Solo instructores pueden evaluar retos'; end if;
  if p_perfil = auth.uid() then raise exception 'No puedes evaluar tu propio reto'; end if;
  if not habilitada(p_perfil, p_modulo) then
    raise exception 'Primero registra la asistencia de la persona en una sesión de esta misión (o pide a administración habilitarla)';
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

-- El estado de la misión considera la habilitación manual igual que la asistencia.
create or replace function ruta_de(p_perfil uuid default null)
returns table (codigo text, orden int, hace text, participacion text, estado text,
               xp int, xp_max int, asistencia boolean, cuestionario boolean, reto text, autonomia boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_p uuid := coalesce(p_perfil, auth.uid()); v_rol text; v_prev_ok boolean := true; r record;
        v_reto_ok boolean; v_reto_eval boolean; v_quiz_fail boolean; v_revocada boolean; v_hab boolean;
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
    v_hab := habilitada(v_p, r.codigo);
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
        when v_revocada and not v_hab then 'requiere_refuerzo'
        when v_hab and (v_revocada or (v_reto_eval and not v_reto_ok) or v_quiz_fail) then 'requiere_refuerzo'
        when v_hab and cuestionario and not v_reto_ok then 'pendiente_validacion'
        when v_hab then 'en_curso'
        when v_prev_ok then 'disponible'
        else 'bloqueada' end;
    end if;
    v_prev_ok := estado in ('aprobada', 'convalidada');
    return next;
    estado := null;
  end loop;
end $$;
