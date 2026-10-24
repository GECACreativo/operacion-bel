import { supabase, urlRetorno } from '../lib/supabase'

// Gestión de usuarios: preinscripción, edición e invitaciones (solo administración).

const ok = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

export const ROLES_PLATAFORMA = [
  { id: 'participante', nombre: 'Participante' },
  { id: 'instructor', nombre: 'Instructor' },
  { id: 'coordinacion', nombre: 'Coordinación' },
  { id: 'promotor_elite', nombre: 'Promotor Grupo Élite' },
  { id: 'admin_formacion', nombre: 'Administración de formación' },
  { id: 'admin_tecnico', nombre: 'Administración técnica' },
] as const

export interface Usuario {
  correo: string; nombre: string; rol_bel_id: string | null; roles_bel_extra: string[]; estacion_id: string | null; compania_id: string | null
  grupo_elite: boolean; roles: string[]; clave_temporal?: boolean; perfil_id: string | null; activo: boolean; invitado_en: string | null; ultimo_ingreso: string | null
}
export type EstadoAcceso = 'preinscrito' | 'invitado' | 'activo' | 'inactivo'
export const estadoAcceso = (u: Usuario): EstadoAcceso =>
  !u.activo ? 'inactivo' : u.ultimo_ingreso ? 'activo' : u.perfil_id || u.invitado_en ? 'invitado' : 'preinscrito'

export async function listarUsuarios(): Promise<Usuario[]> {
  const [lista, extras, claves] = await Promise.all([supabase.rpc('usuarios_admin'), supabase.rpc('roles_bel_extra_admin'), supabase.rpc('claves_estado_admin')])
  const cl = new Set((ok(claves) as { correo: string; debe_cambiar_clave: boolean }[]).filter((c) => c.debe_cambiar_clave).map((c) => c.correo))
  const ex = new Map((ok(extras) as { correo: string; roles_bel_extra: string[] }[]).map((e) => [e.correo, e.roles_bel_extra ?? []]))
  return (ok(lista) as Usuario[]).map((u) => ({ ...u, roles_bel_extra: ex.get(u.correo) ?? [], clave_temporal: cl.has(u.correo) }))
}

export async function catalogos() {
  const [roles, unidades] = await Promise.all([
    supabase.from('roles_bel').select('id, nombre, familia').order('orden'),
    supabase.from('unidades').select('id, tipo, nombre').eq('activo', true).order('nombre'),
  ])
  const u = ok(unidades) as { id: string; tipo: string; nombre: string }[]
  return {
    roles: ok(roles) as { id: string; nombre: string; familia: string }[],
    estaciones: u.filter((x) => x.tipo === 'estacion'),
    companias: u.filter((x) => x.tipo === 'compania'),
  }
}

export async function guardarUsuario(u: Usuario) {
  ok(await supabase.rpc('guardar_usuario', {
    p_correo: u.correo, p_nombre: u.nombre, p_rol_bel: u.rol_bel_id, p_estacion: u.estacion_id, p_compania: u.compania_id,
    p_elite: u.grupo_elite, p_roles: u.roles.length ? u.roles : ['participante'], p_activo: u.activo,
  }))
  // Roles BEL adicionales (una persona puede tener varios roles en BEL)
  ok(await supabase.rpc('asignar_roles_bel_extra', { p_correo: u.correo, p_roles: u.roles_bel_extra.filter((r) => r !== u.rol_bel_id) }))
  // Retirar roles de plataforma que ya no tiene (RLS: solo administración)
  if (u.perfil_id) {
    const quitar = ROLES_PLATAFORMA.map((r) => r.id).filter((r) => !u.roles.includes(r))
    if (quitar.length) ok(await supabase.from('perfil_roles').delete().eq('perfil_id', u.perfil_id).in('rol', quitar))
  }
}

export async function invitar(correos: string[]) {
  const { data, error } = await supabase.functions.invoke('invitar-usuarios', { body: { correos, retorno: urlRetorno() } })
  if (error) throw new Error(error.message)
  return data.resultados as { correo: string; estado: 'invitado' | 'reenviado' | 'error'; detalle?: string }[]
}

export async function renombrarUnidad(id: string, nombre: string) {
  ok(await supabase.from('unidades').update({ nombre: nombre.trim() }).eq('id', id))
}

export interface ClaveAsignada { correo: string; nombre?: string; estado: 'creado' | 'actualizado' | 'error'; clave?: string; detalle?: string }

/** Plan B sin correo: asigna contraseñas temporales (una distinta por persona, o la misma si se indica). Se muestran una sola vez. */
export async function asignarClavesTemporales(correos: string[], clave?: string) {
  const { data, error } = await supabase.functions.invoke('claves-temporales', { body: { correos, clave: clave || null } })
  if (error) throw new Error(error.message)
  return data.resultados as ClaveAsignada[]
}
