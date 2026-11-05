-- Operación BEL · 0021 · Eliminar sesiones: recalcula todas las misiones de una sesión libre (requiere 0020)
-- Pensado para sesiones de prueba o creadas por error. Exige motivo, queda en auditoría con una copia de los datos,
-- y recalcula la XP y el estado de las misiones de quienes tenían asistencia en esa sesión.
create or replace function eliminar_sesion(p_sesion uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_s sesiones; v_personas uuid[]; r uuid; m text;
begin
  if not es_gestor() then raise exception 'Solo administración puede eliminar sesiones'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Escribe el motivo de la eliminación'; end if;
  select * into v_s from sesiones where id = p_sesion;
  if not found then raise exception 'La sesión no existe'; end if;
  select array_agg(perfil_id) into v_personas from asistencias where sesion_id = p_sesion and presente;

  perform auditar('eliminar_sesion', 'sesiones', p_sesion::text,
    jsonb_build_object('sesion', to_jsonb(v_s),
      'inscritos', (select coalesce(jsonb_agg(p.correo), '[]') from inscripciones i join perfiles p on p.id = i.perfil_id where i.sesion_id = p_sesion),
      'asistencias', (select coalesce(jsonb_agg(jsonb_build_object('correo', p.correo, 'presente', a.presente, 'firmado_en', a.firmado_en)), '[]')
                        from asistencias a join perfiles p on p.id = a.perfil_id where a.sesion_id = p_sesion)),
    null, trim(p_motivo));

  -- Quitar enlaces de reprogramación hacia esta sesión
  update sesiones set sesion_origen_id = null where sesion_origen_id = p_sesion;
  update sesiones set reprogramada_en_id = null where reprogramada_en_id = p_sesion;
  -- Inscripciones, asistencias e historial se eliminan en cascada
  delete from sesiones where id = p_sesion;

  -- La asistencia de esa sesión deja de contar: se recalcula XP y estado de cada persona
  if v_personas is not null then
    foreach r in array v_personas loop
      foreach m in array modulos_de(v_s) loop
        perform recalcular_asistencia(r, m, null, 'Sesión eliminada: ' || trim(p_motivo));
      end loop;
    end loop;
  end if;
end $$;
revoke execute on function eliminar_sesion from public, anon;
grant execute on function eliminar_sesion to authenticated;
