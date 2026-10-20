import { MODULOS, ORDEN_FORMACION } from './modulos'
import type { Evidencia, EstadoMision, Participante, ProgresoMision, Rol, Sesion } from './types'

// ⚠️ DATOS FICTICIOS para el prototipo. En el Paso 2 se reemplazan por Supabase.
// Las reglas de XP se calcularán en el servidor; aquí solo se simulan para ver el diseño.

export const REGLAS_XP = { asistencia: 20, reto: 50, cuestionario: 20, autonomia: 10, integrador: 200 }

export const NIVELES = [
  { nombre: 'En formación', desc: 'Has iniciado tu ruta.' },
  { nombre: 'Competencias en desarrollo', desc: 'Has aprobado algunas misiones de tu ruta.' },
  { nombre: 'Dominio demostrado', desc: 'Aprobaste las competencias obligatorias de tu rol.' },
  { nombre: 'Especialista BEL', desc: 'Completaste tu ruta y el reto «Mi turno en BEL».' },
]

export const PARTICIPANTE_DEMO: Participante = {
  nombre: 'Participante de prueba',
  rolId: 'bombero',
  estacion: 'Estación 4 (ficticia)',
  compania: 'Compañía B',
}

/** Ruta del rol en el orden de formación del plan, más el reto integrador. */
export function rutaDelRol(rol: Rol): string[] {
  return ORDEN_FORMACION.filter((c) => c === 'RI' || rol.ruta[c])
}

function evidenciasBase(codigo: string): Evidencia[] {
  if (codigo === 'RI') {
    return [
      { tipo: 'asistencia', etiqueta: 'Asistencia al turno simulado', xp: 0, estado: 'pendiente' },
      { tipo: 'reto', etiqueta: 'Acciones críticas de tu rol', xp: 140, estado: 'pendiente' },
      { tipo: 'cuestionario', etiqueta: 'Explica cómo tu parte conecta con el flujo', xp: 10, estado: 'pendiente' },
      { tipo: 'autonomia', etiqueta: 'Completa tu parte sin acompañamiento', xp: 50, estado: 'pendiente' },
    ]
  }
  return [
    { tipo: 'asistencia', etiqueta: 'Asistencia validada', xp: REGLAS_XP.asistencia, estado: 'pendiente' },
    { tipo: 'reto', etiqueta: 'Reto práctico aprobado', xp: REGLAS_XP.reto, estado: 'pendiente' },
    { tipo: 'cuestionario', etiqueta: 'Cuestionario aprobado (80 %)', xp: REGLAS_XP.cuestionario, estado: 'pendiente' },
    { tipo: 'autonomia', etiqueta: 'Ejecución autónoma validada', xp: REGLAS_XP.autonomia, estado: 'pendiente' },
  ]
}

/** Progreso simulado: 2 misiones aprobadas, 1 en curso, el resto bloqueado. */
export function progresoDemo(rol: Rol): ProgresoMision[] {
  return rutaDelRol(rol).map((codigo, i) => {
    let estado: EstadoMision = 'bloqueada'
    const evidencias = evidenciasBase(codigo)
    if (i < 2) {
      estado = 'aprobada'
      evidencias.forEach((e) => (e.estado = 'validada'))
      if (i === 1) evidencias[3].estado = 'no_aprobada' // autonomía no lograda: misión aprobada igual, sin esos 10 XP
    } else if (i === 2) {
      estado = 'en_curso'
      evidencias[0].estado = 'validada'
      evidencias[0].detalle = 'Confirmada por el instructor'
      evidencias[1].estado = 'en_revision'
      evidencias[1].detalle = 'El instructor está revisando tu práctica'
    } else if (i === 3) {
      estado = 'disponible'
    }
    return { codigo, estado, evidencias }
  })
}

export const xpDe = (p: ProgresoMision) => p.xp ?? p.evidencias.filter((e) => e.estado === 'validada').reduce((s, e) => s + e.xp, 0)
export const xpMaxDe = (p: ProgresoMision) => p.xpMax ?? p.evidencias.reduce((s, e) => s + e.xp, 0)

export function nivelDe(progreso: ProgresoMision[]) {
  const obligatorias = progreso.filter((p) => p.codigo !== 'RI')
  const ok = obligatorias.filter((p) => p.estado === 'aprobada' || p.estado === 'convalidada').length
  const ri = progreso.find((p) => p.codigo === 'RI')?.estado === 'aprobada'
  if (ok === 0) return 0
  if (ok < obligatorias.length) return 1
  return ri ? 3 : 2
}

export function sesionesDemo(progreso: ProgresoMision[]): Sesion[] {
  const proximas = progreso.filter((p) => p.estado === 'en_curso' || p.estado === 'disponible')
  return proximas.map((p, i) => ({
    id: `s${i}`,
    codigo: p.codigo,
    fecha: i === 0 ? '2026-10-23T08:00:00' : '2026-10-28T14:00:00',
    lugar: MODULOS[p.codigo].modalidad === 'Virtual' ? 'Sesión virtual (enlace en la plataforma)' : 'Centro de Formación · Aula 2',
    modalidad: MODULOS[p.codigo].modalidad,
    instructor: 'Instructor asignado',
  }))
}

export const COMPANIAS_DEMO = [
  { nombre: 'Compañía A', avance: 0.62 },
  { nombre: 'Compañía B', avance: 0.48 },
  { nombre: 'Compañía C', avance: 0.55 },
]
