-- Operación BEL · 0011 · Contenido BORRADOR (por validar) de M01, M03–M11 y el Reto integrador
-- Fuente: Mapa de Flujos BEL (flujos por módulo y rol, y reglas de cada módulo). Redactado por Claude para revisión del equipo.
-- Retos: criterios por perfil (críticos = sin ellos no se aprueba). Cuestionarios: 8 preguntas por misión.

-- Auxiliar temporal para cargar criterios a varios roles a la vez
create or replace function _cargar_criterios(p_mod text, p_roles text[], p_items text[], p_criticos boolean[], p_desde int default 1)
returns void language plpgsql as $$
declare r text; i int;
begin
  foreach r in array p_roles loop
    for i in 1..array_length(p_items, 1) loop
      insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden)
      values (p_mod, r, p_items[i], p_criticos[i], p_desde + i - 1);
    end loop;
  end loop;
end $$;
revoke execute on function _cargar_criterios from public, anon, authenticated;

do $$ begin
-- ═════════ M01 · Control de Turnos ═════════
perform _cargar_criterios('M01', array['administrador','subcomandante','encargado_operativo'], array[
  'Crea un turno con compañía, fecha y encargados, sin duplicar un turno de la misma compañía y fecha.',
  'Asigna el personal por estación y puesto cumpliendo el mínimo: 1 Jefe de Estación, 1 Maquinista y 5 Bomberos Operativos.',
  'Identifica al personal deshabilitado por una novedad aprobada y no lo asigna.',
  'Elige correctamente entre asignar «este turno» o «este y los siguientes».',
  'Mueve personal entre estaciones en el Panel Operativo y pulsa «Publicar cambios».',
  'Revisa en «Reporte por Estación» qué estaciones ya reportaron.'],
  array[true, true, true, false, true, false]);
perform _cargar_criterios('M01', array['administrador','subcomandante'], array[
  'Aprueba el reporte de cada estación en el Consolidado General.',
  'Pulsa «Firmar y Cerrar Turno» con su firma registrada, sabiendo que después no admite cambios.'],
  array[true, true], 7);
perform _cargar_criterios('M01', array['subcomandante'], array[
  'Programa un compensatorio (jueves «Dominical») para el personal que corresponde.'], array[false], 9);
perform _cargar_criterios('M01', array['encargado_operativo'], array[
  'Explica que aprobar el consolidado y cerrar el turno con firma le corresponde al Subcomandante.'], array[false], 7);
perform _cargar_criterios('M01', array['encargado_estacion'], array[
  'Consulta la programación del turno de su estación.',
  'Diligencia el reporte de inicio de turno de su estación.',
  'Diligencia el reporte de fin de turno de su estación.',
  'Compara el personal asignado con el presente y comunica las diferencias al mando.'],
  array[false, true, true, false]);
perform _cargar_criterios('M01', array['bombero','bombero_maquinista','guardia_permanente'], array[
  'Ingresa a Control Turnos y encuentra «Mis turnos».',
  'Identifica fecha, compañía, estación y puesto de su próximo turno.',
  'Explica que una novedad aprobada lo deshabilita para el turno de ese día.'],
  array[true, true, false]);
perform _cargar_criterios('M01', array['coord_cf'], array[
  'Consulta el cronograma de turnos de las compañías.',
  'Identifica qué compañía está de turno en una fecha para programar una formación.',
  'Explica que el personal con novedad aprobada no es elegible ese día.'],
  array[true, true, false]);
perform _cargar_criterios('M01', array['subdirector'], array[
  'Abre «Reporte por Estación» y ubica qué estaciones ya reportaron.',
  'Interpreta el estado del consolidado del día (pendiente, aprobado o cerrado).',
  'Reconoce que su rol hace seguimiento y no modifica el turno.'],
  array[true, true, false]);

-- ═════════ M03 · Novedades de Vehículos ═════════
perform _cargar_criterios('M03', array['bombero_maquinista'], array[
  'Hace el chequeo dentro del horario de inicio o fin de turno configurado.',
  'Selecciona los vehículos de su estación.',
  'Marca cada punto como OK, Falla o No aplica.',
  'Para cada falla escribe la observación y sube fotos.',
  'Verifica que la falla generó automáticamente la novedad del vehículo.',
  'Explica que el chequeo funciona sin conexión y se envía al volver la red.'],
  array[false, false, true, true, false, false]);
perform _cargar_criterios('M03', array['mant_vehicular'], array[
  'Acepta la novedad («Remitido a Mantenimiento» y la toma en revisión) o la rechaza escribiendo el motivo.',
  'Inicia el mantenimiento eligiendo preventivo o correctivo, local o externo.',
  'Registra los avances del mantenimiento.',
  'Marca la novedad como resuelta y verifica que queda «Pendiente Aprobación Supervisor».',
  'Consulta el historial del vehículo.'],
  array[true, true, false, true, false]);
perform _cargar_criterios('M03', array['profesional_supervisor'], array[
  'Ubica las novedades en «Pendiente Aprobación Supervisor» y revisa sus avances.',
  'Aprueba el retorno del vehículo a operativo cuando el mantenimiento está completo.',
  'Rechaza con motivo y devuelve a mantenimiento cuando no está listo.',
  'Explica que sin su visto bueno el vehículo no vuelve a operar.'],
  array[true, true, true, false]);
perform _cargar_criterios('M03', array['administrador','subcomandante','encargado_operativo'], array[
  'Revisa el estado de la flota del turno e identifica los vehículos fuera de servicio.',
  'Asigna un vehículo de reemplazo mientras el vehículo está fuera de servicio.',
  'Solicita el préstamo de un vehículo de otra estación y sabe cancelarlo en «MIS SOLICITUDES».',
  'Aprueba o rechaza con motivo una solicitud de préstamo en «PENDIENTES».',
  'Usa «Consolidar Turno» para generar el PDF del turno que se remite al Subcomando.'],
  array[true, true, false, true, false]);
perform _cargar_criterios('M03', array['encargado_estacion'], array[
  'Revisa la pestaña «PENDIENTES» de solicitudes de préstamo de su estación.',
  'Aprueba o rechaza una solicitud de préstamo escribiendo el motivo si la rechaza.',
  'Verifica el estado de los vehículos de su estación y sus novedades abiertas.',
  'Reconoce que solo ve las solicitudes de su estación.'],
  array[true, true, false, false]);
perform _cargar_criterios('M03', array['bombero','lider_programa'], array[
  'Ubica un vehículo y verifica si está operativo o fuera de servicio.',
  'Abre una novedad del vehículo e interpreta su estado.',
  'Reconoce que su rol consulta y no gestiona las novedades.'],
  array[true, true, false]);

-- ═════════ M04 · Novedades de HEAs ═════════
perform _cargar_criterios('M04', array['bombero'], array[
  'Inicia el chequeo del turno y marca los contenedores de su estación a revisar.',
  'Marca los ítems con novedad, describe la falla y sube fotos.',
  'Explica que si el ítem ya tiene una novedad abierta, la nueva falla se suma a esa misma novedad.',
  'Verifica que la novedad quedó en estado «Pendiente».'],
  array[false, true, false, true]);
