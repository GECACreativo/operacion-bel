// Tipos del dominio de Operación BEL.
// En el Paso 2 estos datos vendrán de Supabase; por ahora son datos ficticios.

export type Modalidad = 'Presencial' | 'Virtual' | 'Híbrida'
export type TipoMision = 'Capacitación' | 'Entrenamiento' | 'Transferencia' | 'Integrador'

/** Participación del rol en el módulo, según el Mapa de Flujos: E ejecuta · A aprueba · C consulta · K configura */
export type Participacion = 'E' | 'A' | 'C' | 'K'

export type EstadoMision =
  | 'bloqueada'
  | 'disponible'
  | 'en_curso'
  | 'pendiente_validacion'
  | 'requiere_refuerzo'
  | 'aprobada'
  | 'convalidada'

export type TipoEvidencia = 'asistencia' | 'reto' | 'cuestionario' | 'autonomia'

export interface Modulo {
  codigo: string // M00…M11, RI
  nombre: string // nombre funcional en BEL
  mision: string // nombre gamificado
  lema: string
  ubicacion: string // dónde está en BEL
  modalidad: Modalidad
  duracionH: number
  tipo: TipoMision
  insignia: string
  objetivo: string
  reto: string
  victoria: string
  reglas: string[]
}

export interface Rol {
  id: string
  nombre: string
  familia: string
  /** Módulo → qué hace el rol allí y su participación */
  ruta: Record<string, { hace: string; participacion: Participacion[] }>
}

export interface Evidencia {
  tipo: TipoEvidencia
  etiqueta: string
  xp: number
  estado: 'pendiente' | 'validada' | 'en_revision' | 'no_aprobada'
  detalle?: string
}

export interface ProgresoMision {
  codigo: string
  estado: EstadoMision
  evidencias: Evidencia[]
}

export interface Sesion {
  id: string
  codigo: string
  fecha: string // ISO
  lugar: string
  modalidad: Modalidad
  instructor: string
}

export interface Participante {
  nombre: string
  rolId: string
  estacion: string
  compania: string
}
