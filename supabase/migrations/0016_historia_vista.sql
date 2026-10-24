-- Operación BEL · 0016 · Storytelling: registrar que la persona ya vio la bienvenida y la apertura de cada misión
alter table perfiles add column if not exists bienvenida_vista_en timestamptz;
alter table perfiles add column if not exists historias_vistas text[] not null default '{}';

create or replace function marcar_bienvenida() returns void
language sql security definer set search_path = public as $$
  update perfiles set bienvenida_vista_en = coalesce(bienvenida_vista_en, now()) where id = auth.uid()
$$;
revoke execute on function marcar_bienvenida from public, anon;
grant execute on function marcar_bienvenida to authenticated;

create or replace function marcar_historia(p_codigo text) returns void
language sql security definer set search_path = public as $$
  update perfiles set historias_vistas = array(select distinct unnest(historias_vistas || p_codigo))
   where id = auth.uid() and exists (select 1 from modulos where codigo = p_codigo)
$$;
revoke execute on function marcar_historia from public, anon;
grant execute on function marcar_historia to authenticated;
