-- Operación BEL · 0005 · Asistencia: exige inscripción e impide registrar la propia (salvo administración, auditado)

create or replace function registrar_asistencia(p_sesion uuid, p_perfil uuid, p_presente boolean,
                                                p_mecanismo text default 'instructor', p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_mod text; v_prev asistencias; v_id uuid;
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
  if p_perfil = auth.uid() then
    perform auditar('asistencia_propia', 'asistencias', v_id::text, null, jsonb_build_object('presente', p_presente), p_motivo);
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

revoke execute on function registrar_asistencia from public, anon;
grant execute on function registrar_asistencia to authenticated;

-- Lista de instructores para programar sesiones
create or replace function instructores()
returns table (id uuid, nombre text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nombre from perfiles p join perfil_roles r on r.perfil_id = p.id
   where r.rol = 'instructor' and p.activo and (es_gestor() or tiene_rol('instructor'))
   order by p.nombre
$$;
revoke execute on function instructores from public, anon;
grant execute on function instructores to authenticated;
