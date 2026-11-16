-- 0023 · Misiones fuera del objetivo de una persona (se ocultan de su ruta sin borrar nada).
-- Administración puede excluir o volver a incluir misiones por persona. Solo agrega datos: ningún avance se borra.

create table if not exists misiones_excluidas (
  perfil_id          uuid not null references perfiles(id),
  modulo_codigo      text not null references modulos(codigo),
  motivo             text not null,
  excluida_por       uuid references perfiles(id),
  fecha              timestamptz not null default now(),
  reincluida_en      timestamptz,
  motivo_reinclusion text,
  primary key (perfil_id, modulo_codigo)
);
alter table misiones_excluidas enable row level security;
create policy lectura on misiones_excluidas for select to authenticated using (perfil_id = auth.uid() or es_gestor() or ve_seguimiento());

create or replace function excluida(p_perfil uuid, p_modulo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from misiones_excluidas where perfil_id = p_perfil and modulo_codigo = p_modulo and reincluida_en is null)
$$;

create or replace function excluir_misiones(p_perfiles uuid[], p_modulos text[], p_motivo text)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int := 0; p uuid; m text;
begin
  if not es_gestor() then raise exception 'Solo administración puede cambiar las misiones de la ruta'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Indica el motivo'; end if;
  foreach p in array p_perfiles loop
    foreach m in array p_modulos loop
      insert into misiones_excluidas (perfil_id, modulo_codigo, motivo, excluida_por)
      values (p, m, trim(p_motivo), auth.uid())
      on conflict (perfil_id, modulo_codigo) do update
        set motivo = excluded.motivo, excluida_por = excluded.excluida_por, fecha = now(), reincluida_en = null, motivo_reinclusion = null
        where misiones_excluidas.reincluida_en is not null;
      v_n := v_n + 1;
      perform auditar('excluir_mision', 'misiones_excluidas', p::text || ':' || m, null, null, trim(p_motivo));
    end loop;
  end loop;
  return v_n;
end $$;

create or replace function incluir_misiones(p_perfiles uuid[], p_modulos text[], p_motivo text)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not es_gestor() then raise exception 'Solo administración puede cambiar las misiones de la ruta'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Indica el motivo'; end if;
  update misiones_excluidas set reincluida_en = now(), motivo_reinclusion = trim(p_motivo)
   where perfil_id = any (p_perfiles) and modulo_codigo = any (p_modulos) and reincluida_en is null;
  get diagnostics v_n = row_count;
  perform auditar('incluir_misiones', 'misiones_excluidas', array_to_string(p_modulos, ','), null, null, trim(p_motivo));
  return v_n;
end $$;

/** Misiones excluidas vigentes (para la administración). */
create or replace function misiones_excluidas_admin()
returns table (perfil_id uuid, modulos text[]) language sql stable security definer set search_path = public as $$
  select x.perfil_id, array_agg(x.modulo_codigo order by x.modulo_codigo)
    from misiones_excluidas x where x.reincluida_en is null and es_gestor()
   group by x.perfil_id
$$;

revoke execute on function excluir_misiones, incluir_misiones, misiones_excluidas_admin from public, anon;
grant execute on function excluir_misiones, incluir_misiones, misiones_excluidas_admin, excluida to authenticated;

-- Ruta: misma lógica de siempre, sin las misiones excluidas de la persona
create or replace function ruta_de(p_perfil uuid default null)
returns table(codigo text, orden integer, hace text, participacion text, estado text, xp integer, xp_max integer,
              asistencia boolean, cuestionario boolean, reto text, autonomia boolean)
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
            where rm.rol_bel_id = any (v_roles) and m.activo and not excluida(v_p, m.codigo)
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

-- Avance por compañía sin contar las misiones excluidas
create or replace function avance_companias()
returns table(compania_id uuid, compania text, personas integer, avance numeric)
language sql stable security definer set search_path = public as $$
  with por_persona as (
    select p.id, p.compania_id,
           (select count(distinct rm.modulo_codigo) from rol_modulo rm
             where rm.rol_bel_id = any (roles_bel_de(p.id)) and not excluida(p.id, rm.modulo_codigo)) as total,
           (select count(distinct ma.modulo_codigo) from misiones_aprobadas ma join rol_modulo rm
              on rm.modulo_codigo = ma.modulo_codigo and rm.rol_bel_id = any (roles_bel_de(p.id))
             where ma.perfil_id = p.id and (ma.revocada_en is null or ma.via = 'convalidacion')
               and not excluida(p.id, ma.modulo_codigo)) as ok
      from perfiles p where p.activo and p.rol_bel_id is not null
  )
  select u.id, u.nombre, count(pp.id)::int,
         coalesce(round(avg(case when pp.total > 0 then pp.ok::numeric / pp.total end), 3), 0)
    from unidades u left join por_persona pp on pp.compania_id = u.id
   where u.tipo = 'compania' and u.activo
   group by u.id, u.nombre order by u.nombre
$$;

-- Usuarios activos hoy: M10 y M11 quedan fuera de su objetivo (solo donde estaban en su ruta)
insert into misiones_excluidas (perfil_id, modulo_codigo, motivo)
select distinct p.id, rm.modulo_codigo, 'Fuera del objetivo del grupo actual (noviembre 2026)'
  from perfiles p join rol_modulo rm on rm.rol_bel_id = any (roles_bel_de(p.id))
 where p.activo and rm.modulo_codigo in ('M10', 'M11')
on conflict (perfil_id, modulo_codigo) do nothing;
