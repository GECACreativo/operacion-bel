-- 0025 · Resultados de los cuestionarios (evaluaciones) por persona y misión, para el tablero. Solo lectura.
create or replace function tablero_cuestionarios()
returns table (perfil_id uuid, codigo text, intentos int, aprobado boolean, mejor numeric, ultimo timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not ve_seguimiento() then raise exception 'No autorizado'; end if;
  return query
  select i.perfil_id, c.modulo_codigo, count(*)::int, bool_or(i.aprobado), max(i.puntaje), max(i.enviado_en)
    from intentos i join cuestionarios c on c.id = i.cuestionario_id
    join perfiles p on p.id = i.perfil_id and p.activo
   group by i.perfil_id, c.modulo_codigo;
end $$;
revoke execute on function tablero_cuestionarios from public, anon;
grant execute on function tablero_cuestionarios to authenticated;
