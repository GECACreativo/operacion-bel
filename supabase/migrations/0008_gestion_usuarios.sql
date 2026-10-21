-- Operación BEL · 0008 · Gestión de usuarios desde la plataforma

alter table preasignaciones add column if not exists invitado_en timestamptz;

-- Lista para administración: preinscripciones + cuentas, con estado de acceso.
create or replace function usuarios_admin()
returns table (correo text, nombre text, rol_bel_id text, estacion_id uuid, compania_id uuid, grupo_elite boolean,
               roles rol_plataforma[], perfil_id uuid, activo boolean, invitado_en timestamptz, ultimo_ingreso timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not es_gestor() then raise exception 'No autorizado'; end if;
  return query
  select coalesce(p.correo, pa.correo), coalesce(p.nombre, pa.nombre), coalesce(p.rol_bel_id, pa.rol_bel_id),
         coalesce(p.estacion_id, pa.estacion_id), coalesce(p.compania_id, pa.compania_id), coalesce(p.grupo_elite, pa.grupo_elite),
         coalesce((select array_agg(r.rol order by r.rol) from perfil_roles r where r.perfil_id = p.id), pa.roles),
         p.id, coalesce(p.activo, true), pa.invitado_en, u.last_sign_in_at
    from preasignaciones pa
    full join perfiles p on p.correo = pa.correo
    left join auth.users u on u.id = p.id
   order by 2;
end $$;
revoke execute on function usuarios_admin from public, anon;
grant execute on function usuarios_admin to authenticated;

-- Crear o actualizar una persona. Si ya tiene cuenta, actualiza su perfil y roles (con historial y auditoría).
create or replace function guardar_usuario(p_correo text, p_nombre text, p_rol_bel text, p_estacion uuid, p_compania uuid,
                                           p_elite boolean, p_roles rol_plataforma[], p_activo boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_correo text := lower(trim(p_correo)); v_perfil perfiles;
begin
  if not es_gestor() then raise exception 'No autorizado'; end if;
  if v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Correo no válido: %', p_correo; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Falta el nombre de %', v_correo; end if;
  if p_roles is null or array_length(p_roles, 1) is null then p_roles := '{participante}'; end if;

  insert into preasignaciones (correo, nombre, rol_bel_id, estacion_id, compania_id, grupo_elite, roles, creado_por)
  values (v_correo, trim(p_nombre), p_rol_bel, p_estacion, p_compania, coalesce(p_elite, false), p_roles, auth.uid())
  on conflict (correo) do update set nombre = excluded.nombre, rol_bel_id = excluded.rol_bel_id, estacion_id = excluded.estacion_id,
    compania_id = excluded.compania_id, grupo_elite = excluded.grupo_elite, roles = excluded.roles;

  select * into v_perfil from perfiles where correo = v_correo;
  if found then
    if v_perfil.rol_bel_id is distinct from p_rol_bel then
      insert into historial_rol_bel (perfil_id, rol_anterior, rol_nuevo, cambiado_por, motivo)
      values (v_perfil.id, v_perfil.rol_bel_id, p_rol_bel, auth.uid(), 'Actualizado desde Usuarios');
    end if;
    update perfiles set nombre = trim(p_nombre), rol_bel_id = p_rol_bel, estacion_id = p_estacion, compania_id = p_compania,
      grupo_elite = coalesce(p_elite, false), activo = coalesce(p_activo, true) where id = v_perfil.id;
    -- Roles de plataforma: aquí se agregan; la plataforma retira los que ya no estén (RLS: solo administración)
    insert into perfil_roles (perfil_id, rol) select v_perfil.id, unnest(p_roles) on conflict do nothing;
    perform auditar('guardar_usuario', 'perfiles', v_perfil.id::text, to_jsonb(v_perfil),
                    jsonb_build_object('rol_bel', p_rol_bel, 'roles', p_roles, 'activo', p_activo), null);
  end if;
end $$;
revoke execute on function guardar_usuario from public, anon;
grant execute on function guardar_usuario to authenticated;
