import type { ReactNode } from 'react'
import type { EstadoMision, Evidencia } from '../data/types'
import { IconoCandado, IconoCheck, IconoReloj } from './Iconos'

export const ESTADO_INFO: Record<EstadoMision, { texto: string; clase: string }> = {
  bloqueada: { texto: 'Bloqueada', clase: 'bg-dagrd-gris/60 text-dagrd-navy/70' },
  disponible: { texto: 'Pendiente de asistencia', clase: 'bg-dagrd-azul/10 text-dagrd-azul' },
  en_curso: { texto: 'En curso', clase: 'bg-dagrd-amarillo text-dagrd-navy' },
  pendiente_validacion: { texto: 'Pendiente de validación', clase: 'bg-dagrd-amarillo/40 text-dagrd-navy' },
  requiere_refuerzo: { texto: 'Requiere refuerzo', clase: 'bg-orange-100 text-orange-800' },
  aprobada: { texto: 'Aprobada', clase: 'bg-dagrd-petroleo text-white' },
  convalidada: { texto: 'Convalidada', clase: 'bg-dagrd-petroleo/80 text-white' },
}

export function ChipEstado({ estado }: { estado: EstadoMision }) {
  const i = ESTADO_INFO[estado]
  return <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-bold ${i.clase}`}>{i.texto}</span>
}

/** Anillo de progreso (forma circular del key visual). */
export function Anillo({ valor, tam = 120, grosor = 12, children, claro = false }: { valor: number; tam?: number; grosor?: number; children?: ReactNode; claro?: boolean }) {
  const r = (tam - grosor) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, valor))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90" aria-hidden>
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" strokeWidth={grosor} className={claro ? 'stroke-white/15' : 'stroke-dagrd-gris/70'} />
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" strokeWidth={grosor} strokeLinecap="round" className="stroke-dagrd-amarillo"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Barra({ valor, claro = false, etiqueta }: { valor: number; claro?: boolean; etiqueta: string }) {
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-pill ${claro ? 'bg-white/15' : 'bg-dagrd-gris/70'}`} role="progressbar"
      aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valor * 100)}>
      <div className="h-full rounded-pill bg-dagrd-amarillo" style={{ width: `${Math.round(valor * 100)}%` }} />
    </div>
  )
}

export function IconoEvidencia({ estado }: { estado: Evidencia['estado'] }) {
  if (estado === 'validada')
    return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-dagrd-petroleo text-white"><IconoCheck className="h-4 w-4" /></span>
  if (estado === 'en_revision')
    return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-dagrd-amarillo text-dagrd-navy"><IconoReloj className="h-4 w-4" /></span>
  if (estado === 'no_aprobada')
    return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-dashed border-orange-400 text-orange-700 text-xs font-bold">–</span>
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-dagrd-gris text-dagrd-navy/40"><IconoCandado className="h-3.5 w-3.5" /></span>
}

/** Medallón de insignia. */
export function Medalla({ codigo, obtenida, tam = 'md', oscuro = false }: { codigo: string; obtenida: boolean; tam?: 'sm' | 'md' | 'lg'; oscuro?: boolean }) {
  const t = tam === 'lg' ? 'h-20 w-20 text-lg' : tam === 'sm' ? 'h-11 w-11 text-[11px]' : 'h-14 w-14 text-sm'
  return (
    <span className={`relative grid ${t} shrink-0 place-items-center rounded-full font-black ${obtenida ? 'bg-dagrd-amarillo text-dagrd-navy ring-4 ring-dagrd-amarillo/30' : oscuro ? 'bg-white/10 text-white/80 ring-4 ring-white/10' : 'bg-dagrd-gris/50 text-dagrd-navy/40 ring-4 ring-transparent'}`}>
      <span className={`absolute inset-[4px] rounded-full border-2 ${obtenida ? 'border-dagrd-navy/25' : oscuro ? 'border-white/25' : 'border-dagrd-navy/10'} border-dashed`} aria-hidden />
      {codigo}
    </span>
  )
}

export function AvisoPrototipo() {
  return (
    <p className="rounded-2xl bg-dagrd-azul/10 px-4 py-3 text-xs leading-relaxed text-dagrd-petroleo">
      <strong>Prototipo con datos ficticios.</strong> No registra información real ni se conecta con BEL. Úsalo para revisar diseño, textos y recorrido.
    </p>
  )
}
