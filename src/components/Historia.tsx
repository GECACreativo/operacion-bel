import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BIENVENIDA, DOS_ESPACIOS, ELITE, HISTORIAS, IDENTIDAD, REFUERZO_GENERAL } from '../data/historia'
import { MODULOS } from '../data/modulos'
import { useEstado } from '../estado'
import { ICONOS, IconoModulo } from './Insignia'
import { Medalla } from './UI'
import { Logos, Marca } from './Marco'

// Íconos de apoyo (mismo estilo de línea de BEL). Siempre acompañan un texto; nunca comunican solos.
const Svg = ({ children, className = 'h-6 w-6' }: { children: ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
)
const ICONO_IDENTIDAD: Record<string, ReactNode> = {
  participante: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  bel: ICONOS.M00,
  misiones: <><path d="M4 22V4h11l-2 4 2 4H4" /></>,
  retos: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  progresion: <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>,
  elite: ICONOS.M02,
  final: ICONOS.RI,
}
export const IconoDesafio = ({ className }: { className?: string }) => <Svg className={className}>{ICONO_IDENTIDAD.retos}</Svg>

/** Recordatorio central: la práctica ocurre en BEL; el registro, en Operación BEL. */
export function DosEspacios({ compacto = false }: { compacto?: boolean }) {
  const col = (titulo: string, puntos: string[], icono: ReactNode, clase: string) => (
    <div className={`rounded-2xl p-4 ${clase}`}>
      <p className="flex items-center gap-2 font-black"><Svg className="h-5 w-5 shrink-0">{icono}</Svg>{titulo}</p>
      {!compacto && <ul className="mt-2 space-y-1 text-sm">{puntos.map((p) => <li key={p} className="flex gap-2"><span aria-hidden>·</span>{p}</li>)}</ul>}
    </div>
  )
  return (
    <section aria-label="Dónde se hace cada parte" className="space-y-3">
      <p className="text-sm font-bold">{DOS_ESPACIOS.resumen}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {col(DOS_ESPACIOS.bel.titulo, DOS_ESPACIOS.bel.puntos, ICONOS.M00, 'bg-dagrd-azul/10 text-dagrd-petroleo')}
        {col(DOS_ESPACIOS.operacion.titulo, DOS_ESPACIOS.operacion.puntos, ICONO_IDENTIDAD.progresion, 'bg-dagrd-amarillo/25 text-dagrd-navy')}
      </div>
    </section>
  )
}

/** Mueve el foco al título de cada paso, para lectores de pantalla y teclado. */
function useFocoTitulo(dep: unknown) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => { ref.current?.focus() }, [dep])
  return ref
}

