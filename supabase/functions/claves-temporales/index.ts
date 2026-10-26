// Operación BEL · Edge Function: asignar contraseñas temporales.
// Solo administración. Crea la cuenta si aún no existe (desde la preinscripción) o reemplaza la contraseña.
// La persona deberá cambiarla en su primer ingreso. Las contraseñas no se guardan: solo se devuelven una vez.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...cors, 'Content-Type': 'application/json' } })

const PALABRAS = ['Fuego', 'Rescate', 'Escala', 'Sirena', 'Turno', 'Casco', 'Alerta', 'Brigada', 'Bomba', 'Hidrante', 'Chaqueta', 'Estacion']
const azar = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n }
// Fácil de dictar y de escribir en el celular, pero única por persona. Ej.: Sirena-4827-Bel
const generar = () => `${PALABRAS[azar(PALABRAS.length)]}-${String(1000 + azar(9000))}-Bel`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  // 1. ¿Quién llama? Debe ser administración.
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: quien } = await admin.auth.getUser(token)
  if (!quien?.user) return responder({ error: 'Sesión no válida' }, 401)
  const { data: roles } = await admin.from('perfil_roles').select('rol').eq('perfil_id', quien.user.id)
  if (!roles?.some((r) => r.rol === 'admin_formacion' || r.rol === 'admin_tecnico')) return responder({ error: 'No autorizado' }, 403)

  // 2. Datos
  const { correos, clave } = await req.json().catch(() => ({}))
  if (!Array.isArray(correos) || !correos.length || correos.length > 100) return responder({ error: 'Envía entre 1 y 100 correos' }, 400)
  if (clave !== undefined && clave !== null && (typeof clave !== 'string' || clave.length < 8))
    return responder({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)

  const resultados: { correo: string; nombre?: string; estado: 'creado' | 'actualizado' | 'error'; clave?: string; detalle?: string }[] = []
  for (const bruto of correos) {
    const correo = String(bruto).trim().toLowerCase()
    const nueva = clave || generar()
    const { data: perfil } = await admin.from('perfiles').select('id, nombre').eq('correo', correo).maybeSingle()
    let estado: 'creado' | 'actualizado' = 'actualizado'
    let id = perfil?.id as string | undefined
    let nombre = perfil?.nombre as string | undefined
    if (!perfil) {
      const { data: pre } = await admin.from('preasignaciones').select('nombre').eq('correo', correo).maybeSingle()
      if (!pre) { resultados.push({ correo, estado: 'error', detalle: 'No está preinscrito' }); continue }
      const { data: creado, error } = await admin.auth.admin.createUser({ email: correo, password: nueva, email_confirm: true, user_metadata: { nombre: pre.nombre } })
      if (error || !creado.user) { resultados.push({ correo, estado: 'error', detalle: error?.message ?? 'No se pudo crear' }); continue }
      id = creado.user.id; nombre = pre.nombre; estado = 'creado'
    } else {
      // email_confirm: si antes se le envió una invitación que no abrió, la cuenta queda sin confirmar y no lo dejaría entrar
      const { error } = await admin.auth.admin.updateUserById(perfil.id, { password: nueva, email_confirm: true })
      if (error) { resultados.push({ correo, estado: 'error', detalle: error.message }); continue }
    }
    await admin.from('perfiles').update({ debe_cambiar_clave: true, clave_temporal_en: new Date().toISOString() }).eq('id', id)
    await admin.from('auditoria').insert({ actor: quien.user.id, accion: 'clave_temporal', tabla: 'auth.users', registro: correo, motivo: estado })
    resultados.push({ correo, nombre, estado, clave: nueva })
  }
  return responder({ resultados })
})
