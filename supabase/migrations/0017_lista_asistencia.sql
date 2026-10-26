-- Operación BEL · 0017 · Listas de asistencia para descargar (una sesión o un periodo)
-- Administración y coordinación ven todas las sesiones; cada instructor, solo las suyas.
create or replace function lista_asistencia(p_sesion uuid default null, p_desde date default null,
                                            p_hasta date default null, p_modulo text default null)
returns table (sesion_id uuid, inicio timestamptz, fin timestamptz, modulo_codigo text, modulo text, mision text,
               modalidad text, lugar text, enlace text, instructor text, estado_sesion text,
               temas_abordados text, temas_pendientes text,
               nombre text, correo text, rol text, estacion text, compania text, grupo_elite boolean,
               asistencia text, registrado_por text, registrado_en timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.inicio, s.fin, s.modulo_codigo, m.nombre, m.mision, s.modalidad::text, s.lugar, s.enlace, ins.nombre, s.estado,
         s.temas_abordados, s.temas_pendientes,
         p.nombre, p.correo,
         rb.nombre || coalesce(' + ' || (select string_agg(x.nombre, ' + ' order by x.orden) from roles_bel x where x.id = any (p.roles_bel_extra)), ''),
         e.nombre, c.nombre, p.grupo_elite,
         case when a.presente then 'Asistió' when a.presente = false then 'No asistió' else 'Sin registrar' end,
         rp.nombre, a.registrado_en
    from sesiones s
    join modulos m on m.codigo = s.modulo_codigo
    left join perfiles ins on ins.id = s.instructor_id
    join inscripciones i on i.sesion_id = s.id
    join perfiles p on p.id = i.perfil_id
    left join roles_bel rb on rb.id = p.rol_bel_id
    left join unidades e on e.id = p.estacion_id
    left join unidades c on c.id = p.compania_id
    left join asistencias a on a.sesion_id = s.id and a.perfil_id = p.id
    left join perfiles rp on rp.id = a.registrado_por
   where (ve_seguimiento() or s.instructor_id = auth.uid())
     and (p_sesion is null or s.id = p_sesion)
     and (p_desde is null or (s.inicio at time zone 'America/Bogota')::date >= p_desde)
     and (p_hasta is null or (s.inicio at time zone 'America/Bogota')::date <= p_hasta)
     and (p_modulo is null or s.modulo_codigo = p_modulo)
   order by s.inicio, s.id, p.nombre
$$;
revoke execute on function lista_asistencia from public, anon;
grant execute on function lista_asistencia to authenticated;
