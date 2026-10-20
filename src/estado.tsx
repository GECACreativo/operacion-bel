import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { nivelDe, PARTICIPANTE_DEMO, progresoDemo, xpDe, xpMaxDe } from './data/demo'
import { rolPorId } from './data/roles'
import type { ProgresoMision, Rol } from './data/types'

// Estado de la sesión del prototipo. En el Paso 3 se conecta con Supabase Auth.

interface Estado {
  autenticado: boolean
  ingresar: (rolId: string) => void
  salir: () => void
  rol: Rol
  cambiarRol: (rolId: string) => void
  progreso: ProgresoMision[]
  xp: number
  xpMax: number
  nivel: number
  participante: typeof PARTICIPANTE_DEMO
}

const Ctx = createContext<Estado | null>(null)

export function ProveedorEstado({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(false)
  const [rolId, setRolId] = useState(PARTICIPANTE_DEMO.rolId)

  const valor = useMemo<Estado>(() => {
    const rol = rolPorId(rolId)
    const progreso = progresoDemo(rol)
    return {
      autenticado,
      ingresar: (id) => { setRolId(id); setAutenticado(true) },
      salir: () => setAutenticado(false),
      rol,
      cambiarRol: setRolId,
      progreso,
      xp: progreso.reduce((s, p) => s + xpDe(p), 0),
      xpMax: progreso.reduce((s, p) => s + xpMaxDe(p), 0),
      nivel: nivelDe(progreso),
      participante: { ...PARTICIPANTE_DEMO, rolId },
    }
  }, [autenticado, rolId])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useEstado() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useEstado debe usarse dentro de ProveedorEstado')
  return v
}
