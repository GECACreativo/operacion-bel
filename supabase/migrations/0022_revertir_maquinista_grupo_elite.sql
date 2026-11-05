-- 0022 · Revierte 0021 (aplicada en Supabase el 2026-11-04).
-- El Grupo Élite queda solo con los roles de la lista oficial «Usuarios Grupo Elite.xlsx».
-- Didier González conserva Bombero Maquinista porque es su segundo rol en la lista.
update preasignaciones
   set roles_bel_extra = array_remove(roles_bel_extra, 'bombero_maquinista')
 where grupo_elite and correo like '%@medellin.gov.co' and correo not in ('veronica.cardona@medellin.gov.co', 'didier.gonzalez@medellin.gov.co');
update perfiles f
   set roles_bel_extra = p.roles_bel_extra
  from preasignaciones p
 where f.correo = p.correo and p.grupo_elite and p.correo like '%@medellin.gov.co' and p.correo <> 'veronica.cardona@medellin.gov.co';
