-- Operación BEL · 0004 · Preasignación de usuarios y avance colectivo

-- Un administrador registra de antemano el correo, el rol BEL, la unidad y los roles de plataforma.
-- Cuando la persona recibe su cuenta, el perfil se completa solo con estos datos.
create table preasignaciones (
  correo        text primary key check (correo = lower(correo)),
  nombre        text,
  rol_bel_id    text references roles_bel(id),
  estacion_id   uuid references unidades(id),
  compania_id   uuid references unidades(id),
  grupo_elite   boolean not null default false,
  roles         rol_plataforma[] not null default '{participante}',
  creado_por    uuid references perfiles(id),
  creado_en     timestamptz not null default now()
);
alter table preasignaciones enable row level security;
revoke all on preasignaciones from anon;
create policy gestion on preasignaciones for all to authenticated using (es_gestor()) with check (es_gestor());

create or replace function crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare p preasignaciones;
begin
  select * into p from preasignaciones where correo = lower(new.email);
  insert into perfiles (id, nombre, correo, rol_bel_id, estacion_id, compania_id, grupo_elite)
  values (new.id,
          coalesce(p.nombre, new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
          lower(new.email),
          coalesce(p.rol_bel_id, nullif(new.raw_user_meta_data ->> 'rol_bel_id', '')),
          p.estacion_id, p.compania_id, coalesce(p.grupo_elite, false))
  on conflict (id) do nothing;
  insert into perfil_roles (perfil_id, rol)
  select new.id, unnest(coalesce(p.roles, '{participante}'::rol_plataforma[]))
  on conflict do nothing;
  return new;
end $$;
revoke execute on function crear_perfil from public, anon, authenticated;

-- Avance colectivo por compañía, normalizado por la extensión de la ruta de cada persona.
-- Devuelve solo agregados (sin datos individuales).
create or replace function avance_companias()
returns table (compania_id uuid, compania text, personas int, avance numeric)
language sql stable security definer set search_path = public as $$
  with por_persona as (
    select p.id, p.compania_id,
           (select count(*) from rol_modulo rm where rm.rol_bel_id = p.rol_bel_id) as total,
           (select count(*) from misiones_aprobadas ma join rol_modulo rm
              on rm.modulo_codigo = ma.modulo_codigo and rm.rol_bel_id = p.rol_bel_id
             where ma.perfil_id = p.id and (ma.revocada_en is null or ma.via = 'convalidacion')) as ok
      from perfiles p where p.activo and p.rol_bel_id is not null
  )
  select u.id, u.nombre, count(pp.id)::int,
         coalesce(round(avg(case when pp.total > 0 then pp.ok::numeric / pp.total end), 3), 0)
    from unidades u left join por_persona pp on pp.compania_id = u.id
   where u.tipo = 'compania' and u.activo
   group by u.id, u.nombre order by u.nombre
$$;
revoke execute on function avance_companias from public, anon;
grant execute on function avance_companias to authenticated;

-- Primer administrador de la plataforma
insert into preasignaciones (correo, nombre, rol_bel_id, roles)
values ('camilo.echeverry@gecacreativo.com', 'Camilo Echeverry', 'bombero',
        '{participante,instructor,admin_formacion,admin_tecnico,coordinacion}')
on conflict (correo) do nothing;