perform _cargar_criterios('M04', array['administrador','subcomandante','encargado_operativo','encargado_estacion'], array[
  'Revisa una novedad pendiente con su descripción y fotos antes de decidir.',
  'Rechaza con motivo una novedad que no procede y sabe que se puede reabrir.',
  'Escala la novedad eligiendo destino (Mantenimiento HEA''S o Almacén), prioridad y nota.',
  'Hace seguimiento con las pestañas de estado: Pendientes, Remitidas, En mantenimiento, Resueltas y Rechazadas.'],
  array[true, true, true, false]);
perform _cargar_criterios('M04', array['mant_heas'], array[
  'Toma la novedad remitida y registra el diagnóstico: preventivo o correctivo, interno o externo.',
  'Registra los avances de la reparación.',
  'Cierra la novedad como reparada cuando el elemento vuelve al contenedor.',
  'Si no se pudo reparar, la remite a Almacén por reintegro.'],
  array[true, false, true, true]);
perform _cargar_criterios('M04', array['almacenista'], array[
  'Atiende las novedades «Remitida a Almacén».',
  'Si es pérdida o hurto, carga la denuncia de Fiscalía antes de la baja.',
  'Registra la baja del elemento.',
  'Registra la reposición con el elemento nuevo.'],
  array[false, true, true, true]);
perform _cargar_criterios('M04', array['lider_programa','lider_proyecto'], array[
  'Filtra las novedades por pestaña de estado.',
  'Abre una novedad e interpreta en qué punto de la ruta va (decisión, mantenimiento, baja o reposición).',
  'Consulta los reportes de novedades de HEAs.'],
  array[true, true, false]);

-- ═════════ M05 · Novedades Locativas ═════════
perform _cargar_criterios('M05', array['administrador','subcomandante','encargado_operativo','encargado_estacion'], array[
  'Revisa si ya existe una novedad igual para la estación antes de crear una nueva.',
  'Crea «Nueva Novedad» con estación, instalación, tipo, compañía, ubicación, fecha y hora de detección.',
  'Adjunta fotos que muestren el daño o la necesidad.',
  'Hace seguimiento del estado y consulta cómo se documentó la solución.'],
  array[true, true, true, false]);
perform _cargar_criterios('M05', array['mant_locativo'], array[
  'Abre la novedad con «Ver» y revisa la información y las fotos.',
  'Programa la fecha de la visita.',
  'Define la intervención (preventiva o correctiva) y su prioridad.',
  'Cambia el estado a «En Proceso» y registra avances con fotos.',
  'Cierra como «Resuelto» con nota y evidencia.',
  'Descarga el informe PDF o consulta el histórico.'],
  array[false, true, true, false, true, false]);

-- ═════════ M06 · Minuta Digital ═════════
perform _cargar_criterios('M06', array['bombero','bombero_maquinista','guardia_permanente','encargado_operativo','encargado_estacion','bombero_cf','bombero_sh'], array[
  'Entra a la bitácora del turno desde el equipo autorizado de la estación, estando asignado al turno.',
  'Registra una anotación usando la plantilla correcta para el caso (relevo, recibo y entrega de guardia, revisión técnica, etc.).',
  'Registra el despacho de una emergencia al salir.',
  'Completa la misma anotación con el regreso de la máquina.'],
  array[false, true, true, true]);
perform _cargar_criterios('M06', array['bombero','bombero_maquinista','guardia_permanente'], array[
  'Reconoce que su rol anota pero no cierra la bitácora.'], array[false], 5);
perform _cargar_criterios('M06', array['encargado_operativo','encargado_estacion','bombero_cf','bombero_sh'], array[
  'Verifica que no queden emergencias pendientes antes del cierre.',
  'Cierra y firma la bitácora con su firma digital (con conexión).'],
  array[true, true], 5);
perform _cargar_criterios('M06', array['administrador','subcomandante'], array[
  'Revisa la bitácora del turno de una estación.',
  'Agrega una observación a una anotación.',
  'Verifica que no queden emergencias pendientes y cierra con firma cuando corresponde.',
  'Descarga el PDF de una bitácora cerrada desde el Archivo de Bitácoras.'],
  array[false, true, true, false]);
perform _cargar_criterios('M06', array['secretaria','subdirector'], array[
  'Filtra el Archivo de Bitácoras por estación, compañía, año y mes.',
  'Descarga el PDF de una bitácora cerrada.',
  'Reconoce que su rol consulta el archivo y no anota en la bitácora.'],
  array[true, true, false]);

-- ═════════ M07 · Centro de Formación ═════════
perform _cargar_criterios('M07', array['administrador','coord_cf'], array[
  'Crea una actividad · Paso 1 «Información»: tipo, modalidad, fechas y ubicación.',
  'Paso 2 «Asignación»: coordinador del curso, instructores y participantes, o convocatoria con cupo.',
  'Paso 3 «Confirmación» y aprobación de las inscripciones.',
  'Reprograma o cancela una actividad escribiendo el motivo.',
  'Revisa la configuración: roles habilitados, tipos de actividad y de bitácora, plazo de evidencias.',
  'Consulta los reportes e indicadores del Centro.'],
  array[true, true, true, false, false, false]);
perform _cargar_criterios('M07', array['subcomandante','encargado_operativo','encargado_estacion','bombero','bombero_maquinista',
  'guardia_permanente','mant_vehicular','mant_locativo','bombero_sh','secretaria','subdirector','lider_programa','bombero_cf'], array[
  'Ubica una actividad asignada con su fecha, horario y lugar.',
  'Acepta cada fecha asignada o la rechaza escribiendo el motivo.',
  'Se inscribe a una convocatoria abierta.',
  'Explica que si cambia el horario de una fecha debe confirmar de nuevo.'],
  array[false, true, true, false]);
perform _cargar_criterios('M07', array['bombero_cf'], array[
  'Registra en la bitácora del Centro una «Nueva actividad» con tipo, nombre, descripción, fecha y hora.',
  'Agrega participantes y fotos a la actividad de bitácora.',
  'Registra un préstamo con elementos, responsables y fecha de devolución.',
  'Aprueba o rechaza la devolución de un préstamo verificando la foto.'],
  array[true, false, true, true], 5);

-- ═════════ M08 · Seguridad Humana ═════════
perform _cargar_criterios('M08', array['coord_sh'], array[
  'Crea «Nueva Actividad» con nombre, compañía, día con turno y enfoque.',
  'Marca los tipos de actividad del turno.',
  'Pospone una actividad a otro turno cuando corresponde.',
  'Consulta el resultado en el informe cerrado.'],
  array[true, true, false, false]);
perform _cargar_criterios('M08', array['lider_compania'], array[
  'Asigna el vehículo DAGRD o la placa especial.',
  'Asigna el personal y marca al encargado de evidencias.',
  'Pulsa «Guardar cambios» para que salga el correo a los asignados.',
  'Revisa cada actividad en «Ver resumen» y solicita mejora cuando hace falta.',
  'Cierra el informe cuando todas las actividades tienen visto bueno.'],
  array[true, true, true, false, true]);
