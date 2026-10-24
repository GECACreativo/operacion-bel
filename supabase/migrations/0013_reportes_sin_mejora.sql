-- Operación BEL · 0013 · Los reportes del Grupo Élite ya no usan el tipo «propuesta de mejora»
create or replace function reportes_bel_al_crear() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tipo not in ('falla', 'dificultad', 'duda') then raise exception 'Tipo de reporte no válido'; end if;
  new.autor_id := auth.uid();
  new.estado := 'nuevo'; new.respuesta := null; new.gestionado_por := null; new.gestionado_en := null;
  select estacion_id into new.estacion_id from perfiles where id = auth.uid();
  new.accion := trim(new.accion); new.observacion := trim(new.observacion);
  return new;
end $$;

create or replace function editar_reporte_bel(p_id uuid, p_modulo text, p_rol text, p_accion text, p_tipo text, p_impacto text, p_observacion text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_tipo not in ('falla', 'dificultad', 'duda') then raise exception 'Tipo de reporte no válido'; end if;
  update reportes_bel set modulo_codigo = p_modulo, rol_bel_id = p_rol, accion = trim(p_accion), tipo = p_tipo,
                          impacto = p_impacto, observacion = trim(p_observacion)
   where id = p_id and autor_id = auth.uid() and estado = 'nuevo';
  if not found then raise exception 'Solo puedes editar tus reportes mientras están en estado «nuevo»'; end if;
end $$;
