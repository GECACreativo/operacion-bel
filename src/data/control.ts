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
  estado: 'programada' | 'realizada' | 'cancelada'
  instructor_id: string | null
  instructor: string | null
  inscritos: number
}

export interface Inscrito {
  perfil_id: string
  nombre: string
  correo: string
  rol: string | null
  presente: boolean | null // null = sin registrar
}

const CAMPOS = 'id, modulo_codigo, modalidad, inicio, fin, lugar, enlace, cupo, estado, instructor_id, instructor:instructor_id(nombre), inscripciones(count)'
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

export async function cambiarEstadoSesion(id: string, estado: SesionControl['estado']) {
  ok(await supabase.from('sesiones').update({ estado }).eq('id', id))
}

export async function listarInstructores(): Promise<{ id: string; nombre: string }[]> {
  return ok(await supabase.rpc('instructores')) as any[]
}

export async function listarInscritos(sesionId: string): Promise<Inscrito[]> {
  const ins = ok(await supabase.from('inscripciones')
    .select('perfil_id, perfil:perfil_id(nombre, correo, rol:rol_bel_id(nombre))').eq('sesion_id', sesionId)) as any[]
  const asis = ok(await supabase.from('asistencias').select('perfil_id, presente').eq('sesion_id', sesionId)) as any[]
  return ins.map((i) => ({
    perfil_id: i.perfil_id, nombre: i.perfil?.nombre ?? '—', correo: i.perfil?.correo ?? '', rol: i.perfil?.rol?.nombre ?? null,
    presente: asis.find((a) => a.perfil_id === i.perfil_id)?.presente ?? null,
  })).sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** Personas cuyo rol BEL incluye la misión de la sesión (candidatas a inscribir). */
export async function candidatos(modulo: string): Promise<{ id: string; nombre: string; correo: string; rol: string }[]> {
  const roles = (ok(await supabase.from('rol_modulo').select('rol_bel_id').eq('modulo_codigo', modulo)) as any[]).map((r) => r.rol_bel_id)
  if (!roles.length) return []
  const filas = ok(await supabase.from('perfiles').select('id, nombre, correo, rol:rol_bel_id(nombre)')
    .in('rol_bel_id', roles).eq('activo', true).order('nombre')) as any[]
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
