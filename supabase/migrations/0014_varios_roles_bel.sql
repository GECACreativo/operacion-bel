-- Operación BEL · 0014 · Una persona puede tener varios roles en BEL al tiempo
-- Rol principal (perfiles.rol_bel_id) + roles adicionales (roles_bel_extra). La ruta es la unión de los módulos
-- de todos sus roles, y en el reto práctico se evalúan los criterios de todos sus roles en esa misión (sin repetir).

alter table perfiles add column if not exists roles_bel_extra text[] not null default '{}';
alter table preasignaciones add column if not exists roles_bel_extra text[] not null default '{}';

-- Los roles adicionales deben existir y no repetir el principal
create or replace function validar_roles_bel_extra() returns trigger
language plpgsql set search_path = public as $$
declare r text;
begin
  new.roles_bel_extra := coalesce((select array_agg(distinct x order by x) from unnest(new.roles_bel_extra) x
                                    where x is not null and x is distinct from new.rol_bel_id), '{}');
  foreach r in array new.roles_bel_extra loop
    if not exists (select 1 from roles_bel where id = r) then raise exception 'Rol BEL no existe: %', r; end if;
  end loop;
  return new;
end $$;
create trigger perfiles_roles_bel_extra before insert or update of roles_bel_extra, rol_bel_id on perfiles
  for each row execute function validar_roles_bel_extra();
create trigger preasignaciones_roles_bel_extra before insert or update of roles_bel_extra, rol_bel_id on preasignaciones
  for each row execute function validar_roles_bel_extra();

-- Todos los roles BEL de una persona
create or replace function roles_bel_de(p_perfil uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct r), '{}') from perfiles p,
         unnest(array[p.rol_bel_id] || p.roles_bel_extra) r
   where p.id = p_perfil and r is not null
$$;
revoke execute on function roles_bel_de from public, anon, authenticated;

-- Criterios del reto que aplican a una persona en una misión: los generales y los de cada uno de sus roles,
-- sin repetir criterios con el mismo texto (si dos roles comparten un criterio, se evalúa una sola vez).
create or replace function criterios_de(p_perfil uuid, p_modulo text)
returns setof criterios language sql stable security definer set search_path = public as $$
  select distinct on (lower(trim(c.descripcion))) c.*
    from criterios c
   where c.modulo_codigo = p_modulo and c.activo
     and (c.rol_bel_id is null or c.rol_bel_id = any (roles_bel_de(p_perfil)))
   order by lower(trim(c.descripcion)), c.critico desc, c.orden
$$;
revoke execute on function criterios_de from public, anon, authenticated;

-- Para la pantalla del instructor (ordenados)
create or replace function criterios_para(p_perfil uuid, p_modulo text)
returns table (id uuid, descripcion text, critico boolean, orden int, rol_bel_id text, rol text)
language sql stable security definer set search_path = public as $$
  select c.id, c.descripcion, c.critico, c.orden, c.rol_bel_id, rb.nombre
    from criterios_de(p_perfil, p_modulo) c left join roles_bel rb on rb.id = c.rol_bel_id
   where p_perfil = auth.uid() or ve_seguimiento() or tiene_rol('instructor')
   order by (c.rol_bel_id is not null), rb.orden nulls first, c.orden
$$;
revoke execute on function criterios_para from public, anon;
grant execute on function criterios_para to authenticated;

