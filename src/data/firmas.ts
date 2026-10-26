import { supabase } from '../lib/supabase'

// Firma de asistencia del participante. Las imágenes viven en el depósito privado «firmas», en la carpeta de cada persona.

const ok = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message.replace(/^.*?:\s*/, ''))
  return r.data
}

export interface FirmaPendiente { sesion_id: string; inicio: string; modulo_codigo: string; mision: string; modalidad: string; lugar: string | null }

export async function firmasPendientes(): Promise<FirmaPendiente[]> {
  return ok(await supabase.rpc('firmas_pendientes')) as FirmaPendiente[]
}

/** Sube la imagen de la firma a la carpeta de la persona y devuelve su ruta. */
export async function subirFirma(perfilId: string, archivo: Blob): Promise<string> {
  const ext = archivo.type === 'image/jpeg' ? 'jpg' : archivo.type === 'image/webp' ? 'webp' : 'png'
  const ruta = `${perfilId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('firmas').upload(ruta, archivo, { contentType: archivo.type || 'image/png', upsert: false })
  if (error) throw new Error(/size|large/i.test(error.message) ? 'La imagen es muy pesada (máximo 1 MB).' : error.message)
  return ruta
}

export async function firmarAsistencia(sesionId: string, ruta: string, guardar: boolean) {
  ok(await supabase.rpc('firmar_asistencia', { p_sesion: sesionId, p_path: ruta, p_guardar: guardar }))
}

/** Enlaces temporales (10 min) para ver firmas del depósito privado. */
export async function enlacesFirmas(rutas: string[]): Promise<Record<string, string>> {
  if (!rutas.length) return {}
  const { data, error } = await supabase.storage.from('firmas').createSignedUrls(rutas, 600)
  if (error || !data) return {}
  return Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]))
}
