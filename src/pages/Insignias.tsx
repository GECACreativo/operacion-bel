import { NIVELES } from '../data/demo'
import { MODULOS } from '../data/modulos'
import { useEstado } from '../estado'
import { Medalla } from '../components/UI'

export default function Insignias() {
  const { progreso, nivel } = useEstado()
  const logro = (e: string) => e === 'aprobada' || e === 'convalidada'
  const obtenidas = progreso.filter((p) => logro(p.estado)).length

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black">Insignias y nivel</h1>
        <p className="mt-2 text-dagrd-navy/75">Has obtenido {obtenidas} de {progreso.length} insignias de tu ruta.</p>
      </header>

      <section aria-labelledby="t-niveles">
        <h2 id="t-niveles" className="text-xl font-black">Tu nivel</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NIVELES.map((n, i) => (
            <li key={n.nombre} aria-current={i === nivel ? 'true' : undefined}
              className={`rounded-3xl p-5 ${i === nivel ? 'bg-dagrd-fondo text-white' : i < nivel ? 'tarjeta' : 'tarjeta opacity-60'}`}>
              <p className={`etiqueta ${i === nivel ? 'text-dagrd-amarillo' : 'text-dagrd-azul'}`}>Nivel {i + 1}{i === nivel && ' · actual'}</p>
              <p className="mt-1 font-black">{n.nombre}</p>
              <p className={`mt-1 text-xs ${i === nivel ? 'text-white/70' : 'text-dagrd-navy/60'}`}>{n.desc}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-dagrd-navy/60">El nivel depende de las misiones aprobadas, no de la cantidad de XP. No equivale a una certificación oficial.</p>
      </section>

      <section aria-labelledby="t-lista">
        <h2 id="t-lista" className="text-xl font-black">Insignias de tu ruta</h2>
        <p className="mt-1 text-sm text-dagrd-navy/70">Cada insignia lleva el ícono del módulo de BEL que dominaste. La forma indica su grupo en el menú de BEL.</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {progreso.map((p) => {
            const ok = logro(p.estado)
            const m = MODULOS[p.codigo]
            return (
              <li key={p.codigo} className={`tarjeta relative flex flex-col items-center overflow-hidden p-5 text-center ${ok ? 'ring-2 ring-dagrd-amarillo' : ''}`}>
                {ok && <span aria-hidden className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-dagrd-amarillo/25" />}
                <Medalla codigo={p.codigo} obtenida={ok} tam="xl" />
                <p className={`mt-3 text-sm font-black leading-tight ${ok ? '' : 'text-dagrd-navy/70'}`}>{m.insignia}</p>
                <p className="mt-1 text-[11px] leading-snug text-dagrd-navy/60">{m.ubicacion}</p>
                <p className={`mt-2 rounded-pill px-2.5 py-0.5 text-[11px] font-bold ${ok ? 'bg-dagrd-petroleo text-white' : 'bg-[#efefed] text-dagrd-navy/60'}`}>
                  {p.estado === 'convalidada' ? 'Convalidada' : ok ? 'Obtenida' : 'Pendiente'}
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
