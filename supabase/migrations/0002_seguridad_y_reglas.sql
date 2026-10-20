-- Operación BEL · 0002 · Seguridad (RLS) y reglas de negocio en el servidor
-- Principios: mínimo privilegio; toda escritura sensible pasa por funciones que validan permisos,
-- registran auditoría y otorgan XP de forma idempotente.

-- ───────────── Funciones de apoyo ─────────────

create or replace function tiene_rol(r rol_plataforma) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfil_roles where perfil_id = auth.uid() and rol = r)
$$;

create or replace function es_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select tiene_rol('admin_formacion') or tiene_rol('admin_tecnico')
$$;

create or replace function ve_seguimiento() returns boolean
language sql stable security definer set search_path = public as $$
  select es_gestor() or tiene_rol('coordinacion')
$$;

create or replace function instructor_de(p_sesion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sesiones where id = p_sesion and instructor_id = auth.uid())
$$;

create or replace function auditar(p_accion text, p_tabla text, p_registro text, p_antes jsonb, p_despues jsonb, p_motivo text)
returns void language sql security definer set search_path = public as $$
  insert into auditoria (actor, accion, tabla, registro, antes, despues, motivo)
  values (auth.uid(), p_accion, p_tabla, p_registro, p_antes, p_despues, p_motivo)
$$;

create or replace function xp_regla(p_tipo tipo_evidencia, p_modulo text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select xp from reglas_xp where tipo = p_tipo and modulo_codigo = p_modulo and activo),
    (select xp from reglas_xp where tipo = p_tipo and modulo_codigo is null and activo),
    0)
$$;

