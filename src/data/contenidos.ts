import { supabase } from '../lib/supabase'

// Edición de cuestionarios y criterios de reto (solo administración de formación; lo garantiza RLS).

const ok = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(/violates foreign key|still referenced/i.test(r.error.message)
    ? 'No se puede borrar porque ya tiene respuestas registradas. Edítalo o desactívalo.' : r.error.message)
  return r.data
}

export interface OpcionAdmin { id: string; orden: number; texto: string; correcta: boolean }
export interface PreguntaAdmin { id: string; orden: number; enunciado: string; retroalimentacion: string | null; activo: boolean; opciones: OpcionAdmin[] }
export interface CuestionarioAdmin {
  id: string; titulo: string; descripcion: string | null; umbral: number; max_intentos: number | null
  validado: boolean; version: number; intentos: number; preguntas: PreguntaAdmin[]
}

export async function cuestionarioAdmin(modulo: string): Promise<CuestionarioAdmin | null> {
  const c = ok(await supabase.from('cuestionarios')
    .select('id, titulo, descripcion, umbral, max_intentos, validado, version, preguntas(id, orden, enunciado, retroalimentacion, activo, opciones!opciones_pregunta_id_fkey(id, orden, texto))')
    .eq('modulo_codigo', modulo).eq('activo', true).order('version', { ascending: false }).limit(1)) as any[]
  if (!c.length) return null
  const ids = (c[0].preguntas as any[]).map((p) => p.id)
  const correctas = ids.length ? ok(await supabase.from('opciones_correctas').select('opcion_id').in('pregunta_id', ids)) as any[] : []
  const set = new Set(correctas.map((x) => x.opcion_id))
  const { count } = await supabase.from('intentos').select('id', { count: 'exact', head: true }).eq('cuestionario_id', c[0].id)
  return {
    ...c[0], umbral: Number(c[0].umbral), intentos: count ?? 0,
    preguntas: (c[0].preguntas as any[]).sort((a, b) => a.orden - b.orden).map((p) => ({
      ...p, opciones: (p.opciones as any[]).sort((a, b) => a.orden - b.orden).map((o) => ({ ...o, correcta: set.has(o.id) })),
    })),
  }
}

export async function crearCuestionario(modulo: string, titulo: string) {
  ok(await supabase.from('cuestionarios').insert({ modulo_codigo: modulo, titulo }))
}

export async function actualizarCuestionario(id: string, datos: Partial<Pick<CuestionarioAdmin, 'titulo' | 'descripcion' | 'umbral' | 'max_intentos' | 'validado' | 'version'>>) {
  ok(await supabase.from('cuestionarios').update(datos).eq('id', id))
}

/** Guarda una pregunta con sus opciones y la opción correcta. Devuelve el id de la pregunta. */
export async function guardarPregunta(cuestionarioId: string, p: PreguntaAdmin, nueva: boolean): Promise<string> {
  const datos = { enunciado: p.enunciado.trim(), retroalimentacion: p.retroalimentacion?.trim() || null, orden: p.orden, activo: p.activo }
  const id = nueva
    ? (ok(await supabase.from('preguntas').insert({ ...datos, cuestionario_id: cuestionarioId }).select('id').single()) as any).id
    : (ok(await supabase.from('preguntas').update(datos).eq('id', p.id)), p.id)
  let correcta: string | null = null
  for (const [i, o] of p.opciones.entries()) {
    const texto = o.texto.trim()
    if (!texto) continue
    const oid = o.id.startsWith('nueva-')
      ? (ok(await supabase.from('opciones').insert({ pregunta_id: id, orden: i + 1, texto }).select('id').single()) as any).id
      : (ok(await supabase.from('opciones').update({ orden: i + 1, texto }).eq('id', o.id)), o.id)
    if (o.correcta) correcta = oid
  }
  if (correcta) ok(await supabase.rpc('marcar_correcta', { p_pregunta: id, p_opcion: correcta }))
  return id
}

export async function borrarOpcion(id: string) {
  ok(await supabase.from('opciones').delete().eq('id', id))
}

export interface CriterioAdmin { id: string; rol_bel_id: string | null; descripcion: string; critico: boolean; orden: number; activo: boolean; validado: boolean }

export async function criteriosAdmin(modulo: string): Promise<CriterioAdmin[]> {
  return ok(await supabase.from('criterios').select('id, rol_bel_id, descripcion, critico, orden, activo, validado')
    .eq('modulo_codigo', modulo).order('orden')) as CriterioAdmin[]
}

export async function guardarCriterio(modulo: string, c: CriterioAdmin, nuevo: boolean) {
  const datos = { rol_bel_id: c.rol_bel_id, descripcion: c.descripcion.trim(), critico: c.critico, orden: c.orden, activo: c.activo, validado: c.validado }
  if (nuevo) ok(await supabase.from('criterios').insert({ ...datos, modulo_codigo: modulo }))
  else ok(await supabase.from('criterios').update(datos).eq('id', c.id))
}

export async function rolesDelModulo(modulo: string): Promise<{ id: string; nombre: string }[]> {
  const f = ok(await supabase.from('rol_modulo').select('rol:rol_bel_id(id, nombre, orden)').eq('modulo_codigo', modulo)) as any[]
  return f.map((x) => x.rol).filter(Boolean).sort((a: any, b: any) => a.orden - b.orden)
}