create or replace function verificar_mision(p_perfil uuid, p_modulo text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_hay_cuest boolean; v_hay_crit boolean; v_cuest boolean; v_reto boolean;
begin
  if exists (select 1 from misiones_aprobadas where perfil_id = p_perfil and modulo_codigo = p_modulo
             and (revocada_en is null or via = 'convalidacion')) then
    return true;
  end if;
  select exists (select 1 from cuestionarios where modulo_codigo = p_modulo and activo) into v_hay_cuest;
  select exists (select 1 from criterios_de(p_perfil, p_modulo)) into v_hay_crit;
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

create or replace function evaluar_reto(p_perfil uuid, p_modulo text, p_resultados jsonb,
                                        p_autonomo boolean, p_observaciones text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_eval uuid; v_aprobado boolean; v_total int; v_cumple int; v_critico_falla boolean; v_umbral numeric;
begin
  if not (tiene_rol('instructor') or es_gestor()) then raise exception 'Solo instructores pueden evaluar retos'; end if;
  if p_perfil = auth.uid() then raise exception 'No puedes evaluar tu propio reto'; end if;
  if not habilitada(p_perfil, p_modulo) then
    raise exception 'Primero registra la asistencia de la persona en una sesión de esta misión (o pide a administración habilitarla)';
  end if;

  select count(*),
         count(*) filter (where (p_resultados ->> c.id::text)::boolean is true),
         bool_or(c.critico and coalesce((p_resultados ->> c.id::text)::boolean, false) = false)
    into v_total, v_cumple, v_critico_falla from criterios_de(p_perfil, p_modulo) c;
  if v_total = 0 then raise exception 'Esta misión no tiene criterios configurados para los roles de la persona'; end if;

  v_umbral := coalesce((select (valor #>> '{}')::numeric from parametros where clave = 'umbral_reto'), 0.8);
  v_aprobado := not coalesce(v_critico_falla, false) and (v_cumple::numeric / v_total) >= v_umbral;

  insert into evaluaciones_reto (modulo_codigo, perfil_id, evaluador_id, autonomo, aprobado, observaciones)
  values (p_modulo, p_perfil, auth.uid(), p_autonomo, v_aprobado, p_observaciones) returning id into v_eval;
  insert into resultados_criterio (evaluacion_id, criterio_id, cumple)
  select v_eval, c.id, coalesce((p_resultados ->> c.id::text)::boolean, false) from criterios_de(p_perfil, p_modulo) c;

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

-- Ruta: unión de los módulos de todos los roles. «hace» indica qué hace cada rol; participación es la unión.
create or replace function ruta_de(p_perfil uuid default null)
returns table (codigo text, orden int, hace text, participacion text, estado text,
               xp int, xp_max int, asistencia boolean, cuestionario boolean, reto text, autonomia boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_p uuid := coalesce(p_perfil, auth.uid()); v_roles text[]; v_prev_ok boolean := true; r record;
        v_reto_ok boolean; v_reto_eval boolean; v_quiz_fail boolean; v_revocada boolean; v_hab boolean;
begin
  if v_p <> auth.uid() and not (ve_seguimiento() or tiene_rol('instructor') or tiene_rol('promotor_elite')) then
    raise exception 'No autorizado';
  end if;
  v_roles := roles_bel_de(v_p);
  for r in select m.codigo, m.orden,
                  string_agg(case when cardinality(v_roles) > 1 then rb.nombre || ': ' || rm.hace else rm.hace end, ' · ' order by rb.orden) as hace,
                  (select string_agg(distinct x, '' order by x) from rol_modulo rm2, regexp_split_to_table(rm2.participacion, '') x
                    where rm2.modulo_codigo = m.codigo and rm2.rol_bel_id = any (v_roles)) as participacion
             from rol_modulo rm join modulos m on m.codigo = rm.modulo_codigo join roles_bel rb on rb.id = rm.rol_bel_id
            where rm.rol_bel_id = any (v_roles) and m.activo
            group by m.codigo, m.orden order by m.orden loop
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

-- Avance por compañía con la ruta combinada de cada persona
create or replace function avance_companias()
returns table (compania_id uuid, compania text, personas int, avance numeric)
language sql stable security definer set search_path = public as $$
  with por_persona as (
    select p.id, p.compania_id,
           (select count(distinct rm.modulo_codigo) from rol_modulo rm where rm.rol_bel_id = any (roles_bel_de(p.id))) as total,
           (select count(distinct ma.modulo_codigo) from misiones_aprobadas ma join rol_modulo rm
              on rm.modulo_codigo = ma.modulo_codigo and rm.rol_bel_id = any (roles_bel_de(p.id))
             where ma.perfil_id = p.id and (ma.revocada_en is null or ma.via = 'convalidacion')) as ok
      from perfiles p where p.activo and p.rol_bel_id is not null
  )
  select u.id, u.nombre, count(pp.id)::int,
         coalesce(round(avg(case when pp.total > 0 then pp.ok::numeric / pp.total end), 3), 0)
    from unidades u left join por_persona pp on pp.compania_id = u.id
   where u.tipo = 'compania' and u.activo
   group by u.id, u.nombre order by u.nombre
$$;

-- Tablero: el rol muestra el principal y los adicionales
create or replace function tablero()
returns table (perfil_id uuid, nombre text, correo text, rol text, familia text, estacion text, compania text,
               grupo_elite boolean, codigo text, estado text, xp int, asistencia boolean, cuestionario boolean, reto text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not ve_seguimiento() then raise exception 'No autorizado'; end if;
  return query
  select p.id, p.nombre, p.correo,
         rb.nombre || coalesce(' + ' || (select string_agg(x.nombre, ' + ' order by x.orden) from roles_bel x where x.id = any (p.roles_bel_extra)), ''),
         rb.familia, e.nombre, c.nombre, p.grupo_elite,
         r.codigo, r.estado, r.xp, r.asistencia, r.cuestionario, r.reto
    from perfiles p
    join roles_bel rb on rb.id = p.rol_bel_id
    left join unidades e on e.id = p.estacion_id
    left join unidades c on c.id = p.compania_id
    cross join lateral ruta_de(p.id) r
   where p.activo;
end $$;

-- Al crear la cuenta se copian también los roles adicionales preasignados
create or replace function crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare p preasignaciones;
begin
  select * into p from preasignaciones where correo = lower(new.email);
  insert into perfiles (id, nombre, correo, rol_bel_id, roles_bel_extra, estacion_id, compania_id, grupo_elite)
  values (new.id,
          coalesce(p.nombre, new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
          lower(new.email),
          coalesce(p.rol_bel_id, nullif(new.raw_user_meta_data ->> 'rol_bel_id', '')),
          coalesce(p.roles_bel_extra, '{}'),
          p.estacion_id, p.compania_id, coalesce(p.grupo_elite, false))
  on conflict (id) do nothing;
  insert into perfil_roles (perfil_id, rol)
  select new.id, unnest(coalesce(p.roles, '{participante}'::rol_plataforma[]))
  on conflict do nothing;
  return new;
end $$;
revoke execute on function crear_perfil from public, anon, authenticated;

-- Administración: roles adicionales por correo (preinscripción y cuenta), con auditoría
create or replace function asignar_roles_bel_extra(p_correo text, p_roles text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_correo text := lower(trim(p_correo)); v_antes text[];
begin
  if not es_gestor() then raise exception 'No autorizado'; end if;
  select roles_bel_extra into v_antes from perfiles where correo = v_correo;
  update preasignaciones set roles_bel_extra = coalesce(p_roles, '{}') where correo = v_correo;
  update perfiles set roles_bel_extra = coalesce(p_roles, '{}') where correo = v_correo;
  if v_antes is distinct from coalesce(p_roles, '{}') then
    perform auditar('roles_bel_extra', 'perfiles', v_correo, to_jsonb(v_antes), to_jsonb(p_roles), null);
  end if;
end $$;
revoke execute on function asignar_roles_bel_extra from public, anon;
grant execute on function asignar_roles_bel_extra to authenticated;

create or replace function roles_bel_extra_admin()
returns table (correo text, roles_bel_extra text[])
language sql stable security definer set search_path = public as $$
  select coalesce(p.correo, pa.correo), coalesce(p.roles_bel_extra, pa.roles_bel_extra)
    from preasignaciones pa full join perfiles p on p.correo = pa.correo
   where es_gestor()
$$;
revoke execute on function roles_bel_extra_admin from public, anon;
grant execute on function roles_bel_extra_admin to authenticated;