-- Lleva el saldo de XP de una evidencia al valor que corresponde (0 o el de la regla).
-- Repetir la llamada no cambia nada (idempotente). Nunca borra: crea eventos compensatorios.
create or replace function asegurar_xp(p_perfil uuid, p_modulo text, p_tipo tipo_evidencia, p_merece boolean, p_fuente uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_neto int; v_obj int; v_n int;
begin
  perform pg_advisory_xact_lock(hashtext(p_perfil::text || p_modulo || p_tipo::text));
  select coalesce(sum(xp), 0), count(*) into v_neto, v_n
    from eventos_xp where perfil_id = p_perfil and modulo_codigo = p_modulo and tipo = p_tipo;
  v_obj := case when p_merece then xp_regla(p_tipo, p_modulo) else 0 end;
  if v_neto <> v_obj then
    insert into eventos_xp (perfil_id, modulo_codigo, tipo, xp, clave_idempotencia, fuente_id, motivo, creado_por)
    values (p_perfil, p_modulo, p_tipo, v_obj - v_neto,
            p_tipo || ':' || p_modulo || ':' || p_perfil || ':' || (v_n + 1), p_fuente, p_motivo, auth.uid());
  end if;
end $$;

-- Una misión se aprueba cuando: asistencia validada + cuestionario aprobado (si existe)
-- + reto aprobado (si hay criterios). La asistencia sola nunca la aprueba.
create or replace function verificar_mision(p_perfil uuid, p_modulo text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_rol text; v_hay_cuest boolean; v_hay_crit boolean;
  v_asis boolean; v_cuest boolean; v_reto boolean;
begin
  if exists (select 1 from misiones_aprobadas where perfil_id = p_perfil and modulo_codigo = p_modulo
             and (revocada_en is null or via = 'convalidacion')) then
    return true;
  end if;
  select rol_bel_id into v_rol from perfiles where id = p_perfil;
  select exists (select 1 from cuestionarios where modulo_codigo = p_modulo and activo) into v_hay_cuest;
  select exists (select 1 from criterios where modulo_codigo = p_modulo and activo and (rol_bel_id is null or rol_bel_id = v_rol)) into v_hay_crit;
  if not v_hay_cuest and not v_hay_crit then
    return false; -- misión sin evaluación configurada: no se aprueba solo con asistencia
  end if;
  select exists (select 1 from asistencias a join sesiones s on s.id = a.sesion_id
                 where a.perfil_id = p_perfil and s.modulo_codigo = p_modulo and a.presente) into v_asis;
  select not v_hay_cuest or exists (select 1 from intentos i join cuestionarios c on c.id = i.cuestionario_id
                 where i.perfil_id = p_perfil and c.modulo_codigo = p_modulo and i.aprobado) into v_cuest;
  select not v_hay_crit or exists (select 1 from evaluaciones_reto
                 where perfil_id = p_perfil and modulo_codigo = p_modulo and aprobado) into v_reto;
  if v_asis and v_cuest and v_reto then
    insert into misiones_aprobadas (perfil_id, modulo_codigo) values (p_perfil, p_modulo)
    on conflict (perfil_id, modulo_codigo) do update set revocada_en = null, motivo_revocacion = null, fecha = now();
    return true;
  end if;
  return false;
end $$;

-- ───────────── Operaciones de negocio (llamadas desde la plataforma) ─────────────

-- Registrar o corregir asistencia. Solo el instructor de la sesión o un administrador.
create or replace function registrar_asistencia(p_sesion uuid, p_perfil uuid, p_presente boolean,
                                                p_mecanismo text default 'instructor', p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_mod text; v_prev asistencias; v_id uuid;
begin
  if not (instructor_de(p_sesion) or es_gestor()) then
    raise exception 'No autorizado para registrar asistencia en esta sesión';
  end if;
  select modulo_codigo into v_mod from sesiones where id = p_sesion;
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
  if found and v_prev.id is not null and v_prev.presente <> p_presente then
    perform auditar('corregir_asistencia', 'asistencias', v_id::text, to_jsonb(v_prev),
                    jsonb_build_object('presente', p_presente), p_motivo);
  end if;
  -- XP de asistencia: una sola vez por persona y misión, aunque asista a varias sesiones
  perform asegurar_xp(p_perfil, v_mod, 'asistencia',
    exists (select 1 from asistencias a join sesiones s on s.id = a.sesion_id
            where a.perfil_id = p_perfil and s.modulo_codigo = v_mod and a.presente),
    v_id, 'Asistencia validada');
  -- Decisión del proyecto: si la corrección deja la misión sin asistencia, vuelve a «requiere refuerzo»
  if not p_presente and not exists (select 1 from asistencias a join sesiones s on s.id = a.sesion_id
                                    where a.perfil_id = p_perfil and s.modulo_codigo = v_mod and a.presente) then
    update misiones_aprobadas set revocada_en = now(), motivo_revocacion = p_motivo
     where perfil_id = p_perfil and modulo_codigo = v_mod and via = 'evidencias' and revocada_en is null;
    if found then
      perform auditar('revocar_mision', 'misiones_aprobadas', p_perfil::text || ':' || v_mod, null, null, p_motivo);
    end if;
  end if;
  perform verificar_mision(p_perfil, v_mod);
end $$;

-- Enviar un cuestionario. Califica en el servidor; las respuestas correctas nunca salen antes.
-- p_respuestas: {"<pregunta_id>": "<opcion_id>", ...}
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
  select count(*) into v_total from preguntas where cuestionario_id = p_cuestionario;
  if v_total = 0 then raise exception 'El cuestionario no tiene preguntas'; end if;

  insert into intentos (cuestionario_id, version, perfil_id, puntaje, aprobado)
  values (p_cuestionario, v_c.version, auth.uid(), 0, false) returning id into v_intento;

  for r in select id, retroalimentacion from preguntas where cuestionario_id = p_cuestionario order by orden loop
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

-- Evaluar un reto práctico. Un criterio crítico fallido o sin evaluar impide aprobar.
-- p_resultados: {"<criterio_id>": true|false, ...}
create or replace function evaluar_reto(p_perfil uuid, p_modulo text, p_resultados jsonb,
                                        p_autonomo boolean, p_observaciones text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_rol text; v_eval uuid; v_aprobado boolean; v_total int; v_cumple int; v_critico_falla boolean; v_umbral numeric;
begin
  if not (tiene_rol('instructor') or es_gestor()) then raise exception 'Solo instructores pueden evaluar retos'; end if;
  if p_perfil = auth.uid() then raise exception 'No puedes evaluar tu propio reto'; end if;
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

-- Ajuste manual de XP: requiere permiso y motivo; queda como evento compensatorio auditado.
create or replace function ajustar_xp(p_perfil uuid, p_modulo text, p_xp int, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_gestor() then raise exception 'No autorizado'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'El ajuste exige un motivo'; end if;
  insert into eventos_xp (perfil_id, modulo_codigo, tipo, xp, clave_idempotencia, motivo, creado_por)
  values (p_perfil, p_modulo, 'ajuste', p_xp, 'ajuste:' || gen_random_uuid(), p_motivo, auth.uid());
  perform auditar('ajustar_xp', 'eventos_xp', p_perfil::text, null,
                  jsonb_build_object('modulo', p_modulo, 'xp', p_xp), p_motivo);
end $$;

-- Convalidar (exonerar) una misión con autorización documentada.
create or replace function convalidar_mision(p_perfil uuid, p_modulo text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_gestor() then raise exception 'No autorizado'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'La convalidación exige un motivo'; end if;
  insert into misiones_aprobadas (perfil_id, modulo_codigo, via, motivo, autorizado_por)
  values (p_perfil, p_modulo, 'convalidacion', p_motivo, auth.uid()) on conflict do nothing;
  perform auditar('convalidar_mision', 'misiones_aprobadas', p_perfil::text || ':' || p_modulo, null, null, p_motivo);
end $$;

-- Cambiar el rol BEL de una persona (su ruta se recalcula). Queda en historial y auditoría.
create or replace function cambiar_rol_bel(p_perfil uuid, p_rol text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ant text;
begin
  if not es_gestor() then raise exception 'No autorizado'; end if;
  select rol_bel_id into v_ant from perfiles where id = p_perfil;
  update perfiles set rol_bel_id = p_rol where id = p_perfil;
  insert into historial_rol_bel (perfil_id, rol_anterior, rol_nuevo, cambiado_por, motivo)
  values (p_perfil, v_ant, p_rol, auth.uid(), p_motivo);
  perform auditar('cambiar_rol_bel', 'perfiles', p_perfil::text,
                  jsonb_build_object('rol', v_ant), jsonb_build_object('rol', p_rol), p_motivo);
end $$;

-- Ruta y estado de cada misión para una persona. El estado se calcula en el servidor.
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
    asistencia := exists (select 1 from asistencias a join sesiones s on s.id = a.sesion_id
                          where a.perfil_id = v_p and s.modulo_codigo = r.codigo and a.presente);
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
        when not v_prev_ok then 'bloqueada'
        when v_revocada or (v_reto_eval and not v_reto_ok) or v_quiz_fail then 'requiere_refuerzo'
        when asistencia and cuestionario and not v_reto_eval then 'pendiente_validacion'
        when asistencia or cuestionario or v_reto_eval then 'en_curso'
        else 'disponible' end;
    end if;
    v_prev_ok := estado in ('aprobada', 'convalidada');
    return next;
    estado := null;
  end loop;
end $$;

-- Crear el perfil automáticamente cuando se crea un usuario de autenticación.
create or replace function crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre, correo, rol_bel_id)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)), new.email,
          nullif(new.raw_user_meta_data ->> 'rol_bel_id', ''))
  on conflict (id) do nothing;
  insert into perfil_roles (perfil_id, rol) values (new.id, 'participante') on conflict do nothing;
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users for each row execute function crear_perfil();

-- ───────────── Permisos de ejecución ─────────────

revoke execute on all functions in schema public from public, anon;
grant execute on function tiene_rol, es_gestor, ve_seguimiento, instructor_de,
  registrar_asistencia, enviar_cuestionario, evaluar_reto, ajustar_xp, convalidar_mision, cambiar_rol_bel, ruta_de
  to authenticated;
-- asegurar_xp, verificar_mision, auditar y xp_regla solo se usan desde otras funciones del servidor.
revoke execute on function asegurar_xp, verificar_mision, auditar, xp_regla, crear_perfil from authenticated;

-- ───────────── Row Level Security ─────────────

do $$ declare t text; begin
  foreach t in array array['unidades','roles_bel','modulos','rol_modulo','reglas_xp','parametros','perfiles','perfil_roles',
    'historial_rol_bel','recursos','sesiones','inscripciones','asistencias','cuestionarios','preguntas','opciones',
    'opciones_correctas','intentos','respuestas','criterios','evaluaciones_reto','resultados_criterio','eventos_xp',
    'misiones_aprobadas','acompanamientos','auditoria'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon', t);
  end loop;
end $$;

-- Catálogos: lectura para usuarios autenticados; escritura solo administración de formación.
do $$ declare t text; begin
  foreach t in array array['unidades','roles_bel','modulos','rol_modulo','reglas_xp','parametros','recursos',
                           'cuestionarios','preguntas','opciones','criterios','sesiones'] loop
    execute format('create policy lectura on %I for select to authenticated using (true)', t);
    execute format('create policy gestion on %I for all to authenticated using (es_gestor()) with check (es_gestor())', t);
  end loop;
end $$;
-- Los instructores pueden crear y editar sus propias sesiones
create policy instructor_sesiones on sesiones for insert to authenticated
  with check (tiene_rol('instructor') and instructor_id = auth.uid());
create policy instructor_sesiones_upd on sesiones for update to authenticated
  using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());

-- Respuestas correctas: solo administración (nunca participantes)
create policy gestion on opciones_correctas for all to authenticated using (es_gestor()) with check (es_gestor());

-- Perfiles
create policy propio on perfiles for select to authenticated using (id = auth.uid());
create policy equipo on perfiles for select to authenticated
  using (ve_seguimiento() or tiene_rol('instructor') or tiene_rol('promotor_elite'));
create policy gestion on perfiles for all to authenticated using (es_gestor()) with check (es_gestor());

create policy propio on perfil_roles for select to authenticated using (perfil_id = auth.uid() or es_gestor());
create policy gestion on perfil_roles for all to authenticated using (es_gestor()) with check (es_gestor());

create policy gestion on historial_rol_bel for select to authenticated using (es_gestor());

-- Inscripciones
create policy lectura on inscripciones for select to authenticated
  using (perfil_id = auth.uid() or instructor_de(sesion_id) or ve_seguimiento());
create policy gestion on inscripciones for all to authenticated
  using (es_gestor() or instructor_de(sesion_id)) with check (es_gestor() or instructor_de(sesion_id));

-- Evidencias: lectura propia, del instructor y de seguimiento. Escritura solo por funciones.
create policy lectura on asistencias for select to authenticated
  using (perfil_id = auth.uid() or instructor_de(sesion_id) or ve_seguimiento());
create policy lectura on intentos for select to authenticated using (perfil_id = auth.uid() or ve_seguimiento());
create policy lectura on respuestas for select to authenticated
  using (exists (select 1 from intentos i where i.id = intento_id and (i.perfil_id = auth.uid() or ve_seguimiento())));
create policy lectura on evaluaciones_reto for select to authenticated
  using (perfil_id = auth.uid() or evaluador_id = auth.uid() or ve_seguimiento());
create policy lectura on resultados_criterio for select to authenticated
  using (exists (select 1 from evaluaciones_reto e where e.id = evaluacion_id
                 and (e.perfil_id = auth.uid() or e.evaluador_id = auth.uid() or ve_seguimiento())));
create policy lectura on eventos_xp for select to authenticated using (perfil_id = auth.uid() or ve_seguimiento());
create policy lectura on misiones_aprobadas for select to authenticated
  using (perfil_id = auth.uid() or ve_seguimiento() or tiene_rol('instructor') or tiene_rol('promotor_elite'));

-- Grupo Élite: cada promotor registra y ve lo suyo; coordinación ve todo.
create policy lectura on acompanamientos for select to authenticated using (promotor_id = auth.uid() or ve_seguimiento());
create policy registro on acompanamientos for insert to authenticated
  with check (promotor_id = auth.uid() and tiene_rol('promotor_elite'));
create policy edicion on acompanamientos for update to authenticated
  using (promotor_id = auth.uid()) with check (promotor_id = auth.uid());

-- Auditoría: solo administración la consulta
create policy lectura on auditoria for select to authenticated using (es_gestor());
