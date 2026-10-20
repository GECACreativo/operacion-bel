import { createClient } from '@supabase/supabase-js'

// Datos públicos del proyecto de Supabase. La clave "publishable" está hecha para usarse en el navegador:
// la seguridad la dan las reglas (RLS) y las funciones del servidor, no esta clave.
export const SUPABASE_URL = 'https://gwuehqyetrsxaymfqkbb.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_9NsmzPIck7c2tn-Mooi8gQ_SG0wxmrU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // PKCE: el código de recuperación llega como ?code=… y no choca con las rutas con #
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Dirección a la que vuelven los enlaces de correo (recuperar contraseña). */
export const urlRetorno = () => window.location.origin + window.location.pathname
