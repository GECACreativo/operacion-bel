-- Operación BEL · 0018 · Firma de la asistencia por el participante
-- Cuando el formador marca «Asistió», la persona puede firmar (dibujando o subiendo una imagen) su asistencia.
-- Las firmas se guardan en un depósito privado; solo la persona, administración, coordinación e instructores las ven.

alter table asistencias add column if not exists firma_path text;
alter table asistencias add column if not exists firmado_en timestamptz;
alter table perfiles add column if not exists firma_path text;   -- firma guardada para reutilizar

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('firmas', 'firmas', false, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Cada persona escribe solo en su carpeta: firmas/<su id>/...
create policy firmas_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'firmas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy firmas_reemplazar on storage.objects for update to authenticated
  using (bucket_id = 'firmas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy firmas_ver on storage.objects for select to authenticated
  using (bucket_id = 'firmas' and ((storage.foldername(name))[1] = auth.uid()::text or ve_seguimiento() or tiene_rol('instructor')));

-- Firmar una asistencia propia ya marcada como «Asistió»
create or replace function firmar_asistencia(p_sesion uuid, p_path text, p_guardar boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'Firma no válida'; end if;
  select id into v_id from asistencias where sesion_id = p_sesion and perfil_id = auth.uid() and presente;
  if v_id is null then raise exception 'Solo puedes firmar cuando el formador haya marcado tu asistencia'; end if;
  update asistencias set firma_path = p_path, firmado_en = now() where id = v_id;
  if p_guardar then update perfiles set firma_path = p_path where id = auth.uid(); end if;
  perform auditar('firmar_asistencia', 'asistencias', v_id::text, null, jsonb_build_object('firma', p_path), null);
end $$;
revoke execute on function firmar_asistencia from public, anon;
grant execute on function firmar_asistencia to authenticated;

-- Asistencias propias pendientes de firma
create or replace function firmas_pendientes()
returns table (sesion_id uuid, inicio timestamptz, modulo_codigo text, mision text, modalidad text, lugar text)
language sql stable security definer set search_path = public as $$
  select s.id, s.inicio, s.modulo_codigo, m.mision, s.modalidad::text, s.lugar
    from asistencias a join sesiones s on s.id = a.sesion_id join modulos m on m.codigo = s.modulo_codigo
   where a.perfil_id = auth.uid() and a.presente and a.firma_path is null
   order by s.inicio desc
$$;
revoke execute on function firmas_pendientes from public, anon;
grant execute on function firmas_pendientes to authenticated;

-- Firmas para las listas de asistencia (mismo alcance que lista_asistencia)
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
     and (p_modulo is null or s.modulo_codigo = p_modulo)
$$;
revoke execute on function firmas_lista from public, anon;
grant execute on function firmas_lista to authenticated;
