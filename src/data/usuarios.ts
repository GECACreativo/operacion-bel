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
  correo: string; nombre: string; rol_bel_id: string | null; estacion_id: string | null; compania_id: string | null
  grupo_elite: boolean; roles: string[]; perfil_id: string | null; activo: boolean; invitado_en: string | null; ultimo_ingreso: string | null
}
export type EstadoAcceso = 'preinscrito' | 'invitado' | 'activo' | 'inactivo'
export const estadoAcceso = (u: Usuario): EstadoAcceso =>
  !u.activo ? 'inactivo' : u.ultimo_ingreso ? 'activo' : u.perfil_id || u.invitado_en ? 'invitado' : 'preinscrito'

export async function listarUsuarios(): Promise<Usuario[]> {
  return ok(await supabase.rpc('usuarios_admin')) as Usuario[]
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
