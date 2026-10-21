// Operación BEL · Edge Function: invitar usuarios por correo.
// Solo administración de formación o técnica. Usa la clave de servicio, que vive en Supabase y nunca llega al navegador.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...cors, 'Content-Type': 'application/json' } })

// Solo se aceptan enlaces de retorno hacia estas direcciones
const RETORNOS = ['https://gecacreativo.github.io/operacion-bel/', 'http://localhost:5173/']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  // 1. ¿Quién llama? Debe ser administración.
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: quien } = await admin.auth.getUser(token)
  if (!quien?.user) return responder({ error: 'Sesión no válida' }, 401)
  const { data: roles } = await admin.from('perfil_roles').select('rol').eq('perfil_id', quien.user.id)
  if (!roles?.some((r) => r.rol === 'admin_formacion' || r.rol === 'admin_tecnico')) return responder({ error: 'No autorizado' }, 403)

  // 2. Datos de la solicitud
  const { correos, retorno } = await req.json().catch(() => ({}))
  if (!Array.isArray(correos) || !correos.length || correos.length > 100) return responder({ error: 'Envía entre 1 y 100 correos' }, 400)
  const redirectTo = RETORNOS.includes(retorno) ? retorno : RETORNOS[0]

  // 3. Invitar o reenviar acceso
  const resultados: { correo: string; estado: 'invitado' | 'reenviado' | 'error'; detalle?: string }[] = []
  for (const bruto of correos) {
    const correo = String(bruto).trim().toLowerCase()
    const { data: pre } = await admin.from('preasignaciones').select('correo').eq('correo', correo).maybeSingle()
    if (!pre) { resultados.push({ correo, estado: 'error', detalle: 'No está preinscrito' }); continue }
    const { data: perfil } = await admin.from('perfiles').select('id').eq('correo', correo).maybeSingle()
    if (!perfil) {
      const { error } = await admin.auth.admin.inviteUserByEmail(correo, { redirectTo })
      resultados.push(error ? { correo, estado: 'error', detalle: error.message } : { correo, estado: 'invitado' })
    } else {
      // Ya tiene cuenta: se le envía un enlace para crear o cambiar su contraseña
      const { error } = await admin.auth.resetPasswordForEmail(correo, { redirectTo })
      resultados.push(error ? { correo, estado: 'error', detalle: error.message } : { correo, estado: 'reenviado' })
    }
    if (resultados.at(-1)!.estado !== 'error') {
      await admin.from('preasignaciones').update({ invitado_en: new Date().toISOString() }).eq('correo', correo)
      await admin.from('auditoria').insert({ actor: quien.user.id, accion: 'invitar_usuario', tabla: 'auth.users', registro: correo, motivo: resultados.at(-1)!.estado })
    }
  }
  return responder({ resultados })
})
