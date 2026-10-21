import { useId, type ReactNode, type SVGProps } from 'react'

/**
 * Insignias de Operación BEL.
 * Cada misión lleva el ícono de su módulo en BEL (mismo set de íconos del menú del sistema: Lucide, licencia ISC)
 * dentro de una forma que identifica su grupo del menú, con una combinación propia de colores DAGRD.
 *   · Gestión de Novedades (M01–M05) → hexágono
 *   · Minuta Digital e Informe por Turno (M06, M10) → sello dentado (registro oficial)
 *   · Centro de Formación y Seguridad Humana (M07, M08) → escudo (personas y protección)
 *   · Dashboard, Nómina y Administración (M00, M09, M11) → placa (sistema)
 *   · Reto integrador → estrella de 12 puntas
 * Pendiente: gris opaco. Obtenida: versión dorada. (ESTILOS conserva la paleta DAGRD por módulo para usos futuros.)
 */

const C = { amarillo: '#fddb16', navy: '#1f2b3f', fondo: '#232c4b', petroleo: '#00394b', azul: '#0086c3', gris: '#d3d3d1', blanco: '#ffffff' }

type Forma = 'hexagono' | 'sello' | 'escudo' | 'placa' | 'estrella'
interface Estilo { forma: Forma; fondo: string; anillo: string; icono: string; cinta: string; textoCinta: string; dibujo: ReactNode }

const p = (d: string) => <path d={d} />

// Íconos de los módulos de BEL (Lucide)
const ICONOS: Record<string, ReactNode> = {
  M00: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>,
  M01: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  M02: <>{p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2')}<circle cx="9" cy="7" r="4" />{p('M22 21v-2a4 4 0 0 0-3-3.87')}{p('M16 3.13a4 4 0 0 1 0 7.75')}</>,
  // Máquina de bomberos (diseño propio en el estilo de los íconos de BEL)
  M03: <>{p('M2 18V11a1 1 0 0 1 1-1h11v8')}{p('M14 12h4l3 3.5V18h-1.5')}{p('M4.5 18H2')}{p('M8.5 18h6.5')}<circle cx="6.5" cy="18" r="2" /><circle cx="17.5" cy="18" r="2" />{p('M4 7.2 13 3.5')}{p('M4.8 9.3 13.8 5.6')}{p('M7 6l.7 2')}{p('M10 4.8l.7 2')}{p('M17 10v2')}</>,
  M04: p('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'),
  // Estación de bomberos (diseño propio en el estilo de los íconos de BEL)
  M05: <>{p('M2 21h20')}{p('M3 21v-9l6.5-4.5L16 12v9')}{p('M6 21v-5.5h7V21')}{p('M6 18.2h7')}{p('M16 21V8h5v13')}{p('M18.5 11v1.5')}{p('M18.5 8V3l2.5 1-2.5 1')}</>,
  M06: <>{p('M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20')}{p('M8 11h8')}{p('M8 7h6')}</>,
  M07: <>{p('M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z')}{p('M22 10v6')}{p('M6 12.5V16a6 3 0 0 0 12 0v-3.5')}</>,
  M08: p('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'),
  M09: <><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></>,
  M10: <>{p('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z')}{p('M14 2v4a2 2 0 0 0 2 2h4')}{p('M10 9H8')}{p('M16 13H8')}{p('M16 17H8')}</>,
  M11: <>{p('M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z')}<circle cx="12" cy="12" r="3" /></>,
  RI: p('M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'),
}

const ESTILOS: Record<string, Omit<Estilo, 'dibujo'>> = {
  M00: { forma: 'placa', fondo: C.navy, anillo: C.azul, icono: C.amarillo, cinta: C.amarillo, textoCinta: C.navy },
  M01: { forma: 'hexagono', fondo: C.petroleo, anillo: C.amarillo, icono: C.amarillo, cinta: C.amarillo, textoCinta: C.navy },
  M02: { forma: 'hexagono', fondo: C.azul, anillo: C.blanco, icono: C.blanco, cinta: C.navy, textoCinta: C.amarillo },
  M03: { forma: 'hexagono', fondo: C.amarillo, anillo: C.navy, icono: C.navy, cinta: C.navy, textoCinta: C.amarillo },
  M04: { forma: 'hexagono', fondo: C.navy, anillo: C.azul, icono: C.blanco, cinta: C.azul, textoCinta: C.blanco },
  M05: { forma: 'hexagono', fondo: C.gris, anillo: C.petroleo, icono: C.petroleo, cinta: C.petroleo, textoCinta: C.blanco },
  M06: { forma: 'sello', fondo: C.petroleo, anillo: C.blanco, icono: C.blanco, cinta: C.amarillo, textoCinta: C.navy },
  M07: { forma: 'escudo', fondo: C.azul, anillo: C.amarillo, icono: C.amarillo, cinta: C.amarillo, textoCinta: C.navy },
  M08: { forma: 'escudo', fondo: C.amarillo, anillo: C.petroleo, icono: C.petroleo, cinta: C.petroleo, textoCinta: C.amarillo },
  M09: { forma: 'placa', fondo: C.petroleo, anillo: C.azul, icono: C.amarillo, cinta: C.azul, textoCinta: C.blanco },
  M10: { forma: 'sello', fondo: C.blanco, anillo: C.azul, icono: C.azul, cinta: C.navy, textoCinta: C.blanco },
  M11: { forma: 'placa', fondo: C.azul, anillo: C.navy, icono: C.navy, cinta: C.navy, textoCinta: C.amarillo },
  RI: { forma: 'estrella', fondo: C.amarillo, anillo: C.navy, icono: C.navy, cinta: C.navy, textoCinta: C.amarillo },
}

// ── Formas (lienzo 100 × 100, centro 50,44) ──
const CX = 50, CY = 44
const poligono = (n: number, r: number, giro = -90) =>
  Array.from({ length: n }, (_, i) => { const a = ((giro + (360 / n) * i) * Math.PI) / 180; return `${(CX + r * Math.cos(a)).toFixed(2)},${(CY + r * Math.sin(a)).toFixed(2)}` }).join(' ')
const radial = (n: number, r1: number, r2: number) =>
  Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? r2 : r1; const a = ((-90 + (180 / n) * i) * Math.PI) / 180; return `${(CX + r * Math.cos(a)).toFixed(2)},${(CY + r * Math.sin(a)).toFixed(2)}` }).join(' ')