perform _cargar_criterios('M08', array['bombero_sh'], array[
  'Abre «Mi Actividad».',
  'Completa los datos y la dirección (el sistema asigna barrio y comuna).',
  'Sube las fotos y guarda.',
  'Atiende una solicitud de mejora del Líder de Compañía.'],
  array[false, true, true, false]);
perform _cargar_criterios('M08', array['administrador'], array[
  'Revisa la planeación de una compañía y su estado.',
  'Pospone o cancela una actividad cuando corresponde.',
  'Verifica el cierre del informe y lo descarga en Word o PDF con firma registrada.'],
  array[false, true, true]);

-- ═════════ M09 · Gestión de Nómina ═════════
perform _cargar_criterios('M09', array['administrador','secretaria'], array[
  'Verifica los tipos de novedad (código de pago y si requieren aprobación) y los parámetros de horas.',
  'Crea el período de la quincena o usa «Generar año».',
  'En Validación carga las novedades del período por compañía (A, B y C).',
  'Aprueba o rechaza con motivo cada novedad, sabiendo que la decisión es definitiva.',
  'Aplica un ajuste masivo de horas escribiendo el motivo.',
  'Guarda la nómina y descarga los reportes (cronograma + SCAT).',
  'Cierra el período solo después de verificar, sabiendo que es irreversible.'],
  array[false, false, true, true, false, true, true]);
perform _cargar_criterios('M09', array['subcomandante'], array[
  'Crea una regla de calendario (recargo por día, franja o festivo).',
  'Verifica que la regla aplica a las fechas correctas.',
  'Reconoce que la liquidación de la quincena le corresponde a Secretaría.'],
  array[true, true, false]);

-- ═════════ M10 · Informe por Turno ═════════
perform _cargar_criterios('M10', array['administrador','subcomandante','encargado_operativo','encargado_estacion'], array[
  'Selecciona «Compañía» y «Estación» (el Encargado de Estación, siempre la suya).',
  'Elige una «Fecha del turno» habilitada.',
  'Revisa la «Vista previa»: asistencia, casos atendidos, novedades y resumen de Seguridad Humana.',
  'Verifica que tiene la firma registrada antes de generar.',
  'Genera y descarga el PDF firmado.'],
  array[false, true, true, true, true]);

-- ═════════ M11 · Administración ═════════
perform _cargar_criterios('M11', array['administrador','subcomandante'], array[
  'Crea un usuario con rol principal, roles adicionales, estación y compañías, y lo activa.',
  'Ajusta roles y permisos y verifica su efecto en el menú.',
  'Autoriza el equipo de una estación en «Gestionar Hardware».',
  'Revisa el inventario de HEAs (contenedores, secciones, ítems y horarios de chequeo).',
  'Recuerda a la persona que tras un cambio de rol debe cerrar sesión y volver a entrar.'],
  array[true, true, true, false, false]);
perform _cargar_criterios('M11', array['administrador'], array[
  'Configura una notificación por evento y compañía.',
  'Sube o actualiza un formato de novedades.'],
  array[false, false], 6);
perform _cargar_criterios('M11', array['encargado_operativo'], array[
  'Crea o actualiza contenedores, secciones e ítems del inventario de HEAs.',
  'Ajusta el horario de chequeo de un contenedor.',
  'Verifica que el cambio aparece en el chequeo de la estación.'],
  array[true, true, false]);
perform _cargar_criterios('M11', array['mant_vehicular'], array[
  'Actualiza la hoja de vida de un vehículo.',
  'Revisa los catálogos vehiculares.',
  'Verifica que la información se refleja en Novedades de Vehículos.'],
  array[true, false, false]);
perform _cargar_criterios('M11', array['coord_cf'], array[
  'Configura los roles habilitados para el Centro de Formación.',
  'Configura los tipos de actividad y de bitácora.',
  'Revisa el plazo de carga de evidencias.'],
  array[true, true, false]);
perform _cargar_criterios('M11', array['encargado_estacion','bombero','bombero_maquinista','guardia_permanente','bombero_cf','bombero_sh','secretaria'], array[
  'Registra o actualiza su firma digital en Administración › Firmas Digitales.',
  'Descarga el formato de novedades que necesita.',
  'Explica qué acciones de su rol no podría completar sin firma registrada.'],
  array[true, false, false]);
perform _cargar_criterios('M11', array['mant_heas','almacenista','coord_sh','lider_compania'], array[
  'Registra o actualiza su firma digital en Administración › Firmas Digitales.',
  'Explica qué acciones de su rol no podría completar sin firma registrada.'],
  array[true, false]);
perform _cargar_criterios('M11', array['profesional_supervisor','mant_locativo','subdirector'], array[
  'Consulta los catálogos o formatos que usa su rol.',
  'Identifica a quién pedir un cambio de configuración (Administrador o Subcomandante).'],
  array[true, false]);

-- ═════════ RI · Mi turno en BEL ═════════
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden) values
('RI', null, 'Ejecuta sus acciones en el orden del turno: publicado → recursos verificados → documentado → novedad gestionada → cierre.', false, 90),
('RI', null, 'Explica cómo su parte conecta con la etapa anterior y la siguiente del turno.', false, 91);
perform _cargar_criterios('RI', array['administrador','subcomandante'], array[
  'Verifica que el turno está creado, con personal asignado y cambios publicados.',
  'Asigna un vehículo de reemplazo o decide una novedad de personal del caso.',
  'Aprueba los reportes de las estaciones en el Consolidado General.',
  'Firma y cierra el turno.',
  'Genera el Informe por Turno firmado.'],
  array[true, true, true, true, false]);
perform _cargar_criterios('RI', array['encargado_operativo'], array[
  'Ajusta el personal en el Panel Operativo y publica los cambios.',
  'Escala la novedad de HEA del caso al destino correcto.',
  'Cierra y firma la bitácora sin emergencias pendientes.',
  'Genera el Informe por Turno de una estación.'],
  array[true, true, true, false]);
perform _cargar_criterios('RI', array['encargado_estacion'], array[
  'Diligencia el reporte de inicio de turno.',
  'Decide la novedad de HEA del caso (rechaza con motivo o escala).',
  'Cierra y firma la bitácora sin emergencias pendientes.',
  'Diligencia el reporte de fin de turno.',
  'Genera el Informe por Turno de su estación.'],
  array[true, true, true, true, false]);
perform _cargar_criterios('RI', array['bombero'], array[
  'Consulta «Mis turnos» y confirma su asignación.',
  'Hace el chequeo de HEAs y reporta la novedad del caso con fotos.',
  'Registra en la bitácora la emergencia del caso (despacho y regreso).'],
  array[false, true, true]);
perform _cargar_criterios('RI', array['bombero_maquinista'], array[
  'Consulta «Mis turnos» y confirma su asignación.',
  'Hace el chequeo vehicular y reporta la falla del caso con fotos.',
  'Registra en la bitácora la emergencia del caso (despacho y regreso de la máquina).'],
  array[false, true, true]);
perform _cargar_criterios('RI', array['guardia_permanente'], array[
  'Consulta «Mis turnos» y confirma su asignación.',
  'Registra en la bitácora el recibo y la entrega de guardia.',
  'Registra el ingreso de externos con la plantilla correcta.'],
  array[false, true, true]);
