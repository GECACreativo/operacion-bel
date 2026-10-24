-- Operación BEL · 0015 · Contraseñas temporales asignadas por administración
-- Plan B cuando el correo no llega: administración asigna una contraseña temporal (única por persona),
-- se la entrega por otro medio y la persona debe cambiarla en su primer ingreso.

alter table perfiles add column if not exists debe_cambiar_clave boolean not null default false;
alter table perfiles add column if not exists clave_temporal_en timestamptz;

-- La persona confirma que ya cambió su contraseña temporal
create or replace function clave_cambiada() returns void
language sql security definer set search_path = public as $$
  update perfiles set debe_cambiar_clave = false where id = auth.uid()
$$;
revoke execute on function clave_cambiada from public, anon;
grant execute on function clave_cambiada to authenticated;

-- Para la lista de Usuarios: quién tiene contraseña temporal pendiente de cambio
create or replace function claves_estado_admin()
returns table (correo text, debe_cambiar_clave boolean, clave_temporal_en timestamptz)
language sql stable security definer set search_path = public as $$
  select p.correo, p.debe_cambiar_clave, p.clave_temporal_en from perfiles p where es_gestor()
$$;
revoke execute on function claves_estado_admin from public, anon;
grant execute on function claves_estado_admin to authenticated;
