// Storytelling de Operación BEL (texto aprobado por el proyecto).
// Principio: las misiones se registran en Operación BEL; la práctica se realiza en BEL.

export const BIENVENIDA = {
  titulo: 'OPERACIÓN BEL',
  lema: 'Preparados para cada desafío',
  parrafos: [
    'Cada turno trae nuevos desafíos. Detrás de cada salida, cada equipo disponible, cada novedad atendida y cada decisión, hay personas que necesitan información confiable y procesos coordinados.',
    'Bomberos en Línea —BEL— es parte de esa coordinación. Para aprovecharlo, cada integrante del Cuerpo Oficial de Bomberos debe conocer las herramientas que corresponden a su función y saber cómo utilizarlas en el momento indicado.',
    'Hoy comienza tu entrenamiento. En esta operación no todos cumplen la misma función ni enfrentan los mismos retos. Por eso, tendrás una ruta de misiones diseñada según tu rol. En cada una conocerás un proceso, pondrás a prueba tus habilidades y demostrarás que puedes completar las tareas que te corresponden.',
    'Tu objetivo no es acumular pantallas visitadas. Es ganar autonomía, comprender cómo tu trabajo se conecta con el de los demás y estar preparado para utilizar BEL en la operación diaria.',
  ],
  cierre: 'La misión comienza aquí. Tu preparación hace la diferencia.',
}

export const IDENTIDAD: { clave: string; titulo: string; texto: string }[] = [
  { clave: 'participante', titulo: 'Tú', texto: 'Protagonista de tu propia ruta de entrenamiento.' },
  { clave: 'bel', titulo: 'BEL', texto: 'Herramienta de coordinación y registro de la operación.' },
  { clave: 'misiones', titulo: 'Las misiones', texto: 'Procesos reales que debes aprender a ejecutar según tu rol.' },
  { clave: 'retos', titulo: 'Los retos', texto: 'Ejercicios prácticos para demostrar comprensión y autonomía.' },
  { clave: 'progresion', titulo: 'La progresión', texto: 'Avance visible a medida que completas misiones y acreditas competencias.' },
  { clave: 'elite', titulo: 'El Grupo Élite', texto: 'Compañeros de referencia que apoyan el aprendizaje y ayudan a superar barreras.' },
  { clave: 'final', titulo: 'El reto final «Mi turno en BEL»', texto: 'Simulación integradora en la que demuestras cómo aportas al desarrollo de un turno.' },
]

/** Dónde ocurre cada cosa: la práctica en BEL, el registro en Operación BEL. */
export const DOS_ESPACIOS = {
  resumen: 'Las misiones se registran en Operación BEL. La práctica se realiza en BEL.',
  bel: {
    titulo: 'En BEL practicas',
    puntos: ['Ejecutas el proceso real de tu rol en Bomberos en Línea.', 'Allí demuestras el reto práctico ante tu instructor.'],
  },
  operacion: {
    titulo: 'En Operación BEL registras',
    puntos: ['Tu ruta, tu asistencia y tus resultados.', 'El cuestionario, la experiencia (XP) y tus insignias.'],
  },
}

export const TABLERO = {
  titulo: 'Tu ruta. Tu función. Una operación coordinada.',
  texto: 'Cada misión te prepara para resolver una parte de la operación en BEL. Avanza a tu ritmo dentro de las actividades asignadas, practica los flujos de tu rol y demuestra lo aprendido. Tu progreso representa nuevas competencias para trabajar con mayor autonomía.',
}

export interface HistoriaMision {
  proposito: string
  apertura: string[]
  desafio: string | string[]
  cierre: { titulo?: string; texto: string[] }
  refuerzo?: string[]
}

/** Refuerzo general cuando la misión no tiene uno propio. */
export const REFUERZO_GENERAL = [
  'El entrenamiento también sirve para identificar lo que podemos mejorar. Has avanzado, y algunos pasos necesitan una nueva práctica antes de demostrar autonomía.',
  'Revisa la retroalimentación, vuelve a practicar los criterios pendientes y solicita acompañamiento al facilitador o al Grupo Élite cuando lo necesites.',
]

