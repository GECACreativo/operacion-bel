-- Operación BEL · 0012 · Reportes de uso de BEL del Grupo Élite
-- Los bomberos del Grupo Élite registran retroalimentación del sistema BEL en operación:
-- módulo, rol, acción y observación. Administración hace seguimiento y responde. Todo queda almacenado y exportable.

create or replace function es_elite() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and activo and grupo_elite) or tiene_rol('promotor_elite')
$$;

create table if not exists reportes_bel (
  id              uuid primary key default gen_random_uuid(),
  numero          bigint generated always as identity unique,
  autor_id        uuid not null default auth.uid() references perfiles(id),
  modulo_codigo   text not null references modulos(codigo),
  rol_bel_id      text not null references roles_bel(id),
  accion          text not null check (char_length(trim(accion)) between 3 and 300),
  tipo            text not null check (tipo in ('falla', 'dificultad', 'mejora', 'duda')),
  impacto         text not null default 'medio' check (impacto in ('bajo', 'medio', 'alto')),
  observacion     text not null check (char_length(trim(observacion)) >= 10),
  estacion_id     uuid references unidades(id),
  estado          text not null default 'nuevo' check (estado in ('nuevo', 'en_revision', 'escalado', 'resuelto', 'descartado')),
  respuesta       text,
  gestionado_por  uuid references perfiles(id),
  gestionado_en   timestamptz,
  creado_en       timestamptz not null default now(),
  check (modulo_codigo <> 'RI')
);
create index if not exists reportes_bel_fecha on reportes_bel (creado_en desc);
create index if not exists reportes_bel_modulo on reportes_bel (modulo_codigo, rol_bel_id);

-- Autor y estación se toman del perfil; el estado inicial siempre es «nuevo».
create or replace function reportes_bel_al_crear() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.autor_id := auth.uid();
  new.estado := 'nuevo'; new.respuesta := null; new.gestionado_por := null; new.gestionado_en := null;
  select estacion_id into new.estacion_id from perfiles where id = auth.uid();
  new.accion := trim(new.accion); new.observacion := trim(new.observacion);
  return new;
end $$;
create trigger reportes_bel_al_crear before insert on reportes_bel
  for each row execute function reportes_bel_al_crear();

alter table reportes_bel enable row level security;
-- El Grupo Élite ve todos los reportes (para no duplicar); administración y coordinación también.
create policy lectura on reportes_bel for select to authenticated using (es_elite() or ve_seguimiento());
create policy registro on reportes_bel for insert to authenticated with check (es_elite());

-- El autor puede corregir su reporte mientras siga «nuevo».
create or replace function editar_reporte_bel(p_id uuid, p_modulo text, p_rol text, p_accion text, p_tipo text, p_impacto text, p_observacion text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update reportes_bel set modulo_codigo = p_modulo, rol_bel_id = p_rol, accion = trim(p_accion), tipo = p_tipo,
                          impacto = p_impacto, observacion = trim(p_observacion)
   where id = p_id and autor_id = auth.uid() and estado = 'nuevo';
  if not found then raise exception 'Solo puedes editar tus reportes mientras están en estado «nuevo»'; end if;
end $$;
revoke execute on function editar_reporte_bel from public, anon;
grant execute on function editar_reporte_bel to authenticated;

-- Seguimiento por administración: cambia el estado y deja respuesta. Queda auditado.
create or replace function gestionar_reporte_bel(p_id uuid, p_estado text, p_respuesta text)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes reportes_bel;
begin
  if not es_gestor() then raise exception 'Solo administración gestiona los reportes'; end if;
  if p_estado not in ('nuevo', 'en_revision', 'escalado', 'resuelto', 'descartado') then raise exception 'Estado no válido'; end if;
  if p_estado in ('resuelto', 'descartado', 'escalado') and coalesce(trim(p_respuesta), '') = '' then
    raise exception 'Escribe una respuesta para el Grupo Élite';
  end if;
  select * into v_antes from reportes_bel where id = p_id;
  if not found then raise exception 'El reporte no existe'; end if;
  update reportes_bel set estado = p_estado, respuesta = nullif(trim(p_respuesta), ''), gestionado_por = auth.uid(), gestionado_en = now()
   where id = p_id;
  perform auditar('gestionar_reporte_bel', 'reportes_bel', p_id::text,
                  jsonb_build_object('estado', v_antes.estado), jsonb_build_object('estado', p_estado), p_respuesta);
end $$;
revoke execute on function gestionar_reporte_bel from public, anon;
grant execute on function gestionar_reporte_bel to authenticated;

-- Listado con nombres (para la tabla y la exportación)
create or replace function reportes_bel_lista()
returns table (id uuid, numero bigint, creado_en timestamptz, autor_id uuid, autor text, estacion text,
               modulo_codigo text, modulo text, rol_bel_id text, rol text, accion text, tipo text, impacto text,
               observacion text, estado text, respuesta text, gestionado_por text, gestionado_en timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.numero, r.creado_en, r.autor_id, a.nombre, e.nombre, r.modulo_codigo, m.nombre, r.rol_bel_id, rb.nombre,
         r.accion, r.tipo, r.impacto, r.observacion, r.estado, r.respuesta, g.nombre, r.gestionado_en
    from reportes_bel r
    join perfiles a on a.id = r.autor_id
    join modulos m on m.codigo = r.modulo_codigo
    join roles_bel rb on rb.id = r.rol_bel_id
    left join unidades e on e.id = r.estacion_id
    left join perfiles g on g.id = r.gestionado_por
   where es_elite() or ve_seguimiento()
   order by r.creado_en desc
$$;
revoke execute on function reportes_bel_lista from public, anon;
grant execute on function reportes_bel_lista to authenticated;
