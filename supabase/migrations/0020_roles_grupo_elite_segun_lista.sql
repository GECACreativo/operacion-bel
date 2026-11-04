-- 0020 · Grupo Élite según «Usuarios Grupo Elite.xlsx» (aplicada en Supabase el 2026-11-03)
-- Rol principal Bombero para los 22 participantes y segundo rol solo para quienes lo tienen en la lista.
-- Los participantes dejan la «Ruta completa Grupo Élite» (0019); el rol ruta_elite sigue existiendo
-- y lo conservan las cuentas del equipo (ITM, GECA) que no están en la lista. Se crea la preinscripción de Andrés Monsalve.
with lista(correo, extra, compania) as (values
  ('didier.acevedo@medellin.gov.co', 'bombero_cf', 'Compañía C'),
  ('camilo.ortiz@medellin.gov.co', null, 'Compañía C'),
  ('camilo.palacio@medellin.gov.co', null, 'Compañía A'),
  ('carlosa.villa@medellin.gov.co', null, 'Compañía C'),
  ('carol.valencia@medellin.gov.co', null, 'Compañía C'),
  ('daniel.hincapie@medellin.gov.co', 'bombero_sh', 'Compañía B'),
  ('didier.gonzalez@medellin.gov.co', 'bombero_maquinista', 'Compañía C'),
  ('edgar.maya@medellin.gov.co', 'guardia_permanente', 'Compañía C'),
  ('edilme.carvajal@medellin.gov.co', null, 'Compañía A'),
  ('carlos.collazos@medellin.gov.co', null, 'Compañía B'),
  ('esteban.perezp@medellin.gov.co', null, 'Compañía B'),
  ('johans.agudelo@medellin.gov.co', 'bombero_cf', 'Compañía C'),
  ('john.canom@medellin.gov.co', null, 'Compañía C'),
  ('john.giraldo@medellin.gov.co', null, 'Compañía B'),
  ('jorgei.saldarriaga@medellin.gov.co', null, 'Compañía B'),
  ('jose.giraldo@medellin.gov.co', null, 'Compañía B'),
  ('nicolas.mejia@medellin.gov.co', 'encargado_estacion', 'Compañía C'),
  ('roberto.urquijo@medellin.gov.co', 'encargado_estacion', 'Compañía C'),
  ('sebastian.piedrahita@medellin.gov.co', null, 'Compañía B'),
  ('sergio.velasquez@medellin.gov.co', null, 'Compañía B'),
  ('wilmar.moncada@medellin.gov.co', null, 'Compañía B'),
  ('jaimea.monsalve@medellin.gov.co', null, 'Compañía A')
), ins as (
  insert into preasignaciones (correo, nombre, rol_bel_id, estacion_id, compania_id, grupo_elite, roles, roles_bel_extra)
  values ('jaimea.monsalve@medellin.gov.co', 'Andrés Monsalve', 'bombero', null,
          (select id from unidades where tipo = 'compania' and nombre = 'Compañía A'), true,
          '{participante,promotor_elite}', '{}')
  on conflict (correo) do nothing
  returning correo
)
update preasignaciones p
   set rol_bel_id = 'bombero',
       roles_bel_extra = case when l.extra is null then '{}'::text[] else array[l.extra] end,
       compania_id = (select id from unidades where tipo = 'compania' and nombre = l.compania),
       grupo_elite = true
  from lista l
 where p.correo = l.correo;

update perfiles f
   set rol_bel_id = 'bombero',
       roles_bel_extra = p.roles_bel_extra,
       compania_id = p.compania_id
  from preasignaciones p
 where f.correo = p.correo
   and p.correo like '%@medellin.gov.co'
   and p.grupo_elite;
