import type { Modulo } from './types'

// Fuente: Plan de Formación BEL + Mapa de Flujos BEL + documento "Operación BEL".
// Los textos de misión son la propuesta gamificada; los nombres y reglas son los de BEL.

export const ORDEN_FORMACION = ['M00', 'M02', 'M06', 'M01', 'M03', 'M04', 'M05', 'M07', 'M08', 'M09', 'M10', 'M11', 'RI']

export const MODULOS: Record<string, Modulo> = {
  M00: {
    codigo: 'M00', nombre: 'Ingreso y Dashboard', mision: 'Activación: acceso listo', lema: 'Todo turno comienza con preparación',
    ubicacion: 'Pantalla de ingreso › Dashboard', modalidad: 'Híbrida', duracionH: 1.5, tipo: 'Capacitación', insignia: 'Acceso habilitado',
    objetivo: 'Ingresar a BEL, reconocer el Dashboard de tu rol, configurar el perfil y registrar la firma digital.',
    reto: 'Acceder sin ayuda, recuperar la contraseña si es necesario, ubicar las acciones rápidas y completar la configuración requerida.',
    victoria: 'Acceso funcional, navegación autónoma y firma digital registrada.',
    reglas: [
      'La sesión se cierra sola tras 5 minutos sin actividad.',
      'Contraseña de 8 a 15 caracteres con mayúscula, minúscula, número y símbolo.',
      'Sin firma registrada no se puede cerrar bitácora ni descargar informes firmados.',
    ],
  },
  M01: {
    codigo: 'M01', nombre: 'Control de Turnos', mision: 'Equipo preparado', lema: 'Cada turno, un equipo completo',
    ubicacion: 'Gestión de Novedades › Control Turnos', modalidad: 'Presencial', duracionH: 2, tipo: 'Entrenamiento', insignia: 'Turno coordinado',
    objetivo: 'Preparar, consultar o cerrar un turno de 24 horas de acuerdo con las funciones de tu rol.',
    reto: 'Mandos: crear un turno simulado, asignar personal y puestos, revisar restricciones y publicar cambios. Personal de línea: consultar «Mis turnos».',
    victoria: 'Turno consistente con las reglas del sistema; quien consulta demuestra que encuentra su programación.',
    reglas: [
      'Personal mínimo: 1 Jefe de Estación, 1 Maquinista y 5 Bomberos Operativos.',
      'No puede haber dos turnos para la misma compañía y fecha.',
      'Después de «Firmar y Cerrar Turno» no se admiten cambios.',
    ],
  },
  M02: {
    codigo: 'M02', nombre: 'Novedades de Personal', mision: 'Cada dato cuenta', lema: 'Una novedad bien registrada evita errores en cadena',
    ubicacion: 'Gestión de Novedades › Personal', modalidad: 'Híbrida', duracionH: 2, tipo: 'Entrenamiento', insignia: 'Gestión precisa',
    objetivo: 'Registrar, aprobar o consultar novedades de personal según tus permisos.',
    reto: 'Registrar una novedad con sus fechas y soportes; los mandos aprueban o rechazan con motivo.',
    victoria: 'Registro completo y, cuando corresponda, aprobación o rechazo correctamente ejecutado.',
    reglas: [
      'Incapacidad, calamidad doméstica y muerte se registran como turno completo de 24 h.',
      'El rechazo exige escribir el motivo.',
      'Una novedad aprobada bloquea a la persona en turnos, formación y Seguridad Humana ese día.',
    ],
  },
  M03: {
    codigo: 'M03', nombre: 'Novedades de Vehículos', mision: 'Flota lista', lema: 'Sin vehículos listos no hay respuesta',
    ubicacion: 'Gestión de Novedades › Vehículos', modalidad: 'Presencial', duracionH: 2, tipo: 'Entrenamiento', insignia: 'Control de flota',
    objetivo: 'Mantener la flota del turno en condiciones mediante chequeos, novedades y mantenimiento.',
    reto: 'Completar un chequeo simulado, reportar una falla, gestionar su remisión y validar el cierre del mantenimiento cuando corresponda.',
    victoria: 'Cada actor completa su parte del flujo sin omitir validaciones.',
    reglas: [
      'El chequeo solo se hace dentro del horario de turno configurado.',
      'Cada falla del chequeo crea automáticamente una novedad.',
      'El chequeo funciona sin conexión y se envía al volver la red.',
    ],
  },
  M04: {
    codigo: 'M04', nombre: "Novedades de HEA's", mision: 'Equipos bajo control', lema: 'Cada herramienta cuenta',
    ubicacion: 'Gestión de Novedades › HEAs', modalidad: 'Presencial', duracionH: 2, tipo: 'Entrenamiento', insignia: 'Equipamiento controlado',
    objetivo: 'Detectar y gestionar novedades de herramientas, equipos y accesorios hasta su reparación o reposición.',
    reto: 'Documentar una novedad en un equipo simulado y seguir la ruta de decisión, diagnóstico, reparación, baja o reposición.',
    victoria: 'La novedad llega al estado correcto con la intervención de los actores correspondientes.',
    reglas: [
      'Si el ítem ya tiene una novedad abierta, la nueva falla se suma a ella.',
      'Una baja por pérdida o hurto requiere primero la denuncia de Fiscalía.',
    ],
  },
  M05: {
    codigo: 'M05', nombre: 'Novedades Locativas', mision: 'Estaciones en condiciones', lema: 'Una estación cuidada protege al equipo',
    ubicacion: 'Gestión de Novedades › Locativas', modalidad: 'Virtual', duracionH: 1, tipo: 'Capacitación', insignia: 'Estación en seguimiento',
    objetivo: 'Reportar y gestionar necesidades de infraestructura de las estaciones.',
    reto: 'Registrar una necesidad sin duplicar un reporte existente, revisar la programación y comprobar cómo se documenta la solución.',
    victoria: 'Reporte completo y, para mantenimiento, cierre con la evidencia prevista.',
    reglas: ['El sistema avisa si ya existe una novedad igual para esa estación.', 'Solo el Administrador elimina novedades locativas.'],
  },
  M06: {
    codigo: 'M06', nombre: 'Minuta Digital', mision: 'El turno queda registrado', lema: 'Lo que no se registra, no ocurrió',
    ubicacion: 'Minuta Digital › Bitácora Diaria', modalidad: 'Presencial', duracionH: 2, tipo: 'Entrenamiento', insignia: 'Bitácora confiable',
    objetivo: 'Llevar el libro de guardia del turno: anotaciones, emergencias y cierre con firma.',
    reto: 'Hacer anotaciones con las plantillas, registrar una emergencia simulada y verificar pendientes antes del cierre.',
    victoria: 'Minuta correctamente diligenciada y, para el rol autorizado, cierre y firma completados.',
    reglas: [
      'Solo opera desde un equipo autorizado.',
      'Una bitácora cerrada no se reabre.',
      'Bombero, Maquinista y Guardia anotan pero no cierran.',
    ],
  },
  M07: {
    codigo: 'M07', nombre: 'Centro de Formación', mision: 'Conocimiento en marcha', lema: 'Aprender también es parte del turno',
    ubicacion: 'Centro de Formación', modalidad: 'Híbrida', duracionH: 2, tipo: 'Capacitación', insignia: 'Aprendizaje activo',
    objetivo: 'Gestionar o participar en actividades de formación según tu rol.',
    reto: 'Crear o gestionar una actividad, aceptar una convocatoria o inscribirse, y reconocer los requisitos de asistencia y evidencias.',
    victoria: 'El coordinador completa el flujo de la actividad y los participantes ejecutan sus acciones.',
    reglas: ['Las evidencias se cargan hasta 7 días después de la actividad.', 'Si cambia el horario, el asignado debe confirmar de nuevo.'],
  },
  M08: {
    codigo: 'M08', nombre: 'Seguridad Humana', mision: 'Misión coordinada', lema: 'Prevenir es parte de responder',
    ubicacion: 'Seguridad Humana', modalidad: 'Presencial', duracionH: 2, tipo: 'Entrenamiento', insignia: 'Actividad coordinada',
    objetivo: 'Planear, ejecutar y cerrar actividades de Seguridad Humana por compañía.',
    reto: 'Planear una actividad simulada, asignar recursos, registrar la ejecución y completar la revisión y el cierre del informe.',
    victoria: 'Cada rol completa su parte y el responsable autorizado finaliza el proceso.',
    reglas: ['Una planeación por compañía y fecha.', 'Al cerrar, el resultado entra al Informe por Turno.'],
  },
  M09: {
    codigo: 'M09', nombre: 'Gestión de Nómina', mision: 'Precisión en cada cálculo', lema: 'Cada hora trabajada, bien reconocida',
    ubicacion: 'Gestión de Nómina', modalidad: 'Presencial', duracionH: 3, tipo: 'Capacitación', insignia: 'Precisión administrativa',
    objetivo: 'Validar y liquidar la quincena reconociendo las acciones definitivas.',
    reto: 'Revisar un caso de nómina con datos de prueba, validar el período y reconocer las acciones irreversibles.',
    victoria: 'Ejercicio de validación y liquidación sin errores críticos.',
    reglas: ['Aprobar o rechazar en Validación es definitivo.', 'Un período cerrado no se puede reabrir.'],
  },
  M10: {
    codigo: 'M10', nombre: 'Informe por Turno', mision: 'Cierre documentado', lema: 'El turno termina cuando queda documentado',
    ubicacion: 'Informe por Turno', modalidad: 'Virtual', duracionH: 1, tipo: 'Capacitación', insignia: 'Cierre documental',
    objetivo: 'Generar el informe oficial del turno con firma.',
    reto: 'Seleccionar el turno simulado, revisar la vista previa, validar la información y generar el informe firmado.',
    victoria: 'Informe correcto, con firma registrada y estado verificado.',
    reglas: ['Solo se habilitan fechas con turno.', 'Sin firma registrada el PDF sale «Pendiente de firma digital».'],
  },
  M11: {
    codigo: 'M11', nombre: 'Administración', mision: 'El sistema preparado', lema: 'Un sistema bien configurado sostiene la operación',
    ubicacion: 'Administración', modalidad: 'Presencial', duracionH: 4, tipo: 'Transferencia', insignia: 'Gestión del sistema',
    objetivo: 'Realizar las tareas de configuración o firma que corresponden a tu rol.',
    reto: 'Validar la configuración de prueba de usuarios, roles, permisos, hardware e inventarios, según tu responsabilidad.',
    victoria: 'Tareas autorizadas realizadas y su efecto verificado en el flujo.',
    reglas: ['Los cambios de permisos aplican de inmediato.', 'Si cambian tus roles, debes cerrar sesión y volver a entrar.'],
  },
  RI: {
    codigo: 'RI', nombre: 'Reto integrador', mision: 'Mi turno en BEL', lema: 'La misión es individual. El resultado es de todos.',
    ubicacion: 'Turno simulado de 24 horas', modalidad: 'Presencial', duracionH: 3, tipo: 'Integrador', insignia: 'Operación integrada',
    objetivo: 'Ejecutar tu parte de un turno simulado de 24 horas con autonomía.',
    reto: 'Turno publicado → recursos verificados → turno documentado → novedad gestionada → cierre y consolidación, solo con las acciones de tu rol.',
    victoria: 'Acciones críticas de tu rol completadas sin acompañamiento y explicación de cómo se conectan con el resto del flujo.',
    reglas: ['Se ejecuta con datos de prueba.', 'Los puntos no compensan un error crítico.'],
  },
}
