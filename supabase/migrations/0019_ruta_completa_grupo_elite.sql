-- 0019 · Ruta completa para el Grupo Élite
-- Un rol BEL adicional («Ruta completa Grupo Élite») que recorre los 13 módulos (M00–M11 y RI).
-- Se agrega a roles_bel_extra de todo el Grupo Élite (perfiles y preinscripciones), así la ruta,
-- los cuestionarios, los criterios del reto, el avance y los candidatos a sesiones lo reconocen sin cambiar código.
-- Aplicada en Supabase el 2026-11-01.

insert into roles_bel (id, nombre, familia, orden)
values ('ruta_elite', 'Ruta completa Grupo Élite', 'Grupo Élite', 500)
on conflict (id) do nothing;

insert into rol_modulo (rol_bel_id, modulo_codigo, hace, participacion, obligatorio, validado)
select 'ruta_elite', m.codigo,
       case when m.codigo = 'RI' then 'Ejecuta su parte del turno simulado' else 'Recorre el módulo completo como promotor (todos los roles)' end,
       'E', true, false
  from modulos m where m.activo
on conflict do nothing;

-- Criterios de reto de la ruta Élite (borrador, por validar en Control › Contenidos).
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden, validado) values
('M01','ruta_elite','Explica la rotación A-B-C y ubica en el cronograma la compañía de turno de una fecha.',true,1,false),
('M01','ruta_elite','Arma una estación con el mínimo (1 Jefe, 1 Maquinista y 5 Bomberos) sin asignar personal bloqueado.',false,2,false),
('M01','ruta_elite','Identifica qué rol crea el turno, quién reporta inicio y fin, y quién firma el cierre.',false,3,false),
('M02','ruta_elite','Registra una novedad con tipo, fechas, observaciones y soportes coherentes con el caso.',true,1,false),
('M02','ruta_elite','Identifica qué tipos de novedad bloquean el turno y qué pasa al aprobarla.',false,2,false),
('M02','ruta_elite','Explica quién aprueba o rechaza y por qué el rechazo exige motivo.',false,3,false),
('M03','ruta_elite','Hace un chequeo vehicular con OK, Falla o No aplica, y observación y foto en cada falla.',true,1,false),
('M03','ruta_elite','Recorre la ruta de la novedad hasta el visto bueno del Profesional Supervisor.',false,2,false),
('M03','ruta_elite','Explica cuándo se asigna un reemplazo o se pide un préstamo entre estaciones.',false,3,false),
('M04','ruta_elite','Hace el chequeo de un contenedor dentro de su ventana y reporta los ítems con falla y fotos.',true,1,false),
('M04','ruta_elite','Explica la decisión del mando: rechazar con motivo o escalar con destino y prioridad.',false,2,false),
('M04','ruta_elite','Explica por qué en pérdida o hurto la denuncia va antes de la baja.',false,3,false),
('M05','ruta_elite','Revisa duplicados y registra una novedad locativa con datos completos y fotos.',true,1,false),
('M05','ruta_elite','Explica el ciclo de programación, intervención, avances y cierre con evidencia.',false,2,false),
('M06','ruta_elite','Registra anotaciones con la plantilla correcta, incluida una emergencia con despacho y regreso.',true,1,false),
('M06','ruta_elite','Hace el relevo de guardia cerrando sesión y entrando con su propio usuario.',false,2,false),
('M06','ruta_elite','Explica las condiciones para cerrar y firmar la bitácora.',false,3,false),
('M07','ruta_elite','Responde una convocatoria: acepta, rechaza con motivo o se inscribe.',true,1,false),
('M07','ruta_elite','Explica los 3 pasos para crear una actividad y el plazo de 7 días para evidencias.',false,2,false),
('M07','ruta_elite','Registra o explica un préstamo con devolución y foto.',false,3,false),
('M08','ruta_elite','Diligencia «Mi Actividad» con datos, dirección y fotos.',true,1,false),
('M08','ruta_elite','Explica la planeación por compañía y día de turno y la asignación que hace el Líder de Compañía.',false,2,false),
('M08','ruta_elite','Explica quién pospone o cancela una actividad y que exige motivo.',false,3,false),
('M09','ruta_elite','Identifica las acciones definitivas (aprobar o rechazar en Validación, cerrar período) y aplica el «Confirmo».',true,1,false),
('M09','ruta_elite','Explica cómo una novedad aprobada llega a la quincena.',false,2,false),
('M09','ruta_elite','Encuentra una inconsistencia en la quincena de prueba.',false,3,false),
('M10','ruta_elite','Revisa la vista previa del informe de un turno y verifica la firma registrada.',true,1,false),
('M10','ruta_elite','Rastrea una diferencia del informe hasta su módulo de origen.',false,2,false),
('M11','ruta_elite','Diagnostica un ticket de estación con causa, cambio e impacto antes de configurar.',true,1,false),
('M11','ruta_elite','Explica qué configura el Administrador: usuarios, permisos, hardware e inventarios.',false,2,false);

update perfiles set roles_bel_extra = array_append(roles_bel_extra, 'ruta_elite')
 where grupo_elite and not ('ruta_elite' = any (roles_bel_extra));
update preasignaciones set roles_bel_extra = array_append(coalesce(roles_bel_extra, '{}'), 'ruta_elite')
 where grupo_elite and not ('ruta_elite' = any (coalesce(roles_bel_extra, '{}')));