function Forma({ forma, ...props }: { forma: Forma } & SVGProps<SVGElement>) {
  const a = props as any
  switch (forma) {
    case 'hexagono': return <polygon points={poligono(6, 40)} strokeLinejoin="round" {...a} />
    case 'sello': return <polygon points={radial(18, 40, 36)} strokeLinejoin="round" {...a} />
    case 'estrella': return <polygon points={radial(12, 43, 33)} strokeLinejoin="round" {...a} />
    case 'escudo': return <path d="M50 4 L84 15 V42 C84 63 69 77 50 85 C31 77 16 63 16 42 V15 Z" strokeLinejoin="round" {...a} />
    case 'placa': return <rect x="12" y="6" width="76" height="76" rx="22" {...a} />
  }
}

export interface InsigniaProps {
  codigo: string
  obtenida: boolean
  /** px del lado */
  tam?: number
  /** fondo oscuro detrás (ajusta el estado pendiente) */
  oscuro?: boolean
  titulo?: string
  className?: string
}

export default function Insignia({ codigo, obtenida, tam = 64, oscuro = false, titulo, className = '' }: InsigniaProps) {
  const uid = useId().replace(/:/g, '')
  const e = ESTILOS[codigo] ?? ESTILOS.M00
  const interior = `translate(${CX} ${CY}) scale(.8) translate(${-CX} ${-CY})`
  const etiqueta = `Insignia ${codigo}${titulo ? ` «${titulo}»` : ''}: ${obtenida ? 'obtenida' : 'pendiente'}`
  // Pendiente: colores DAGRD del módulo. Obtenida: versión dorada.
  const k = obtenida
    ? { fondo: `url(#oro-${uid})`, anillo: '#8a6a00', icono: C.navy, cinta: C.navy, textoCinta: C.amarillo, borde: '#c99700' }
    : oscuro
      ? { fondo: 'rgba(255,255,255,.08)', anillo: 'rgba(255,255,255,.3)', icono: 'rgba(255,255,255,.5)', cinta: 'rgba(255,255,255,.18)', textoCinta: 'rgba(255,255,255,.75)', borde: 'rgba(255,255,255,.25)' }
      : { fondo: '#e4e4e1', anillo: '#b4b5b1', icono: '#9a9c97', cinta: '#cfd0cc', textoCinta: '#6b6f78', borde: '#c9cac6' }

  return (
    <svg viewBox="0 0 100 100" width={tam} height={tam} role="img" aria-label={etiqueta}
      className={`shrink-0 overflow-visible ${obtenida ? 'insignia-obtenida' : ''} ${className}`}>
      <title>{etiqueta}</title>
      {obtenida && (
        <defs>
          <linearGradient id={`oro-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff4a8" />
            <stop offset=".35" stopColor="#fddb16" />
            <stop offset=".7" stopColor="#e9b100" />
            <stop offset="1" stopColor="#c99700" />
          </linearGradient>
          <linearGradient id={`brillo-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".55" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`recorte-${uid}`}><Forma forma={e.forma} /></clipPath>
        </defs>
      )}
      {/* sombra suave */}
      {obtenida && <g transform="translate(0 3)" opacity=".22"><Forma forma={e.forma} fill="#8a6a00" /></g>}
      <Forma forma={e.forma} fill={k.fondo} stroke={k.borde} strokeWidth={obtenida ? 2 : 1.5} />
      {/* reflejo metálico */}
      {obtenida && (
        <g clipPath={`url(#recorte-${uid})`}>
          <rect x="0" y="0" width="100" height="44" fill={`url(#brillo-${uid})`} />
          <polygon points="18,90 40,0 52,0 30,90" fill="#fff" opacity=".22" />
        </g>
      )}
      {/* anillo interior punteado, como el sello del key visual */}
      <g transform={interior}>
        <Forma forma={e.forma} fill="none" stroke={k.anillo} strokeWidth={2.4} strokeDasharray={obtenida ? '1 5' : '2 6'} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
      {/* destellos al obtenerla */}
      {obtenida && (
        <g fill="#fddb16" stroke="#fff" strokeWidth=".8">
          <path d="M84 8 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <path d="M12 60 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z" />
        </g>
      )}
      {/* ícono del módulo en BEL */}
      <g transform={`translate(${CX - 15} ${CY - 16}) scale(1.25)`} fill="none" stroke={k.icono} strokeWidth={obtenida ? 2.1 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        {ICONOS[codigo]}
      </g>
      {/* cinta con el código */}
      <rect x={codigo === 'RI' ? 34 : 30} y="79" width={codigo === 'RI' ? 32 : 40} height="16" rx="8" fill={k.cinta} stroke="#fff" strokeWidth={obtenida ? 2 : 0} />
      <text x="50" y="90.6" textAnchor="middle" fontSize="10" fontWeight="900" letterSpacing=".5" fill={k.textoCinta}
        style={{ fontFamily: 'Metropolis, system-ui, sans-serif' }}>{codigo}</text>
    </svg>
  )
}
