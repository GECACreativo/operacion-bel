-- 0021 · Rol adicional Bombero Maquinista para los 22 participantes del Grupo Élite (aplicada en Supabase el 2026-11-04).
-- No cambia el número de misiones (los módulos del Maquinista ya están en la ruta de Bombero);
-- suma al reto los criterios del Maquinista (chequeo vehicular en M03, entre otros).
update preasignaciones
   set roles_bel_extra = array_append(roles_bel_extra, 'bombero_maquinista')
 where grupo_elite and correo like '%@medellin.gov.co' and correo <> 'veronica.cardona@medellin.gov.co'
   and not ('bombero_maquinista' = any (roles_bel_extra));
update perfiles f
   set roles_bel_extra = p.roles_bel_extra
  from preasignaciones p
 where f.correo = p.correo and p.grupo_elite and p.correo like '%@medellin.gov.co' and p.correo <> 'veronica.cardona@medellin.gov.co';
