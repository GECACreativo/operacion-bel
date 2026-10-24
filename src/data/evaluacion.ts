import { supabase } from '../lib/supabase'

// Cuestionarios y retos prácticos. La calificación y la XP se calculan en el servidor;
// las respuestas correctas nunca llegan al navegador antes de enviar.

const ok = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message.replace(/^.*?:\s*/, ''))
  return r.data
}

export interface Pregunta { id: string; orden: number; enunciado: string; opciones: { id: string; texto: string }[] }
export interface Cuestionario {
  id: string; titulo: string; descripcion: string | null; umbral: number; max_intentos: number | null; validado: boolean
  preguntas: Pregunta[]; intentos: { puntaje: number; aprobado: boolean; enviado_en: string }[]
}
export interface Resultado {
  puntaje: number; aprobado: boolean; correctas: number; total: number
  detalle: { pregunta_id: string; correcta: boolean; retroalimentacion: string | null }[]
}

/** Mezcla las opciones para que la respuesta correcta no quede siempre en el mismo lugar. */
const mezclar = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

export async function cargarCuestionario(modulo: string, perfilId: string): Promise<Cuestionario | null> {
  const c = ok(await supabase.from('cuestionarios')
    .select('id, titulo, descripcion, umbral, max_intentos, validado, preguntas(id, orden, enunciado, opciones!opciones_pregunta_id_fkey(id, orden, texto))')
    .eq('modulo_codigo', modulo).eq('activo', true).eq('preguntas.activo', true).order('version', { ascending: false }).limit(1)) as any[]
  if (!c.length) return null
  const intentos = ok(await supabase.from('intentos').select('puntaje, aprobado, enviado_en')
    .eq('cuestionario_id', c[0].id).eq('perfil_id', perfilId).order('enviado_en', { ascending: false })) as any[]
  return {
    ...c[0], umbral: Number(c[0].umbral), intentos,
    preguntas: (c[0].preguntas as any[]).sort((a, b) => a.orden - b.orden)
      .map((p) => ({ id: p.id, orden: p.orden, enunciado: p.enunciado, opciones: mezclar(p.opciones) })),
  }
}

export async function enviarCuestionario(id: string, respuestas: Record<string, string>): Promise<Resultado> {
  return ok(await supabase.rpc('enviar_cuestionario', { p_cuestionario: id, p_respuestas: respuestas })) as Resultado
}

export interface Criterio { id: string; descripcion: string; critico: boolean; orden: number; rol_bel_id?: string | null; rol?: string | null }

/** Criterios que aplican a la persona en la misión: los generales y los de todos sus roles BEL (sin repetir). */
export async function criteriosPara(modulo: string, perfilId: string): Promise<Criterio[]> {
  return ok(await supabase.rpc('criterios_para', { p_perfil: perfilId, p_modulo: modulo })) as Criterio[]
}

export interface EvaluacionPrevia { aprobado: boolean; autonomo: boolean; fecha: string; observaciones: string | null; resultados: Record<string, boolean> }

export async function ultimaEvaluacion(perfilId: string, modulo: string): Promise<EvaluacionPrevia | null> {
  const e = ok(await supabase.from('evaluaciones_reto')
    .select('aprobado, autonomo, fecha, observaciones, resultados_criterio(criterio_id, cumple)')
    .eq('perfil_id', perfilId).eq('modulo_codigo', modulo).order('fecha', { ascending: false }).limit(1)) as any[]
  if (!e.length) return null
  return { ...e[0], resultados: Object.fromEntries((e[0].resultados_criterio ?? []).map((r: any) => [r.criterio_id, r.cumple])) }
}

export async function evaluarReto(perfilId: string, modulo: string, resultados: Record<string, boolean>, autonomo: boolean, observaciones: string) {
  return ok(await supabase.rpc('evaluar_reto', {
    p_perfil: perfilId, p_modulo: modulo, p_resultados: resultados, p_autonomo: autonomo, p_observaciones: observaciones || null,
  })) as { aprobado: boolean; cumplidos: number; total: number; critico_fallido: boolean }
}

export interface ResultadosMision {
  asistencias: { inicio: string; modalidad: string; presente: boolean; estado_sesion: string; cuenta: boolean }[]
  retos: { fecha: string; aprobado: boolean; autonomo: boolean; observaciones: string | null; evaluador: string | null
           criterios: { descripcion: string; critico: boolean; cumple: boolean }[] }[]
  intentos: { fecha: string; puntaje: number; aprobado: boolean }[]
  ultimo_intento: { enunciado: string; respuesta: string | null; correcta: boolean; retroalimentacion: string | null }[]
}

/** Resultados propios en una misión: asistencia, reto práctico, autonomía y cuestionario. */
export async function resultadosMision(modulo: string): Promise<ResultadosMision> {
  return ok(await supabase.rpc('resultados_mision', { p_modulo: modulo })) as ResultadosMision
}
