import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, urlRetorno } from './lib/supabase'
import { cargarCompanias, cargarModulos, cargarPerfil, cargarRol, cargarRuta, cargarSesiones, type Perfil } from './data/api'
import { nivelDe } from './data/demo'
import type { ProgresoMision, Rol, Sesion } from './data/types'

// Estado de la sesión: autenticación real con Supabase y datos calculados en el servidor.

type Fase = 'cargando' | 'sin_sesion' | 'recuperacion' | 'lista' | 'error'

interface Estado {
  fase: Fase
  error: string | null
  ingresar: (correo: string, clave: string) => Promise<string | null>
  recuperar: (correo: string) => Promise<string | null>
  cambiarClave: (clave: string) => Promise<string | null>
  salir: () => Promise<void>
  recargar: () => Promise<void>
  perfil: Perfil | null
  rol: Rol | null
  progreso: ProgresoMision[]
  sesiones: Sesion[]
  companias: { nombre: string; avance: number; personas: number }[]
  xp: number
  xpMax: number
  nivel: number
  esGestor: boolean
}

const Ctx = createContext<Estado | null>(null)

const traducir = (m: string) =>
  /invalid login/i.test(m) ? 'Correo o contraseña incorrectos.'
  : /rate limit|too many/i.test(m) ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  : /password should be|weak/i.test(m) ? 'La contraseña no cumple los requisitos de seguridad (mínimo 8 caracteres).'
  : /network|fetch/i.test(m) ? 'No hay conexión con el servidor. Revisa tu internet.'
  : m

export function ProveedorEstado({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [fase, setFase] = useState<Fase>('cargando')
  const [error, setError] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [progreso, setProgreso] = useState<ProgresoMision[]>([])
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [companias, setCompanias] = useState<Estado['companias']>([])

  const cargarTodo = useCallback(async (s: Session) => {
    try {
      setError(null)
      await cargarModulos()
      const p = await cargarPerfil(s.user.id)
      const [r, ruta, ses, comp] = await Promise.all([cargarRol(p.rol_bel_id), cargarRuta(), cargarSesiones(p.id), cargarCompanias()])
      setPerfil(p); setRol(r); setProgreso(ruta); setSesiones(ses); setCompanias(comp)
      setFase('lista')
    } catch (e) {
      setError(traducir((e as Error).message))
      setFase('error')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      if (data.session) cargarTodo(data.session)
      else setFase('sin_sesion')
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSesion(s)
      if (evento === 'PASSWORD_RECOVERY') setFase('recuperacion')
      else if (evento === 'SIGNED_IN' && s) { setFase('cargando'); cargarTodo(s) }
      else if (evento === 'SIGNED_OUT') { setFase('sin_sesion'); setPerfil(null); setProgreso([]) }
    })
    return () => data.subscription.unsubscribe()
  }, [cargarTodo])

  const valor = useMemo<Estado>(() => {
    const total = (k: 'xp' | 'xpMax') => progreso.reduce((a, p) => a + (p[k] ?? 0), 0)
    return {
      fase, error, perfil, rol, progreso, sesiones, companias,
      xp: total('xp'), xpMax: total('xpMax'), nivel: nivelDe(progreso),
      esGestor: !!perfil?.roles.some((r) => r === 'admin_formacion' || r === 'admin_tecnico'),
      ingresar: async (correo, clave) => {
        const { error } = await supabase.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password: clave })
        return error ? traducir(error.message) : null
      },
      recuperar: async (correo) => {
        const { error } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase(), { redirectTo: urlRetorno() })
        return error ? traducir(error.message) : null
      },
      cambiarClave: async (clave) => {
        const { error } = await supabase.auth.updateUser({ password: clave })
        if (error) return traducir(error.message)
        if (sesion) { setFase('cargando'); await cargarTodo(sesion) }
        return null
      },
      salir: async () => { await supabase.auth.signOut() },
      recargar: async () => { if (sesion) await cargarTodo(sesion) },
    }
  }, [fase, error, perfil, rol, progreso, sesiones, companias, sesion, cargarTodo])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useEstado() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useEstado debe usarse dentro de ProveedorEstado')
  return v
}