perform _cargar_criterios('RI', array['mant_vehicular'], array[
  'Acepta la novedad del vehículo generada en el chequeo.',
  'Registra el mantenimiento (tipo y lugar) y sus avances.',
  'Marca la novedad resuelta para aprobación del supervisor.'],
  array[true, true, true]);
perform _cargar_criterios('RI', array['profesional_supervisor'], array[
  'Revisa los avances del mantenimiento del caso.',
  'Aprueba el retorno a operativo o rechaza con motivo.'],
  array[true, true]);
perform _cargar_criterios('RI', array['mant_locativo'], array[
  'Programa la visita de la novedad locativa del caso.',
  'Registra la intervención y los avances con fotos.',
  'Cierra como «Resuelto» con nota y evidencia.'],
  array[true, false, true]);
perform _cargar_criterios('RI', array['mant_heas'], array[
  'Diagnostica la novedad de HEA remitida.',
  'Registra los avances de la reparación.',
  'Cierra como reparada o la remite a Almacén si no se pudo reparar.'],
  array[true, false, true]);
perform _cargar_criterios('RI', array['almacenista'], array[
  'Atiende la novedad remitida a Almacén.',
  'Carga la denuncia si el caso es pérdida o hurto.',
  'Registra la baja y la reposición del elemento.'],
  array[false, true, true]);
perform _cargar_criterios('RI', array['coord_cf'], array[
  'Consulta qué compañía está de turno.',
  'Crea la actividad de formación para el personal disponible.',
  'Aprueba las inscripciones o verifica las aceptaciones.'],
  array[false, true, true]);
perform _cargar_criterios('RI', array['bombero_cf'], array[
  'Registra en la bitácora del turno sus anotaciones.',
  'Registra la actividad o el préstamo del Centro de Formación.',
  'Cierra y firma la bitácora sin emergencias pendientes.'],
  array[false, true, true]);
perform _cargar_criterios('RI', array['coord_sh'], array[
  'Planea la actividad de Seguridad Humana para la compañía de turno.',
  'Marca los tipos de actividad del turno.'],
  array[true, true]);
perform _cargar_criterios('RI', array['lider_compania'], array[
  'Asigna vehículo y personal, y guarda los cambios.',
  'Revisa las actividades diligenciadas en «Ver resumen».',
  'Cierra el informe de Seguridad Humana.'],
  array[true, false, true]);
perform _cargar_criterios('RI', array['bombero_sh'], array[
  'Diligencia «Mi Actividad» con datos, dirección y fotos.',
  'Registra sus anotaciones en la bitácora del turno.',
  'Cierra y firma la bitácora cuando le corresponde.'],
  array[true, false, true]);
perform _cargar_criterios('RI', array['secretaria'], array[
  'Carga en Validación las novedades del período del caso.',
  'Aprueba o rechaza con motivo para pago.',
  'Consulta y descarga una bitácora cerrada del turno.'],
  array[true, true, false]);
perform _cargar_criterios('RI', array['subdirector'], array[
  'Sigue en «Reporte por Estación» qué estaciones reportaron.',
  'Consulta la bitácora cerrada del turno en el Archivo.',
  'Interpreta el estado del turno a partir de los reportes.'],
  array[true, false, true]);
perform _cargar_criterios('RI', array['lider_programa'], array[
  'Consulta el estado de los vehículos del turno.',
  'Consulta el avance de la novedad de HEA del caso.',
  'Ubica su actividad de formación asignada.'],
  array[true, true, false]);
perform _cargar_criterios('RI', array['lider_proyecto'], array[
  'Consulta las novedades de HEA del turno y su estado.',
  'Consulta las novedades de personal del turno.',
  'Interpreta los reportes del turno para su proyecto.'],
  array[true, true, false]);
end $$;

