import { supabase } from '../lib/supabase'
import type { Modalidad } from './types'

// Centro de control: sesiones, inscripciones y asistencia.
// Las escrituras sensibles (asistencia) pasan por funciones del servidor que validan permisos y otorgan XP.

const ok = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(traducir(r.error.message))
  return r.data
}
const traducir = (m: string) =>
  /row-level security|permission denied/i.test(m) ? 'No tienes permiso para esta acción.'
  : /fin_check|fin > inicio/i.test(m) ? 'La hora de fin debe ser posterior a la de inicio.'
  : /duplicate key.*inscripciones/i.test(m) ? 'Esa persona ya está inscrita.'
  : m

export interface SesionControl {
  id: string
  modulo_codigo: string
  modalidad: Modalidad
  inicio: string
  fin: string
  lugar: string | null
  enlace: string | null
  cupo: number | null
  estado: 'programada' | 'realizada' | 'suspendida' | 'cancelada'
  temas_abordados: string | null
  temas_pendientes: string | null
  observaciones_estado: string | null
  sesion_origen_id: string | null
  reprogramada_en_id: string | null
  instructor_id: string | null
  instructor: string | null
  inscritos: number
}

export interface Inscrito {
  perfil_id: string
  nombre: string
  correo: string
  rol: string | null
  rol_id: string | null
  presente: boolean | null // null = sin registrar
  habilitada: boolean // habilitación manual vigente de administración para la misión
  firmado_en: string | null // el participante firmó su asistencia
}

const CAMPOS = 'id, modulo_codigo, modalidad, inicio, fin, lugar, enlace, cupo, estado, temas_abordados, temas_pendientes, observaciones_estado, sesion_origen_id, reprogramada_en_id, instructor_id, instructor:instructor_id(nombre), inscripciones(count)'
const mapear = (s: any): SesionControl => ({ ...s, instructor: s.instructor?.nombre ?? null, inscritos: s.inscripciones?.[0]?.count ?? 0 })

export async function listarSesiones(soloMias: string | null): Promise<SesionControl[]> {
  let q = supabase.from('sesiones').select(CAMPOS).order('inicio', { ascending: false })
  if (soloMias) q = q.eq('instructor_id', soloMias)
  return (ok(await q) as any[]).map(mapear)
}

export async function obtenerSesion(id: string): Promise<SesionControl> {
  return mapear(ok(await supabase.from('sesiones').select(CAMPOS).eq('id', id).single()))
}

export type NuevaSesion = Pick<SesionControl, 'modulo_codigo' | 'modalidad' | 'inicio' | 'fin' | 'lugar' | 'enlace' | 'cupo' | 'instructor_id'>

export async function guardarSesion(datos: NuevaSesion, id?: string) {
  const q = id ? supabase.from('sesiones').update(datos).eq('id', id).select('id').single()
               : supabase.from('sesiones').insert(datos).select('id').single()
  return (ok(await q) as { id: string }).id
}

export async function cambiarEstadoSesion(id: string, estado: 'programada' | 'realizada' | 'cancelada', motivo?: string) {
  ok(await supabase.rpc('cambiar_estado_sesion', { p_sesion: id, p_estado: estado, p_motivo: motivo ?? null }))
}

/** Suspender (p. ej. por atención de una emergencia): exige temas abordados y pendientes. */
export async function suspenderSesion(id: string, abordados: string, pendientes: string, observaciones: string) {
  ok(await supabase.rpc('suspender_sesion', { p_sesion: id, p_abordados: abordados, p_pendientes: pendientes, p_observaciones: observaciones || null }))
}

/** Crea una nueva sesión enlazada a la suspendida/cancelada y traslada las inscripciones. Devuelve el id nuevo. */
export async function reprogramarSesion(id: string, inicio: string, fin: string, lugar: string, enlace: string) {
  return ok(await supabase.rpc('reprogramar_sesion', { p_sesion: id, p_inicio: inicio, p_fin: fin, p_lugar: lugar || null, p_enlace: enlace || null })) as string
}