/** Bienvenida de la primera entrada (se puede volver a ver desde Mi Operación). */
export function Bienvenida({ alTerminar, repaso = false }: { alTerminar: () => void; repaso?: boolean }) {
  const { perfil, esElite } = useEstado()
  const pasos = esElite ? 3 : 2
  const [paso, setPaso] = useState(0)
  const titulo = useFocoTitulo(paso)
  const nombre = perfil?.nombre.split(' ')[0]

  const contenido = [
    <div key="b" className="aparecer">
      <p className="etiqueta text-dagrd-amarillo">Mensaje de bienvenida</p>
      <h1 ref={titulo} tabIndex={-1} className="mt-2 text-3xl font-black leading-tight outline-none sm:text-4xl">
        {nombre ? `${nombre}, prepárate` : 'Prepárate'} para cada desafío
      </h1>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-white/85 sm:text-lg">
        {BIENVENIDA.parrafos.map((t) => <p key={t}>{t}</p>)}
      </div>
      <p className="sello mt-6 bg-dagrd-amarillo text-base text-dagrd-navy">{BIENVENIDA.cierre}</p>
    </div>,
    <div key="i" className="aparecer">
      <p className="etiqueta text-dagrd-amarillo">Así funciona tu entrenamiento</p>
      <h1 ref={titulo} tabIndex={-1} className="mt-2 text-3xl font-black leading-tight outline-none">Cada pieza de la operación</h1>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {IDENTIDAD.map((x) => (
          <li key={x.clave} className="flex gap-3 rounded-2xl bg-white/10 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dagrd-amarillo text-dagrd-navy"><Svg className="h-5 w-5">{ICONO_IDENTIDAD[x.clave]}</Svg></span>
            <span><span className="block font-black">{x.titulo}</span><span className="text-sm text-white/80">{x.texto}</span></span>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-3xl bg-white p-5 text-dagrd-navy"><DosEspacios /></div>
    </div>,
    <div key="e" className="aparecer">
      <p className="etiqueta text-dagrd-amarillo">Grupo Élite</p>
      <h1 ref={titulo} tabIndex={-1} className="mt-2 text-3xl font-black leading-tight outline-none">{ELITE.apertura.titulo}</h1>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-white/85 sm:text-lg">
        {ELITE.apertura.parrafos.map((t) => <p key={t}>{t}</p>)}
      </div>
      <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm">Desde <span className="font-bold">Reportes</span> podrás registrar las barreras y dudas de BEL que encuentres en la operación.</p>
    </div>,
  ].slice(0, pasos)

  return (
    <div className="min-h-dvh bg-dagrd-fondo text-white">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <Marca />
          <span className="hidden sm:block"><Logos className="h-9" /></span>
        </header>
        <main className="flex-1 py-8" aria-live="polite">{contenido[paso]}</main>
        <nav aria-label="Pasos de la bienvenida" className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
          <div className="flex items-center gap-3">
            <ol className="flex gap-1.5" aria-hidden>
              {contenido.map((_, i) => <li key={i} className={`h-2 rounded-pill ${i === paso ? 'w-8 bg-dagrd-amarillo' : 'w-2 bg-white/30'}`} />)}
            </ol>
            <span className="text-sm text-white/70">Paso {paso + 1} de {pasos}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {paso > 0 && <button onClick={() => setPaso(paso - 1)} className="boton border border-white/30 text-white hover:bg-white/10">Anterior</button>}
            {paso < pasos - 1
              ? <button onClick={() => setPaso(paso + 1)} className="boton-primario">Continuar</button>
              : <button onClick={alTerminar} className="boton-primario">{repaso ? 'Volver a mi operación' : 'Comenzar mi ruta'}</button>}
          </div>
          {paso < pasos - 1 && <button onClick={alTerminar} className="w-full text-center text-sm text-white/60 underline-offset-4 hover:underline sm:w-auto">Saltar introducción</button>}
        </nav>
      </div>
    </div>
  )
}

/** Pantalla de apertura de una misión: se muestra antes de comenzarla. */
export function AperturaMision({ codigo, alComenzar }: { codigo: string; alComenzar: () => void }) {
  const { rol } = useEstado()
  const m = MODULOS[codigo]
  const h = HISTORIAS[codigo]
  const titulo = useFocoTitulo(codigo)
  const enRol = rol?.ruta[codigo]
  if (!m || !h) return null
  const ri = codigo === 'RI'

  return (
    <article className="aparecer mx-auto max-w-3xl space-y-5">
      <header className="relative overflow-hidden rounded-3xl bg-dagrd-fondo p-6 text-white sm:p-8">
        <span aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full border-[18px] border-white/[.06]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Medalla codigo={codigo} obtenida={false} tam="lg" oscuro />
          <div>
            <p className="etiqueta text-dagrd-amarillo">{ri ? 'Reto final' : `Misión ${codigo}`}</p>
            <h1 ref={titulo} tabIndex={-1} className="mt-1 text-3xl font-black leading-tight outline-none sm:text-4xl">{ri ? m.mision : m.nombre}</h1>
            <p className="mt-2 text-lg font-bold text-dagrd-amarillo">{h.proposito}</p>
          </div>
        </div>
      </header>

      <section className="tarjeta p-6 sm:p-8" aria-label="Historia de la misión">
        <div className="space-y-4 text-base leading-relaxed">
          {h.apertura.map((t, i) => <p key={i} className={i === h.apertura.length - 1 && ri ? 'font-bold' : ''}>{t}</p>)}
        </div>
      </section>

      <section className="tarjeta border-l-8 border-dagrd-amarillo p-6" aria-labelledby="t-desafio">
        <h2 id="t-desafio" className="flex items-center gap-2 text-xl font-black"><IconoDesafio className="h-6 w-6 text-dagrd-azul" />El desafío</h2>
        {Array.isArray(h.desafio)
          ? <ul className="mt-3 space-y-2">{h.desafio.map((d) => <li key={d} className="flex gap-3 text-sm leading-relaxed"><span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-dagrd-amarillo" />{d}</li>)}</ul>
          : <p className="mt-3 text-sm leading-relaxed">{h.desafio}</p>}
        {enRol && (
          <p className="mt-4 rounded-2xl bg-[#efefed] p-3 text-sm">
            <span className="font-bold">Tu papel: </span>{enRol.porRol.map((p) => enRol.porRol.length > 1 ? `${p.rol}: ${p.hace}` : p.hace).join(' · ')}
          </p>
        )}
      </section>

      <section className="tarjeta p-6"><DosEspacios /></section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link to="/ruta" className="boton-fantasma">Volver a mi ruta</Link>
        <button onClick={alComenzar} className="boton-primario text-base">{ri ? 'Comenzar el reto' : 'Comenzar misión'}</button>
      </div>
    </article>
  )
}

/** Mensaje al terminar: cierre si se aprobó, refuerzo si necesita volver a practicar. */
export function DesenlaceMision({ codigo, estado }: { codigo: string; estado: string }) {
  const h = HISTORIAS[codigo]
  if (!h) return null
  if (estado === 'aprobada' || estado === 'convalidada') {
    return (
      <section className="tarjeta aparecer flex gap-4 border-l-8 border-dagrd-petroleo p-6" aria-labelledby="t-desenlace">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-dagrd-petroleo text-white"><IconoModulo codigo={codigo} className="h-5 w-5" /></span>
        <div>
          <p className="etiqueta text-dagrd-petroleo">Misión superada</p>
          <h2 id="t-desenlace" className="mt-1 text-xl font-black">{h.cierre.titulo ?? '¡Misión completada!'}</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed">{h.cierre.texto.map((t) => <p key={t}>{t}</p>)}</div>
        </div>
      </section>
    )
  }
  if (estado === 'requiere_refuerzo') {
    return (
      <section className="tarjeta aparecer flex gap-4 border-l-8 border-orange-400 p-6" aria-labelledby="t-desenlace">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-800"><IconoDesafio className="h-5 w-5" /></span>
        <div>
          <p className="etiqueta text-orange-800">Requiere refuerzo</p>
          <h2 id="t-desenlace" className="mt-1 text-xl font-black">Una práctica más y estarás listo</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed">{(h.refuerzo ?? REFUERZO_GENERAL).map((t) => <p key={t}>{t}</p>)}</div>
        </div>
      </section>
    )
  }
  return null
}