-- ───────── Cuestionarios ─────────
do $$
declare c uuid;
begin
  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M01', 'Equipo preparado', 'Borrador por validar. 8 preguntas sobre la programación y el cierre del turno.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Cuál es el personal mínimo de un turno?',
    'El mínimo es 1 Jefe de Estación, 1 Maquinista y 5 Bomberos Operativos.',
    array['1 Jefe de Estación y 3 Bomberos', '1 Jefe de Estación, 1 Maquinista y 5 Bomberos Operativos', '2 Maquinistas y 4 Bomberos', 'No hay mínimo'], 2);
  perform _cargar_pregunta(c, 2, '¿Se pueden crear dos turnos para la misma compañía y la misma fecha?',
    'No: BEL no permite dos turnos para la misma compañía y fecha.',
    array['Sí, si son de estaciones distintas', 'Sí, el segundo reemplaza al primero', 'No, el sistema no lo permite', 'Solo el Administrador puede'], 3);
  perform _cargar_pregunta(c, 3, 'Al asignar personal, una persona aparece deshabilitada. ¿Por qué?',
    'Quien tiene una novedad aprobada ese día aparece deshabilitado al asignar.',
    array['Tiene una novedad aprobada ese día', 'No ha cambiado su contraseña', 'Pertenece a otra estación', 'Ya trabajó el turno anterior'], 1);
  perform _cargar_pregunta(c, 4, 'Moviste personal en el Panel Operativo. ¿Qué falta para que el cambio quede?',
    'Los movimientos del Panel Operativo se hacen efectivos con «Publicar cambios».',
    array['Nada, se guarda solo', 'Cerrar sesión', 'Pulsar «Publicar cambios»', 'Enviar un correo al Subcomandante'], 3);
  perform _cargar_pregunta(c, 5, '¿Quién aprueba el reporte de cada estación y firma y cierra el turno?',
    'El Subcomandante (o el Administrador) aprueba en el Consolidado General y pulsa «Firmar y Cerrar Turno».',
    array['El Encargado de Estación', 'El Subcomandante (o el Administrador)', 'El Bombero Maquinista', 'La Secretaria'], 2);
  perform _cargar_pregunta(c, 6, '¿Qué pasa después de «Firmar y Cerrar Turno»?',
    'Un turno cerrado no admite cambios.',
    array['Se puede editar durante 24 horas', 'Ya no admite cambios', 'Se borra la programación', 'Pasa a estado borrador'], 2);
  perform _cargar_pregunta(c, 7, '¿Qué ve un Bombero en Control Turnos?',
    'Los mandos ven la vista completa; el Encargado de Estación su estación; el bombero solo «Mis turnos».',
    array['La programación de todas las compañías', 'Solo «Mis turnos»', 'El Consolidado General', 'Nada, no tiene acceso'], 2);
  perform _cargar_pregunta(c, 8, '¿Qué reportes entrega el Encargado de Estación durante el turno?',
    'El Encargado de Estación entrega el reporte de inicio y el de fin de turno de su estación.',
    array['Solo el informe de nómina', 'El reporte de inicio y el de fin de turno', 'El consolidado firmado', 'Ninguno'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M03', 'Flota lista', 'Borrador por validar. 8 preguntas sobre chequeo, mantenimiento y préstamos de vehículos.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Qué pasa cuando marcas «Falla» en un punto del chequeo vehicular?',
    'Cada falla del chequeo crea automáticamente una novedad del vehículo y avisa a los destinatarios.',
    array['Nada, hay que llamar al taller', 'Se crea automáticamente una novedad del vehículo', 'El vehículo se da de baja', 'Se cierra el turno'], 2);
  perform _cargar_pregunta(c, 2, 'Estás haciendo el chequeo y se cae el internet de la estación. ¿Qué pasa?',
    'El chequeo funciona sin conexión y se envía al volver la red.',
    array['Se pierde todo lo marcado', 'Debes empezar de nuevo mañana', 'Sigue funcionando y se envía al volver la red', 'Lo debe hacer el Subcomandante'], 3);
  perform _cargar_pregunta(c, 3, '¿Cuándo se puede hacer el chequeo vehicular?',
    'Solo dentro del horario de inicio y fin de turno configurado.',
    array['A cualquier hora', 'Solo dentro del horario de inicio y fin de turno configurado', 'Solo los lunes', 'Cuando lo autorice el supervisor'], 2);
  perform _cargar_pregunta(c, 4, 'Mantenimiento Vehicular marca la novedad como resuelta. ¿En qué estado queda?',
    'Queda «Pendiente Aprobación Supervisor» hasta que el Profesional Supervisor dé el visto bueno.',
    array['Cerrada', 'Pendiente Aprobación Supervisor', 'Rechazada', 'Remitida a Almacén'], 2);
  perform _cargar_pregunta(c, 5, '¿Quién da el visto bueno final para que el vehículo vuelva a operar?',
    'El Profesional Supervisor aprueba el retorno a operativo o lo devuelve con motivo.',
    array['El Bombero Maquinista', 'El Profesional Supervisor', 'El Encargado de Estación', 'El Almacenista'], 2);
  perform _cargar_pregunta(c, 6, 'Un vehículo queda fuera de servicio. ¿Qué hacen el Subcomandante o el Encargado Operativo?',
    'Asignan un vehículo de reemplazo mientras el vehículo está fuera de servicio.',
    array['Esperan a que lo reparen', 'Asignan un vehículo de reemplazo', 'Cancelan el turno', 'Lo reportan en Novedades Locativas'], 2);
  perform _cargar_pregunta(c, 7, '¿Quién aprueba el préstamo de un vehículo a otra estación?',
    'La estación dueña (Encargado de Estación o Subcomandante) lo aprueba o rechaza en «PENDIENTES».',
    array['Quien lo solicita', 'La estación dueña, en la pestaña «PENDIENTES»', 'El Profesional Supervisor', 'Nadie, es automático'], 2);
  perform _cargar_pregunta(c, 8, '¿Qué hace «Consolidar Turno»?',
    'Genera el PDF del turno y lo remite al Subcomando.',
    array['Cierra la nómina', 'Genera el PDF del turno y lo remite al Subcomando', 'Borra las novedades resueltas', 'Asigna el personal'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M04', 'Equipos bajo control', 'Borrador por validar. 8 preguntas sobre la ruta de una novedad de HEAs.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Qué contenedores aparecen en tu chequeo de HEAs?',
    'Solo aparecen los contenedores (máquinas o bodegas) de su estación.',
    array['Todos los de la ciudad', 'Solo los de su estación', 'Solo los que tienen fallas', 'Los que elija el Almacenista'], 2);
  perform _cargar_pregunta(c, 2, 'Un ítem ya tiene una novedad abierta y encuentras otra falla. ¿Qué pasa?',
    'La nueva falla se suma a esa misma novedad abierta.',
    array['Se crea una novedad nueva aparte', 'La nueva falla se suma a la misma novedad', 'No se puede reportar', 'Se cierra la novedad anterior'], 2);
  perform _cargar_pregunta(c, 3, '¿Quién decide si una novedad de HEA procede y a dónde se escala?',
    'El Encargado de Estación, el Encargado Operativo o el Subcomandante (y el Administrador) deciden y escalan.',
    array['El bombero que la reportó', 'Un mando: Encargado de Estación, Encargado Operativo o Subcomandante', 'El Líder de Proyecto', 'El sistema, automáticamente'], 2);
  perform _cargar_pregunta(c, 4, 'Al escalar una novedad, ¿qué se define?',
    'Se elige el destino (Mantenimiento HEA''S o Almacén), la prioridad y una nota.',
    array['Solo la fecha', 'Destino, prioridad y nota', 'El valor del elemento', 'El turno de reposición'], 2);
  perform _cargar_pregunta(c, 5, 'Una herramienta se perdió por hurto. ¿Qué se hace antes de registrar la baja?',
    'Si la baja es por pérdida o hurto, primero se carga la denuncia de Fiscalía.',
    array['Nada, se da de baja de inmediato', 'Cargar la denuncia de Fiscalía', 'Pedir permiso al Subdirector', 'Reportarla en Novedades Locativas'], 2);
  perform _cargar_pregunta(c, 6, 'Mantenimiento HEA''S no logra reparar el elemento. ¿Qué sigue?',
    'Se remite a Almacén por reintegro, donde se registra la baja y la reposición.',
    array['Se devuelve al contenedor así', 'Se remite a Almacén por reintegro', 'Se rechaza la novedad', 'Se cierra como resuelta'], 2);
  perform _cargar_pregunta(c, 7, '¿Qué pasa con una novedad rechazada?',
    'Una novedad rechazada se puede reabrir.',
    array['Se borra', 'Se puede reabrir', 'Pasa a nómina', 'Bloquea el contenedor'], 2);
  perform _cargar_pregunta(c, 8, '¿Cuáles son las pestañas de estado de las novedades de HEAs?',
    'Pendientes · Remitidas · En mantenimiento · Resueltas · Rechazadas.',
    array['Abiertas y cerradas', 'Pendientes, Remitidas, En mantenimiento, Resueltas y Rechazadas', 'Nuevas y antiguas', 'Por estación y por compañía'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M05', 'Estaciones en condiciones', 'Borrador por validar. 8 preguntas sobre el reporte y la intervención locativa.') returning id into c;
  perform _cargar_pregunta(c, 1, 'Vas a reportar un daño y ya existe una novedad igual para la estación. ¿Qué hace BEL?',
    'El sistema avisa si ya existe una novedad igual para esa estación, para no duplicar el reporte.',
    array['La reemplaza', 'Avisa que ya existe una igual', 'La envía dos veces', 'Bloquea la estación'], 2);
  perform _cargar_pregunta(c, 2, '¿Qué datos lleva una «Nueva Novedad» locativa?',
    'Estación, instalación, tipo, compañía, ubicación, fecha y hora de detección, y fotos.',
    array['Solo una descripción', 'Estación, instalación, tipo, compañía, ubicación, fecha y hora de detección y fotos', 'El presupuesto de la reparación', 'El nombre del contratista'], 2);
  perform _cargar_pregunta(c, 3, '¿Quién gestiona la intervención de una novedad locativa?',
    'El Encargado de Mantenimiento Locativo programa, interviene y cierra.',
    array['El Encargado de Estación', 'El Encargado de Mantenimiento Locativo', 'El Almacenista', 'El Profesional Supervisor'], 2);
  perform _cargar_pregunta(c, 4, 'Después de abrir la novedad, ¿qué programa primero el Encargado de Mantenimiento Locativo?',
    'En «Programación» fija la fecha de la visita.',
    array['La fecha de la visita', 'El cierre', 'La baja del inmueble', 'El turno del personal'], 1);
  perform _cargar_pregunta(c, 5, '¿Cómo se clasifica la intervención?',
    'Preventiva o correctiva, con una prioridad.',
    array['Urgente o normal', 'Preventiva o correctiva, con prioridad', 'Interna o de Fiscalía', 'No se clasifica'], 2);
  perform _cargar_pregunta(c, 6, '¿Qué se necesita para cerrar la novedad como «Resuelto»?',
    'Se cierra con una nota y evidencia (fotos).',
    array['La firma del Subdirector', 'Una nota y evidencia', 'Nada', 'Un correo al Administrador'], 2);
  perform _cargar_pregunta(c, 7, '¿Quién puede eliminar una novedad locativa?',
    'Solo el Administrador elimina novedades locativas.',
    array['Quien la creó', 'Solo el Administrador', 'Cualquier mando', 'El Encargado de Mantenimiento Locativo'], 2);
  perform _cargar_pregunta(c, 8, '¿Quién recibe el aviso de una nueva novedad locativa?',
    'Llega a quienes el Administrador configuró en Notificaciones.',
    array['Todos los usuarios', 'Quienes el Administrador configuró en Notificaciones', 'Solo el Subcomandante', 'Nadie'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M06', 'El turno queda registrado', 'Borrador por validar. 8 preguntas sobre la bitácora del turno.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Qué se necesita para operar la bitácora del turno?',
    'Estar en un equipo autorizado (Gestionar Hardware) y estar asignado al turno, salvo Administrador y Subcomandante.',
    array['Solo tener usuario', 'Equipo autorizado y estar asignado al turno', 'Permiso del Subdirector', 'Conexión de fibra óptica'], 2);
  perform _cargar_pregunta(c, 2, 'Sin conexión puedes seguir anotando. ¿Qué acción sí requiere conexión?',
    'La minuta se sincroniza al volver la red, pero cerrar y firmar sí requiere conexión.',
    array['Agregar una anotación', 'Cerrar y firmar la bitácora', 'Registrar un relevo', 'Ninguna'], 2);
  perform _cargar_pregunta(c, 3, '¿Cómo se registra una emergencia en la bitácora?',
    'Se registra el despacho al salir y, al regresar, se completa esa misma anotación con el regreso de la máquina.',
    array['Solo al regresar', 'Despacho al salir y regreso en la misma anotación', 'En una bitácora aparte', 'No se registra'], 2);
  perform _cargar_pregunta(c, 4, '¿Quién puede completar el regreso de una emergencia?',
    'Solo quien creó la anotación de la emergencia puede completarla.',
    array['Cualquier persona del turno', 'Solo quien creó la anotación', 'El Subdirector', 'La Secretaria'], 2);
  perform _cargar_pregunta(c, 5, '¿Qué roles anotan pero NO cierran la bitácora?',
    'Bombero, Maquinista y Guardia anotan pero no cierran.',
    array['Encargado de Estación y Encargado Operativo', 'Bombero, Bombero Maquinista y Guardia Permanente', 'Bombero SH y Bombero CF', 'Subcomandante'], 2);
  perform _cargar_pregunta(c, 6, '¿Qué se verifica antes de cerrar la bitácora?',
    'Que no queden emergencias pendientes de completar con el regreso.',
    array['Que no queden emergencias pendientes', 'Que todos hayan almorzado', 'Que la nómina esté cerrada', 'Nada'], 1);
  perform _cargar_pregunta(c, 7, 'Nadie cerró la bitácora. ¿Qué pasa?',
    'El sistema la cierra al terminar el turno. Una bitácora cerrada no se reabre.',
    array['Queda abierta para siempre', 'El sistema la cierra al terminar el turno', 'Se borra', 'Pasa al turno siguiente'], 2);
  perform _cargar_pregunta(c, 8, '¿Dónde se consultan las bitácoras de turnos anteriores?',
    'En el Archivo de Bitácoras: se filtra por estación, compañía, año y mes y se descarga el PDF.',
    array['En Control Turnos', 'En el Archivo de Bitácoras', 'En Gestión de Nómina', 'No se pueden consultar'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M07', 'Conocimiento en marcha', 'Borrador por validar. 8 preguntas sobre actividades del Centro de Formación.') returning id into c;
  perform _cargar_pregunta(c, 1, '«Participante», «Instructor» y «Coordinador del curso» son…',
    'Son papeles dentro de cada actividad, no roles del sistema.',
    array['Roles del sistema que asigna el Administrador', 'Papeles dentro de cada actividad', 'Cargos del Cuerpo de Bomberos', 'Tipos de convocatoria'], 2);
  perform _cargar_pregunta(c, 2, '¿Cuáles son los pasos para crear una actividad?',
    'Paso 1 Información, Paso 2 Asignación y Paso 3 Confirmación.',
    array['Información, Asignación y Confirmación', 'Inscripción y pago', 'Solo elegir la fecha', 'Asignación y cierre'], 1);
  perform _cargar_pregunta(c, 3, 'No puedes asistir a una fecha asignada. ¿Qué haces?',
    'Rechazas la fecha escribiendo el motivo; el coordinador recibe el aviso.',
    array['No hago nada', 'La rechazo escribiendo el motivo', 'Le pido a un compañero que vaya', 'Borro la actividad'], 2);
  perform _cargar_pregunta(c, 4, 'Cambió el horario de una fecha que ya habías aceptado. ¿Qué debes hacer?',
    'Si cambia el horario, el asignado debe confirmar de nuevo.',
    array['Nada', 'Confirmar de nuevo', 'Inscribirte otra vez desde cero', 'Llamar al Subcomandante'], 2);
  perform _cargar_pregunta(c, 5, '¿Hasta cuándo se pueden cargar las evidencias de una actividad?',
    'Las evidencias se cargan hasta 7 días después de la actividad.',
    array['Solo el mismo día', 'Hasta 7 días después', 'Hasta fin de año', 'No hay plazo'], 2);
  perform _cargar_pregunta(c, 6, 'Una persona tiene una novedad aprobada en la fecha de la actividad. ¿Qué pasa?',
    'Quien tiene una novedad aprobada en la fecha no aparece como elegible.',
    array['Se le asigna igual', 'No aparece como elegible', 'Se cancela la actividad', 'Se le descuenta de nómina'], 2);
  perform _cargar_pregunta(c, 7, 'El coordinador cancela o reprograma una actividad. ¿Quiénes se enteran?',
    'Se avisa por correo al coordinador del curso, a los instructores y a los participantes.',
    array['Nadie', 'Coordinador del curso, instructores y participantes, por correo', 'Solo el Administrador', 'Solo los instructores'], 2);
  perform _cargar_pregunta(c, 8, 'Eres responsable de un préstamo del Centro y vas a devolverlo. ¿Qué es obligatorio?',
    'En la devolución de un préstamo, si usted es responsable, la foto es obligatoria.',
    array['Una carta firmada', 'La foto de la devolución', 'Pagar una multa', 'Nada'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M08', 'Misión coordinada', 'Borrador por validar. 8 preguntas sobre planeación, ejecución y cierre de Seguridad Humana.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Qué días se pueden elegir al planear una actividad de Seguridad Humana?',
    'Solo días en que la compañía tiene turno; una planeación por compañía y fecha.',
    array['Cualquier día', 'Solo días en que la compañía tiene turno', 'Solo fines de semana', 'Los que elija el bombero'], 2);
  perform _cargar_pregunta(c, 2, '¿Cuándo sale el correo de asignación al personal?',
    'Sale solo al pulsar «Guardar cambios» y solo a los nuevos asignados.',
    array['Apenas se elige a la persona', 'Al pulsar «Guardar cambios», solo a los nuevos asignados', 'Al cerrar el informe', 'Nunca'], 2);
  perform _cargar_pregunta(c, 3, '¿Quién asigna el vehículo y el personal de la actividad?',
    'El Líder de Compañía asigna vehículo DAGRD o placa especial, personal y encargado de evidencias.',
    array['El Coordinador de Seguridad Humana', 'El Líder de Compañía', 'El Bombero Seguridad Humana', 'El Subdirector'], 2);
  perform _cargar_pregunta(c, 4, 'Al diligenciar la dirección en «Mi Actividad», ¿qué hace el sistema?',
    'El sistema da el barrio y la comuna a partir de la dirección.',
    array['Nada', 'Asigna el barrio y la comuna', 'Calcula la nómina', 'Envía la actividad a Fiscalía'], 2);
  perform _cargar_pregunta(c, 5, '¿Quién puede posponer una actividad?',
    'Posponer: Coordinador SH y Administrador. Cancelar: Líder, Coordinador y Administrador.',
    array['Cualquier bombero', 'El Coordinador de Seguridad Humana y el Administrador', 'Solo el Líder de Compañía', 'El Subcomandante'], 2);
  perform _cargar_pregunta(c, 6, 'Una actividad diligenciada no está completa. ¿Qué hace el Líder de Compañía?',
    'En «Ver resumen» solicita mejora y el Bombero SH la corrige.',
    array['La cierra igual', 'Solicita mejora', 'La borra', 'La reasigna a otra compañía'], 2);
  perform _cargar_pregunta(c, 7, '¿Qué pasa al cerrar el informe de Seguridad Humana?',
    'Entra al Informe por Turno y llega un correo al Coordinador SH y al Subcomandante.',
    array['Se borra la planeación', 'Entra al Informe por Turno y se avisa por correo', 'Se reabre automáticamente', 'Pasa a nómina'], 2);
  perform _cargar_pregunta(c, 8, '¿Qué se necesita para descargar el informe en Word o PDF?',
    'Para descargar se necesita la firma registrada.',
    array['Ser Administrador', 'Tener la firma registrada', 'Conexión desde la estación', 'Nada'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M09', 'Precisión en cada cálculo', 'Borrador por validar. 8 preguntas sobre la validación y liquidación de la quincena.') returning id into c;
  perform _cargar_pregunta(c, 1, 'Aprobaste o rechazaste una novedad en Validación. ¿Se puede deshacer?',
    'Aprobar o rechazar en Validación es definitivo.',
    array['Sí, en cualquier momento', 'No, es definitivo', 'Solo el mismo día', 'Sí, cerrando el período'], 2);
  perform _cargar_pregunta(c, 2, '¿Se puede reabrir un período cerrado desde la aplicación?',
    'Un período cerrado no se puede reabrir desde la aplicación: es irreversible.',
    array['Sí, con «Reabrir»', 'No, cerrar es irreversible', 'Sí, el Subcomandante', 'Solo en diciembre'], 2);
  perform _cargar_pregunta(c, 3, '¿Qué hace «Generar año»?',
    'Crea de una vez todas las quincenas del año.',
    array['Cierra el año', 'Crea de una vez todas las quincenas del año', 'Paga las primas', 'Borra los períodos anteriores'], 2);
  perform _cargar_pregunta(c, 4, 'Además de Secretaría y el Administrador, ¿quién puede crear reglas de calendario?',
    'El Subcomandante también puede crear reglas de calendario (recargos por día, franja o festivo).',
    array['El Bombero', 'El Subcomandante', 'El Encargado de Estación', 'Nadie más'], 2);
  perform _cargar_pregunta(c, 5, '¿Cómo se cargan las novedades en Validación?',
    'Se cargan las novedades del período por compañía: A, B y C.',
    array['Todas juntas sin filtro', 'Por compañía: A, B y C', 'Por persona, una a una', 'Por estación únicamente'], 2);
  perform _cargar_pregunta(c, 6, '¿Qué exige un ajuste masivo de horas?',
    'El ajuste masivo de horas se registra con un motivo.',
    array['Un motivo', 'La firma del Subdirector', 'Cerrar el período', 'Nada'], 1);
  perform _cargar_pregunta(c, 7, '¿Qué reportes se descargan después de guardar la nómina?',
    'Reportes de Nómina u Horas a compensar, y la descarga de cronograma + SCAT.',
    array['Solo el informe por turno', 'Nómina u Horas a compensar, y cronograma + SCAT', 'La bitácora del turno', 'El inventario de HEAs'], 2);
  perform _cargar_pregunta(c, 8, '¿Cuál es el orden correcto del ciclo de la quincena?',
    'Validación → ajustes → exportar → Guardar Nómina → reportes → cerrar período.',
    array['Cerrar período → Validación → Guardar', 'Validación → ajustes → Guardar Nómina → reportes → cerrar período', 'Reportes → Validación → cerrar', 'Guardar → cerrar → Validación'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M10', 'Cierre documentado', 'Borrador por validar. 8 preguntas sobre el informe oficial del turno.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Qué fechas se pueden elegir en Informe por Turno?',
    'Solo se habilitan fechas con turno.',
    array['Cualquier fecha', 'Solo fechas con turno', 'Solo la de hoy', 'Solo fines de mes'], 2);
  perform _cargar_pregunta(c, 2, 'Generas el informe sin firma registrada. ¿Qué pasa?',
    'Sin firma registrada el PDF sale «Pendiente de firma digital».',
    array['No se genera nada', 'El PDF sale «Pendiente de firma digital»', 'Se firma con la firma del Subcomandante', 'Se bloquea tu usuario'], 2);
  perform _cargar_pregunta(c, 3, '¿De qué estación genera el informe el Encargado de Estación?',
    'El Encargado de Estación genera siempre el de su propia estación.',
    array['De cualquier estación', 'Siempre de su propia estación', 'Solo de la estación central', 'De ninguna'], 2);
  perform _cargar_pregunta(c, 4, '¿Qué contiene el informe oficial del turno?',
    'Asistencia, casos atendidos, novedades y el resumen de Seguridad Humana.',
    array['Solo la asistencia', 'Asistencia, casos atendidos, novedades y resumen de Seguridad Humana', 'La nómina de la quincena', 'El inventario de vehículos'], 2);
  perform _cargar_pregunta(c, 5, '¿Qué debe pasar para que el resumen de Seguridad Humana aparezca en el informe?',
    'El Líder de Compañía debe haber cerrado el informe de Seguridad Humana.',
    array['Nada, aparece siempre', 'El Líder de Compañía debe cerrar el informe de Seguridad Humana', 'La Secretaria debe aprobarlo', 'Debe pasar una semana'], 2);
  perform _cargar_pregunta(c, 6, '¿Cuál es el primer paso para generar el informe?',
    'Seleccionar «Compañía» y «Estación», luego la fecha del turno.',
    array['Firmar', 'Seleccionar «Compañía» y «Estación»', 'Cerrar la bitácora', 'Exportar a Excel'], 2);
  perform _cargar_pregunta(c, 7, '¿Para qué sirve la «Vista previa»?',
    'Para revisar y validar la información antes de generar el PDF.',
    array['Para editar la asistencia', 'Para revisar la información antes de generar el PDF', 'Para firmar', 'No sirve para nada'], 2);
  perform _cargar_pregunta(c, 8, '¿Qué roles generan el informe de cualquier estación?',
    'Administrador, Subcomandante y Encargado Operativo; el Encargado de Estación solo el suyo.',
    array['Todos los bomberos', 'Administrador, Subcomandante y Encargado Operativo', 'Solo la Secretaria', 'Solo el Encargado de Estación'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M11', 'El sistema preparado', 'Borrador por validar. 8 preguntas sobre configuración, firma y formatos.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Qué acciones de Administración solo puede hacer el Administrador?',
    'Solo el Administrador elimina usuarios, configura Notificaciones y sube Formatos de novedades.',
    array['Registrar su firma', 'Eliminar usuarios, configurar Notificaciones y subir Formatos de novedades', 'Consultar catálogos', 'Ver su perfil'], 2);
  perform _cargar_pregunta(c, 2, '¿Cuándo aplican los cambios de permisos?',
    'Aplican de inmediato; los usuarios ven el menú nuevo al recargar.',
    array['Al día siguiente', 'De inmediato; el menú nuevo se ve al recargar', 'Al cerrar la quincena', 'Cuando el usuario cambie su contraseña'], 2);
  perform _cargar_pregunta(c, 3, 'Una estación no tiene equipo registrado en Gestionar Hardware. ¿Qué pasa?',
    'Sin un equipo registrado en Hardware, la bitácora de esa estación no se puede operar.',
    array['Nada', 'No se puede operar la bitácora de esa estación', 'No se pueden registrar novedades de personal', 'No se genera la nómina'], 2);
  perform _cargar_pregunta(c, 4, 'Al crear una estación, ¿qué se puede crear también?',
    'Al crear una estación se puede crear su bodega (contenedor) de HEAs.',
    array['Su bodega (contenedor) de HEAs', 'Su nómina', 'Su turno del año', 'Sus vehículos'], 1);
  perform _cargar_pregunta(c, 5, 'Cambiaste los roles de una persona. ¿Qué debe hacer ella?',
    'Debe cerrar sesión y volver a entrar.',
    array['Nada', 'Cerrar sesión y volver a entrar', 'Crear un usuario nuevo', 'Registrar de nuevo su firma'], 2);
  perform _cargar_pregunta(c, 6, '¿Dónde registra cada persona su firma digital?',
    'En Administración › Firmas Digitales.',
    array['En Mi Perfil › Contraseña', 'En Administración › Firmas Digitales', 'En Informe por Turno', 'La registra el Administrador por ella'], 2);
  perform _cargar_pregunta(c, 7, 'Además del Administrador y el Subcomandante, ¿quién mantiene el inventario de HEAs?',
    'El Encargado Operativo mantiene el inventario de HEAs.',
    array['El Almacenista', 'El Encargado Operativo', 'El Bombero', 'La Secretaria'], 2);
  perform _cargar_pregunta(c, 8, '¿Quién mantiene la hoja de vida de los vehículos, además del Administrador?',
    'El Encargado de Mantenimiento Vehicular mantiene la hoja de vida y los catálogos de la flota.',
    array['El Bombero Maquinista', 'El Encargado de Mantenimiento Vehicular', 'El Profesional Supervisor', 'El Encargado de Estación'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('RI', 'Mi turno en BEL', 'Borrador por validar. 8 preguntas sobre cómo se conectan los flujos del turno.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Cuál es el orden del turno simulado?',
    'Turno publicado → recursos verificados → turno documentado → novedad gestionada → cierre y consolidación.',
    array['Cierre → novedad → publicación', 'Publicado → recursos verificados → documentado → novedad gestionada → cierre', 'Nómina → bitácora → chequeo', 'No hay un orden'], 2);
  perform _cargar_pregunta(c, 2, 'El Maquinista marca una falla en el chequeo. ¿Qué sigue en el flujo?',
    'Se crea la novedad del vehículo, Mantenimiento Vehicular la gestiona y los mandos asignan un reemplazo si hace falta.',
    array['Nada hasta el siguiente turno', 'Novedad automática a Mantenimiento Vehicular y reemplazo por parte de los mandos', 'Se cierra el turno', 'Se avisa a Nómina'], 2);
  perform _cargar_pregunta(c, 3, 'Una novedad de personal queda aprobada. ¿Cómo afecta a otros módulos ese día?',
    'Bloquea a la persona en turnos, formación y Seguridad Humana.',
    array['No afecta nada', 'Bloquea a la persona en turnos, formación y Seguridad Humana', 'La saca de BEL', 'Cambia su rol'], 2);
  perform _cargar_pregunta(c, 4, 'Un bombero reporta una herramienta dañada. ¿Cuál es la ruta?',
    'Bombero reporta → mando decide y escala → Mantenimiento HEA''S repara o Almacén da de baja y repone.',
    array['Bombero → Almacén directamente', 'Bombero → mando decide y escala → Mantenimiento HEA''S o Almacén', 'Bombero → Secretaria', 'Bombero → Subdirector'], 2);
  perform _cargar_pregunta(c, 5, 'Sin firma digital registrada, ¿qué parte del cierre del turno se bloquea?',
    'Sin firma no se puede cerrar la bitácora, cerrar el consolidado ni descargar informes firmados.',
    array['Ninguna', 'Cerrar bitácora, cerrar el consolidado e informes firmados', 'Solo el chequeo vehicular', 'Solo la nómina'], 2);
  perform _cargar_pregunta(c, 6, 'La bitácora de una estación no abre porque el equipo no está autorizado. ¿Quién lo resuelve?',
    'El Administrador o el Subcomandante autorizan el equipo en Administración › Gestionar Hardware.',
    array['El Bombero', 'El Administrador o el Subcomandante, en Gestionar Hardware', 'El Profesional Supervisor', 'Nadie'], 2);
  perform _cargar_pregunta(c, 7, '¿Qué necesita el Informe por Turno para incluir Seguridad Humana?',
    'Que el Líder de Compañía haya cerrado el informe de Seguridad Humana de ese turno.',
    array['Que la Secretaria cierre la nómina', 'Que el Líder de Compañía cierre el informe de Seguridad Humana', 'Que el Maquinista haga el chequeo', 'Nada'], 2);
  perform _cargar_pregunta(c, 8, '¿Cómo llegan las novedades aprobadas a la nómina?',
    'La Secretaria las carga y valida en la quincena antes de guardar la nómina.',
    array['Se pagan solas', 'La Secretaria las carga y valida en la quincena', 'El Bombero las envía por correo', 'El Encargado de Estación las liquida'], 2);
end $$;
