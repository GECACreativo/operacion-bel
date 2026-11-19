-- 0024 · Matrícula en Operación BEL.
-- Cancelar la matrícula saca a la persona del tablero y de los indicadores, sin borrar nada de su avance.
-- Se puede volver a matricular en cualquier momento; cada cambio queda en el historial y en la auditoría.

alter table perfiles add column if not exists matriculado boolean not null default true;

create table if not exists matriculas_historial (
  id          bigint generated always as identity primary key,
  perfil_id   uuid not null references perfiles(id),
  matriculado boolean not null,
  motivo      text not null,
  actor_id    uuid references perfiles(id),
  fecha       timestamptz not null default now()
);
alter table matriculas_historial enable row level security;
create policy lectura on matriculas_historial for select to authenticated using (perfil_id = auth.uid() or es_gestor() or ve_seguimiento());

create or replace function cambiar_matricula(p_perfiles uuid[], p_matriculado boolean, p_motivo text)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int := 0; p uuid;
begin
  if not es_gestor() then raise exception 'Solo administración puede cambiar la matrícula'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Indica el motivo'; end if;
  foreach p in array p_perfiles loop
    update perfiles set matriculado = p_matriculado where id = p and matriculado is distinct from p_matriculado;
    if found then
      insert into matriculas_historial (perfil_id, matriculado, motivo, actor_id) values (p, p_matriculado, trim(p_motivo), auth.uid());
      perform auditar(case when p_matriculado then 'matricular' else 'cancelar_matricula' end, 'perfiles', p::text, null, null, trim(p_motivo));
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;

/** Estado de matrícula de cada persona, con el último cambio (para el tablero). */
create or replace function matriculas()
returns table (perfil_id uuid, matriculado boolean, fecha timestamptz, motivo text)
language sql stable security definer set search_path = public as $$
  select p.id, p.matriculado, h.fecha, h.motivo
    from perfiles p
    left join lateral (select x.fecha, x.motivo from matriculas_historial x where x.perfil_id = p.id order by x.fecha desc limit 1) h on true
   where p.activo and (es_gestor() or ve_seguimiento())
$$;

revoke execute on function cambiar_matricula, matriculas from public, anon;
grant execute on function cambiar_matricula, matriculas to authenticated;

-- El avance por compañía solo cuenta a las personas matriculadas
create or replace function avance_companias()
returns table(compania_id uuid, compania text, personas integer, avance numeric)
language sql stable security definer set search_path = public as $$
  with por_persona as (
    select p.id, p.compania_id,
           (select count(distinct rm.modulo_codigo) from rol_modulo rm
             where rm.rol_bel_id = any (roles_bel_de(p.id)) and not excluida(p.id, rm.modulo_codigo)) as total,
           (select count(distinct ma.modulo_codigo) from misiones_aprobadas ma join rol_modulo rm
              on rm.modulo_codigo = ma.modulo_codigo and rm.rol_bel_id = any (roles_bel_de(p.id))
             where ma.perfil_id = p.id and (ma.revocada_en is null or ma.via = 'convalidacion')
               and not excluida(p.id, ma.modulo_codigo)) as ok
      from perfiles p where p.activo and p.matriculado and p.rol_bel_id is not null
  )
  select u.id, u.nombre, count(pp.id)::int,
         coalesce(round(avg(case when pp.total > 0 then pp.ok::numeric / pp.total end), 3), 0)
    from unidades u left join por_persona pp on pp.compania_id = u.id
   where u.tipo = 'compania' and u.activo
   group by u.id, u.nombre order by u.nombre
$$;