export interface CambioEstado { estado_anterior: string | null; estado_nuevo: string; motivo: string | null; actor: string | null; fecha: string }
export async function historialSesion(id: string): Promise<CambioEstado[]> {
  return ok(await supabase.rpc('historial_sesion', { p_sesion: id })) as CambioEstado[]
}

export async function listarInstructores(): Promise<{ id: string; nombre: string }[]> {
  return ok(await supabase.rpc('instructores')) as any[]
}

export async function listarInscritos(sesionId: string, modulo: string): Promise<Inscrito[]> {
  const ins = ok(await supabase.from('inscripciones')
    .select('perfil_id, perfil:perfil_id(nombre, correo, rol_bel_id, rol:rol_bel_id(nombre))').eq('sesion_id', sesionId)) as any[]
  const asis = ok(await supabase.from('asistencias').select('perfil_id, presente, firmado_en').eq('sesion_id', sesionId)) as any[]
  const ids = ins.map((i) => i.perfil_id)
  const habs = ids.length ? ok(await supabase.from('habilitaciones').select('perfil_id').eq('modulo_codigo', modulo)
    .is('revocada_en', null).in('perfil_id', ids)) as any[] : []
  return ins.map((i) => ({
    perfil_id: i.perfil_id, nombre: i.perfil?.nombre ?? '—', correo: i.perfil?.correo ?? '', rol: i.perfil?.rol?.nombre ?? null, rol_id: i.perfil?.rol_bel_id ?? null,
    presente: asis.find((a) => a.perfil_id === i.perfil_id)?.presente ?? null,
    habilitada: habs.some((h) => h.perfil_id === i.perfil_id),
    firmado_en: asis.find((a) => a.perfil_id === i.perfil_id)?.firmado_en ?? null,
  })).sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** Personas cuyo rol BEL incluye la misión de la sesión (candidatas a inscribir). */
export async function candidatos(modulo: string): Promise<{ id: string; nombre: string; correo: string; rol: string }[]> {
  const roles = (ok(await supabase.from('rol_modulo').select('rol_bel_id').eq('modulo_codigo', modulo)) as any[]).map((r) => r.rol_bel_id)
  if (!roles.length) return []
  // Incluye a quienes tienen el rol como principal o como rol adicional
  const filas = ok(await supabase.from('perfiles').select('id, nombre, correo, rol:rol_bel_id(nombre)')
    .or(`rol_bel_id.in.(${roles.join(',')}),roles_bel_extra.ov.{${roles.join(',')}}`).eq('activo', true).order('nombre')) as any[]
  return filas.map((f) => ({ id: f.id, nombre: f.nombre, correo: f.correo, rol: f.rol?.nombre ?? '' }))
}

export async function inscribir(sesionId: string, perfilIds: string[]) {
  ok(await supabase.from('inscripciones').insert(perfilIds.map((perfil_id) => ({ sesion_id: sesionId, perfil_id }))))
}

export async function retirar(sesionId: string, perfilId: string) {
  ok(await supabase.from('inscripciones').delete().eq('sesion_id', sesionId).eq('perfil_id', perfilId))
}

export async function registrarAsistencia(sesionId: string, perfilId: string, presente: boolean, motivo?: string) {
  ok(await supabase.rpc('registrar_asistencia', {
    p_sesion: sesionId, p_perfil: perfilId, p_presente: presente, p_mecanismo: 'instructor', p_motivo: motivo ?? null,
  }))
}

/** Habilitación manual (solo administración): permite cuestionario y reto sin asistencia válida. No da XP de asistencia. */
export async function habilitarActividades(perfilId: string, modulo: string, motivo: string) {
  ok(await supabase.rpc('habilitar_actividades', { p_perfil: perfilId, p_modulo: modulo, p_motivo: motivo }))
}
export async function quitarHabilitacion(perfilId: string, modulo: string, motivo: string) {
  ok(await supabase.rpc('quitar_habilitacion', { p_perfil: perfilId, p_modulo: modulo, p_motivo: motivo }))
}
