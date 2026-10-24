import { supabase } from '../lib/supabase'
import { MODULOS } from './modulos'
import type { EstadoMision, Evidencia, Modulo, ProgresoMision, Rol, Sesion } from './types'

// Acceso a datos. Toda regla (XP, estados, permisos) se calcula en Supabase; aquí solo se lee.

export interface Perfil {
  id: string
  nombre: string
  correo: string
  rol_bel_id: string | null
  roles_bel_extra: string[]
  /** Tiene una contraseña temporal asignada por administración y debe cambiarla */
  debe_cambiar_clave: boolean
  estacion: string | null
  compania: string | null
  grupo_elite: boolean
  roles: string[]
}

const chequear = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

export async function cargarModulos() {
  const filas = chequear(await supabase.from('modulos').select('*').eq('activo', true).order('orden'))
  for (const f of filas as any[]) {
    MODULOS[f.codigo] = {
      codigo: f.codigo, nombre: f.nombre, mision: f.mision, lema: f.lema ?? '', ubicacion: f.ubicacion ?? '',
      modalidad: f.modalidad, duracionH: Number(f.duracion_h), tipo: f.tipo, insignia: f.insignia,
      objetivo: f.objetivo ?? '', reto: f.reto ?? '', victoria: f.victoria ?? '', reglas: f.reglas ?? [],
    } satisfies Modulo
  }
}

export async function cargarPerfil(id: string): Promise<Perfil> {
  const p: any = chequear(await supabase.from('perfiles')
    .select('id, nombre, correo, rol_bel_id, roles_bel_extra, debe_cambiar_clave, grupo_elite, estacion:estacion_id(nombre), compania:compania_id(nombre)')
    .eq('id', id).single())
  const roles = chequear(await supabase.from('perfil_roles').select('rol').eq('perfil_id', id)) as { rol: string }[]
  return { ...p, estacion: p.estacion?.nombre ?? null, compania: p.compania?.nombre ?? null, roles: roles.map((r) => r.rol) }
}

/** Rol BEL de la persona. Si tiene varios roles, la ruta es la unión de los módulos de todos ellos. */
export async function cargarRol(id: string | null, extras: string[] = []): Promise<Rol | null> {
  if (!id) return null
  const ids = [id, ...extras.filter((x) => x !== id)]
  const roles = chequear(await supabase.from('roles_bel').select('id, nombre, familia').in('id', ids)) as { id: string; nombre: string; familia: string }[]
  const orden = ids.map((x) => roles.find((r) => r.id === x)).filter(Boolean) as typeof roles
  const filas = chequear(await supabase.from('rol_modulo').select('rol_bel_id, modulo_codigo, hace, participacion').in('rol_bel_id', ids)) as any[]
  const ruta: Rol['ruta'] = {}
  for (const r of orden) for (const f of filas.filter((x) => x.rol_bel_id === r.id)) {
    const e = (ruta[f.modulo_codigo] ??= { hace: '', participacion: [], porRol: [] })
    const part = f.participacion.split('') as Rol['ruta'][string]['participacion']
    e.porRol.push({ rol: r.nombre, hace: f.hace, participacion: part })
    e.participacion = [...new Set([...e.participacion, ...part])]
    e.hace = e.porRol.length > 1 ? e.porRol.map((p) => `${p.rol}: ${p.hace}`).join(' · ') : f.hace
  }
  return { id, nombre: orden.map((r) => r.nombre).join(' + '), familia: orden[0]?.familia ?? '', ruta, roles: orden.map(({ id, nombre }) => ({ id, nombre })) }
}

export async function cargarRuta(perfilId: string): Promise<ProgresoMision[]> {
  const filas = chequear(await supabase.rpc('ruta_de')) as any[]
  const habs = chequear(await supabase.from('habilitaciones').select('modulo_codigo, motivo, fecha')
    .eq('perfil_id', perfilId).is('revocada_en', null)) as { modulo_codigo: string; motivo: string; fecha: string }[]
  const reglas = chequear(await supabase.from('reglas_xp').select('tipo, modulo_codigo, xp').eq('activo', true)) as any[]
  const xpDe = (tipo: string, mod: string) =>
    reglas.find((r) => r.tipo === tipo && r.modulo_codigo === mod)?.xp ?? reglas.find((r) => r.tipo === tipo && !r.modulo_codigo)?.xp ?? 0

  return filas.map((f) => {
    const ri = f.codigo === 'RI'
    const evidencias: Evidencia[] = [
      { tipo: 'asistencia', etiqueta: ri ? 'Asistencia al turno simulado' : 'Asistencia validada', xp: xpDe('asistencia', f.codigo), estado: f.asistencia ? 'validada' : 'pendiente' },
      { tipo: 'reto', etiqueta: ri ? 'Acciones críticas de tu rol' : 'Reto práctico aprobado', xp: xpDe('reto', f.codigo),
        estado: f.reto === 'aprobado' ? 'validada' : f.reto === 'no_aprobado' ? 'no_aprobada' : 'pendiente' },
      { tipo: 'cuestionario', etiqueta: ri ? 'Explica cómo tu parte conecta con el flujo' : 'Cuestionario aprobado', xp: xpDe('cuestionario', f.codigo), estado: f.cuestionario ? 'validada' : 'pendiente' },
      { tipo: 'autonomia', etiqueta: ri ? 'Completa tu parte sin acompañamiento' : 'Ejecución autónoma validada', xp: xpDe('autonomia', f.codigo), estado: f.autonomia ? 'validada' : 'pendiente' },
    ]
    const h = habs.find((x) => x.modulo_codigo === f.codigo)
    return { codigo: f.codigo, estado: f.estado as EstadoMision, evidencias, xp: f.xp, xpMax: f.xp_max, habilitacion: h ? { motivo: h.motivo, fecha: h.fecha } : null }
  })
}

export async function cargarSesiones(perfilId: string): Promise<Sesion[]> {
  const filas = chequear(await supabase.from('inscripciones')
    .select('sesion:sesion_id(id, modulo_codigo, inicio, lugar, enlace, modalidad, estado, instructor:instructor_id(nombre))')
    .eq('perfil_id', perfilId)) as any[]
  const ahora = Date.now()
  return filas.map((f) => f.sesion).filter((s) => s && s.estado === 'programada' && new Date(s.inicio).getTime() > ahora - 3 * 3600e3)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((s) => ({ id: s.id, codigo: s.modulo_codigo, fecha: s.inicio, lugar: s.lugar ?? s.enlace ?? 'Por confirmar',
                   modalidad: s.modalidad, instructor: s.instructor?.nombre ?? 'Por asignar' }))
}

export async function cargarCompanias(): Promise<{ nombre: string; avance: number; personas: number }[]> {
  const filas = chequear(await supabase.rpc('avance_companias')) as any[]
  return filas.map((f) => ({ nombre: f.compania, avance: Number(f.avance), personas: f.personas }))
}
