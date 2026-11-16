import { useEffect, useRef, useState } from 'react'
import { useEstado } from '../estado'
import { NIVELES } from '../data/demo'
import { MODULOS } from '../data/modulos'
import { Medalla } from './UI'

// Aviso de logros: compara el avance actual con el último que vio la persona (guardado en este navegador)
// y muestra una ventana con la XP ganada, las insignias nuevas y el cambio de nivel.
// Detecta tanto lo que gana en la sesión (cuestionario) como lo que registró el instructor mientras no estaba (asistencia, reto).

interface Foto { xp: number; nivel: number; insignias: string[] }
const clave = (id: string) => `bel-logros-${id}`
const leer = (id: string): Foto | null => { try { const v = localStorage.getItem(clave(id)); return v ? JSON.parse(v) : null } catch { return null } }
const guardar = (id: string, f: Foto) => { try { localStorage.setItem(clave(id), JSON.stringify(f)) } catch { /* navegador sin almacenamiento */ } }

export default function Logros() {
  const { perfil, progreso, xp, nivel, fase } = useEstado()
  const [aviso, setAviso] = useState<{ xp: number; insignias: string[]; nivel: number | null; foto: Foto } | null>(null)
  const boton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (fase !== 'lista' || !perfil || !progreso.length) return
    const actual: Foto = { xp, nivel, insignias: progreso.filter((p) => p.estado === 'aprobada' || p.estado === 'convalidada').map((p) => p.codigo) }
    const antes = leer(perfil.id)
    if (!antes) { guardar(perfil.id, actual); return } // primera vez en este navegador: punto de partida, sin aviso
    const nuevas = actual.insignias.filter((c) => !antes.insignias.includes(c))
    const dxp = actual.xp - antes.xp
    const subio = actual.nivel > antes.nivel ? actual.nivel : null
    if (dxp > 0 || nuevas.length || subio !== null) setAviso({ xp: Math.max(0, dxp), insignias: nuevas, nivel: subio, foto: actual })
    else guardar(perfil.id, actual) // también registra bajadas (p. ej. una corrección) sin avisar
  }, [fase, perfil, progreso, xp, nivel])

  useEffect(() => { if (aviso) boton.current?.focus() }, [aviso])

  if (!aviso || !perfil) return null
  const cerrar = () => { guardar(perfil.id, aviso.foto); setAviso(null) }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-dagrd-navy/60 p-4" onKeyDown={(e) => e.key === 'Escape' && cerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="t-logro" className="aparecer w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-dagrd-fondo px-6 pb-5 pt-6 text-center text-white">
          <p className="etiqueta text-dagrd-amarillo">Actualización de tu avance</p>
          <h2 id="t-logro" className="mt-1 text-2xl font-black">
            {aviso.nivel !== null ? '¡Subiste de nivel!' : aviso.insignias.length ? (aviso.insignias.length > 1 ? '¡Nuevas insignias!' : '¡Nueva insignia!') : '¡Ganaste experiencia!'}
          </h2>
          {aviso.xp > 0 && <p className="mt-2 text-4xl font-black text-dagrd-amarillo">+{aviso.xp} XP</p>}
        </div>
        <div className="space-y-4 p-6">
          {aviso.nivel !== null && (
            <div className="rounded-2xl bg-dagrd-amarillo/20 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-dagrd-navy/70">Nivel {aviso.nivel}</p>
              <p className="text-lg font-black">{NIVELES[aviso.nivel]?.nombre}</p>
              <p className="text-sm text-dagrd-navy/75">{NIVELES[aviso.nivel]?.desc}</p>
            </div>
          )}
          {aviso.insignias.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-4">
              {aviso.insignias.map((c) => (
                <li key={c} className="w-28 text-center">
                  <div className="flex justify-center"><Medalla codigo={c} obtenida tam="lg" /></div>
                  <p className="mt-1 text-xs font-bold">{c === 'RI' ? 'Reto integrador' : `${c} · ${MODULOS[c]?.nombre ?? ''}`}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-center text-sm text-dagrd-navy/70">Llevas <strong>{aviso.foto.xp} XP</strong> en tu ruta.</p>
          <button ref={boton} onClick={cerrar} className="boton-primario w-full">Continuar</button>
        </div>
      </div>
    </div>
  )
}