export const HISTORIAS: Record<string, HistoriaMision> = {
  M00: {
    proposito: 'Tu punto de partida',
    apertura: [
      'Toda operación comienza con una preparación adecuada. Antes de asumir tu función, necesitas acceder a las herramientas que te permiten conocer tu actividad, consultar la información disponible y actuar desde tu perfil.',
      'En esta primera misión vas a reconocer tu punto de entrada a BEL, explorar el Dashboard que corresponde a tu rol y dejar listo tu perfil para las siguientes etapas. Una buena operación digital comienza por saber entrar, orientarse y verificar que todo esté preparado.',
    ],
    desafio: 'Ingresa a BEL, identifica los elementos principales de tu Dashboard, revisa tu perfil y completa las acciones de configuración que te correspondan, incluida la firma digital cuando aplique.',
    cierre: { titulo: '¡Primera misión completada!', texto: ['Ya conoces tu punto de partida en BEL. Tu siguiente desafío será utilizar esta herramienta para apoyar los procesos reales de tu función.'] },
  },
  M01: {
    proposito: 'Cada función en el momento indicado',
    apertura: [
      'Un turno requiere coordinación. El personal, los puestos, las estaciones y las responsabilidades deben quedar organizados para que cada integrante conozca su función y el mando pueda hacer seguimiento.',
      'En esta misión asumirás el desafío de comprender cómo BEL apoya la programación, asignación, seguimiento y cierre de los turnos. Tu papel dependerá de tu rol: podrás organizar el turno, reportar información o consultar cuándo y dónde te corresponde prestar servicio.',
    ],
    desafio: 'Según los permisos de tu rol, practica la creación o consulta de turnos, la asignación del personal, la revisión de novedades que afectan la disponibilidad y el cierre correspondiente.',
    cierre: { texto: ['Un turno bien gestionado comienza con información organizada y responsabilidades claras. Has practicado cómo tu función contribuye a que el equipo sepa dónde debe estar y cómo queda registrado el servicio.'] },
  },
  M02: {
    proposito: 'Registrar bien para coordinar mejor',
    apertura: [
      'Las circunstancias del personal pueden cambiar: permisos, incapacidades, vacaciones, compensatorios y otras novedades hacen parte de la realidad del servicio. Para coordinar el trabajo, esas situaciones deben registrarse con información clara y seguir el proceso que les corresponde.',
      'En esta misión descubrirás cómo una novedad pasa del registro a la revisión y aprobación, y cómo puede afectar otros procesos. La calidad de la información y el cumplimiento de cada responsabilidad son esenciales.',
    ],
    desafio: 'Practica el registro de una novedad con sus fechas, observaciones y soportes. Si tu rol incluye revisar solicitudes, determina cómo aprobarlas o rechazarlas dejando el motivo correspondiente. Utiliza únicamente las acciones permitidas para tu rol.',
    cierre: { texto: ['Una novedad correctamente registrada no es solo un dato: permite que otros procesos cuenten con información confiable. Has demostrado cómo aportar a una gestión coordinada del personal.'] },
  },
  M03: {
    proposito: 'Una flota preparada para responder',
    apertura: [
      'Antes de que un vehículo forme parte de la respuesta operativa, es importante conocer su estado. Un chequeo oportuno puede identificar una falla; un registro claro permite que mantenimiento, supervisión y mando actúen de acuerdo con su responsabilidad.',
      'En esta misión seguirás el recorrido de una novedad vehicular: desde la revisión inicial hasta las acciones que permiten gestionar la falla, documentar el mantenimiento y determinar el estado del vehículo.',
    ],
    desafio: 'Practica el chequeo vehicular y, cuando corresponda, registra una falla con evidencia. Recorre las acciones de revisión, mantenimiento y visto bueno que estén habilitadas para tu rol.',
    cierre: { texto: ['La disponibilidad de los vehículos depende de una cadena de acciones coordinadas. Has practicado cómo tu registro o decisión contribuye a mantener trazabilidad sobre el estado de la flota.'] },
  },
  M04: {
    proposito: 'Cuidar los recursos que respaldan la respuesta',
    apertura: [
      'Las herramientas, los equipos y los accesorios —HEAs— cumplen una función importante en la preparación y la respuesta. Para gestionar sus condiciones, no basta con detectar una novedad: es necesario describirla, documentarla y permitir que las personas responsables decidan qué hacer.',
      'En esta misión recorrerás el proceso de una novedad de HEA, desde el chequeo hasta su atención por parte del mando, mantenimiento o almacén, según corresponda.',
    ],
    desafio: 'Identifica un elemento con novedad en el escenario de práctica, registra la descripción y la evidencia requerida, y sigue el flujo disponible para tu rol: revisión, diagnóstico, reparación, remisión, baja o reposición, según aplique.',
    cierre: { texto: ['Has comprobado que la gestión de los equipos requiere información precisa y decisiones trazables. Cada registro oportuno ayuda a conocer el estado de los recursos y a orientar su atención.'] },
  },
  M05: {
    proposito: 'Una estación en condiciones adecuadas',
    apertura: [
      'La infraestructura también hace parte de la preparación. Una necesidad locativa que se identifica y documenta correctamente puede ser evaluada, priorizada y atendida con mayor claridad.',
      'En esta misión aprenderás a registrar una novedad de infraestructura sin duplicar reportes y a reconocer cómo avanza su atención, desde la identificación del daño hasta el cierre documentado de la intervención.',
    ],
    desafio: 'Practica el registro de una novedad locativa con su ubicación, descripción y fotografías. Si tu rol corresponde a mantenimiento, practica la programación, el seguimiento de la intervención y el cierre con evidencia.',
    cierre: { texto: ['Una necesidad bien reportada puede convertirse en una acción verificable. Has aprendido cómo tu función ayuda a mantener la trazabilidad de las condiciones de las estaciones.'] },
  },
  M06: {
    proposito: 'Cada registro cuenta. Cada turno deja huella.',
    apertura: [
      'Un turno de servicio está lleno de acontecimientos, novedades y actividades que deben quedar registrados. Lo que sucede durante la guardia no puede depender únicamente de la memoria de quienes estuvieron presentes: necesita información clara, organizada y disponible para su consulta.',
      'La Minuta Digital es el espacio donde se documenta lo ocurrido durante el turno. Cada registro contribuye a conservar la memoria de la guardia y permite que quienes tienen responsabilidades de seguimiento o consulta accedan a la información correspondiente.',
      'En esta misión aprenderás a llevar la bitácora digital de tu turno, registrar las novedades y actividades de manera adecuada y reconocer los pasos necesarios para revisar y cerrar la minuta.',
      'Tu desafío es dejar una bitácora completa, clara y confiable. Porque lo que se registra hoy ayuda a comprender lo que ocurrió durante el servicio.',
    ],
    desafio: [
      'Registra los acontecimientos y las novedades del turno con la información requerida.',
      'Identifica cómo consultar los registros y verificar que la información esté completa.',
      'Reconoce las responsabilidades asociadas a la revisión, firma y cierre de la bitácora.',
      'Comprende qué acciones requieren conexión y qué condiciones deben cumplirse para cerrar la minuta.',
    ],
    cierre: {
      titulo: '¡Bitácora completada!',
      texto: [
        'Has demostrado que puedes registrar y consultar la información de la guardia de acuerdo con las responsabilidades de tu rol. Una minuta bien diligenciada permite conservar la trazabilidad de lo ocurrido y facilita el seguimiento del turno.',
        'Recuerda: antes del cierre, verifica la información pendiente y cumple el proceso de revisión y firma que te corresponda.',
      ],
    },
    refuerzo: ['Una bitácora confiable se construye con registros oportunos y completos. Revisa los pasos que quedaron pendientes, practica nuevamente y verifica qué información necesitas antes de finalizar el proceso. Cada detalle cuenta para conservar una memoria clara del turno.'],
  },
  M07: {
    proposito: 'Prepararse también es parte del servicio',
    apertura: [
      'La preparación del equipo se construye con actividades organizadas, participación y seguimiento. Para que una formación cumpla su propósito, es necesario coordinar la actividad, convocar a las personas, registrar la asistencia y conservar las evidencias correspondientes.',
      'En esta misión conocerás cómo BEL acompaña el ciclo de formación. Si coordinas actividades, tendrás el reto de organizarlas y cerrarlas correctamente; si participas, deberás reconocer cómo atender una convocatoria, inscribirte y cumplir con la actividad asignada.',
    ],
    desafio: 'Recorre el flujo que corresponde a tu rol: crear y gestionar una actividad, aceptar una convocatoria, inscribirte, registrar asistencia o revisar las evidencias disponibles.',
    cierre: { texto: ['Cada actividad formativa contribuye a fortalecer las capacidades del equipo. Has practicado cómo tu participación o gestión ayuda a mantener organizada la formación en BEL.'] },
  },
  M08: {
    proposito: 'Planear, actuar y dejar registro',
    apertura: [
      'Las actividades de Seguridad Humana requieren planeación y coordinación entre las personas que intervienen. La información de la actividad, los recursos asignados, los registros y la revisión del responsable permiten que el proceso avance de manera ordenada.',
      'En esta misión asumirás la parte del proceso que corresponde a tu rol: apoyar la planeación, ejecutar y documentar la actividad, revisar la información o completar el cierre correspondiente.',
    ],
    desafio: 'Practica el flujo aplicable a tu función, desde la creación o asignación de la actividad hasta el registro de datos y fotografías, la revisión del responsable y el cierre del informe.',
    cierre: { texto: ['Una actividad no termina cuando se ejecuta: también necesita un registro claro y un cierre adecuado. Has practicado cómo tu parte del proceso se conecta con la de los demás.'] },
  },
  M09: {
    proposito: 'La precisión importa en cada cálculo',
    apertura: [
      'La información de turnos y novedades aprobadas tiene consecuencias en la liquidación de horas y en el proceso de nómina. Por eso, este trabajo requiere atención a los parámetros, las reglas de calendario y las validaciones antes de confirmar un período.',
      'En esta misión aprenderás a reconocer cómo se relacionan los registros previos con la liquidación, cuáles son los controles que deben revisarse y por qué ciertas acciones requieren especial cuidado.',
    ],
    desafio: 'En un escenario de entrenamiento, revisa los parámetros y las novedades que alimentan una liquidación, identifica inconsistencias y completa las validaciones correspondientes al rol. Las acciones definitivas o irreversibles deben practicarse únicamente en un entorno autorizado de entrenamiento.',
    cierre: { texto: ['La precisión y la revisión previa son esenciales en la gestión de nómina. Has practicado cómo verificar información antes de avanzar y cómo reconocer las acciones que exigen especial cuidado.'] },
  },
  M10: {
    proposito: 'Convertir los registros en una visión del servicio',
    apertura: [
      'Durante un turno se generan registros y se desarrollan actividades que deben quedar organizadas para facilitar su consulta y seguimiento. Un informe permite reunir la información disponible y dar visibilidad al trabajo realizado.',
      'En esta misión reconocerás cómo se relacionan los registros del turno con el informe correspondiente y qué debes revisar antes de consultar o completar las acciones que estén habilitadas para tu rol.',
    ],
    desafio: 'Explora el informe de un turno simulado, identifica la información disponible y practica la consulta, revisión o gestión que corresponda a tus permisos.',
    cierre: { texto: ['Has aprendido a consultar la información del turno desde una perspectiva integrada. Un registro claro facilita la revisión posterior y ayuda a conservar la trazabilidad de la operación.'] },
  },
  M11: {
    proposito: 'Configurar con criterio y responsabilidad',
    apertura: [
      'Detrás de una herramienta que funciona correctamente hay configuraciones, parámetros y responsabilidades que deben mantenerse bajo control. Las decisiones administrativas pueden influir en los usuarios, los procesos y la información que el sistema permite gestionar.',
      'Esta misión está dirigida a quienes tienen responsabilidades de administración o configuración. Tu reto será comprender cómo mantener los parámetros de BEL de acuerdo con las funciones autorizadas, sin confundir la administración del sistema con las tareas operativas de los demás roles.',
    ],
    desafio: 'Explora las opciones de administración que corresponden a tu rol y practica las tareas autorizadas en el entorno de entrenamiento. Antes de ejecutar un cambio, identifica su propósito, alcance y posible impacto.',
    cierre: { texto: ['Administrar también significa proteger la continuidad del trabajo de los demás. Has practicado la importancia de configurar con criterio, verificar los cambios y actuar dentro de tus responsabilidades.'] },
  },
  RI: {
    proposito: 'Es momento de demostrar tu preparación',
    apertura: [
      'Has recorrido las misiones que corresponden a tu función. Ahora llega el momento de conectar lo aprendido.',
      'Imagina que comienza un nuevo turno. Hay información que consultar, responsabilidades que asumir, registros que completar y decisiones que deben seguir el flujo correspondiente. Cada integrante cumple una parte del proceso y la coordinación depende de que esa parte se realice correctamente.',
      'Este es tu turno de demostrar lo que sabes hacer en BEL. No se trata de hacerlo todo, sino de cumplir tu función, reconocer cuándo debes actuar, cuándo debes validar información y cuándo corresponde que intervenga otro rol.',
      'Tu misión: completar tu parte del turno con autonomía, precisión y responsabilidad.',
    ],
    desafio: 'Completa un escenario simulado con las tareas correspondientes a tu rol. La plataforma verifica los criterios definidos para tu ruta, registra los resultados y señala los aspectos que requieren refuerzo.',
    cierre: {
      titulo: '¡Misión cumplida!',
      texto: [
        'Has demostrado que puedes completar las tareas evaluadas de tu función en BEL sin acompañamiento. Tu preparación contribuye a una operación más coordinada, con información trazable y responsabilidades claras.',
        'El entrenamiento termina aquí, pero el aprendizaje continúa en cada turno.',
      ],
    },
    refuerzo: [
      'El entrenamiento también sirve para identificar lo que podemos mejorar. Has avanzado, y algunos pasos necesitan una nueva práctica antes de demostrar autonomía.',
      'Revisa la retroalimentación, vuelve a practicar los criterios pendientes y solicita acompañamiento al facilitador o al Grupo Élite cuando lo necesites. Cada intento te prepara mejor para el siguiente desafío.',
    ],
  },
}

export const ELITE = {
  apertura: {
    titulo: 'Una operación más coordinada se construye entre todos.',
    parrafos: [
      'Has sido convocado para formar parte del Grupo Élite de BEL, un equipo de referencia que ayudará a sus compañeros a familiarizarse con el sistema y a superar las dificultades que surjan durante su adopción.',
      'Tu misión no consiste en saberlo todo de memoria ni en reemplazar el soporte técnico. Consiste en conocer el recorrido general de BEL, reconocer qué funciones intervienen en cada proceso, orientar a tus compañeros hacia la ruta que les corresponde y ayudar a identificar cuándo una duda necesita escalarse.',
      'Al finalizar este recorrido, estarás preparado para convertir lo aprendido en acompañamiento entre pares en las estaciones y compañías.',
    ],
  },
  cierre: {
    titulo: 'Tu recorrido general ha terminado; ahora comienza tu papel como referente.',
    parrafos: [
      'Escucha las dudas, ayuda a identificar el proceso correcto, registra las barreras que encuentres y canaliza los problemas que requieran apoyo técnico.',
      'Ser parte del Grupo Élite significa ayudar a que nadie tenga que enfrentar solo el cambio.',
    ],
  },
}
