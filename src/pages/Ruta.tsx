import { Link } from 'react-router-dom'
import { xpDe, xpMaxDe } from '../data/demo'
import { MODULOS } from '../data/modulos'
import { PARTICIPACION_TEXTO } from '../data/roles'
import { useEstado } from '../estado'
import { ChipEstado, Medalla } from '../components/UI'
import { SinRol } from './MiOperacion'
import { IconoCandado, IconoReloj } from '../components/Iconos'

export default function Ruta() {
  const { rol, progreso, perfil } = useEstado()
  if (!rol) return <SinRol nombre={perfil?.nombre} />

  return (
    <div>
      <header className="max-w-2xl">
        <p className="etiqueta text-dagrd-azul">Nivel 1 · Mi misión</p>
        <h1 className="mt-1 text-3xl font-black">Mi ruta de misiones</h1>
        <p className="mt-2 text-dagrd-navy/75">
          Como <strong>{rol.nombre}</strong> recorres {progreso.length - 1} módulos de BEL y el reto final «Mi turno en BEL». Solo aparecen las misiones de tu rol{(rol.roles?.length ?? 1) > 1 ? 'es (se suman las de todos)' : ''}.
        </p>
      </header>

      <ol className="relative mt-8 space-y-5 md:space-y-0">
        {/* Línea del camino */}
        <span aria-hidden className="absolute bottom-6 left-[27px] top-6 w-1 rounded-pill bg-dagrd-gris md:left-1/2 md:-ml-0.5" />
        {progreso.map((p, i) => {
          const m = MODULOS[p.codigo]
          const enRol = rol.ruta[p.codigo]
          const bloqueada = p.estado === 'bloqueada'
          const derecha = i % 2 === 1
          const tarjeta = (
            <div className={`tarjeta p-5 ${bloqueada ? 'opacity-75' : ''} ${p.estado === 'en_curso' ? 'ring-4 ring-dagrd-amarillo' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="etiqueta text-dagrd-navy/60">{p.codigo === 'RI' ? 'Reto integrador' : `${p.codigo} · ${m.nombre}`}</p>
                <ChipEstado estado={p.estado} />
              </div>
              <h2 className="mt-2 text-lg font-black leading-tight">{m.mision}</h2>
              {enRol && (
                <p className="mt-1 text-sm text-dagrd-navy/75">
                  {enRol.hace} · <span className="font-bold">{enRol.participacion.map((x) => PARTICIPACION_TEXTO[x]).join(', ')}</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-dagrd-navy/70">
                <span className="inline-flex items-center gap-1"><IconoReloj className="h-4 w-4" />{m.duracionH.toString().replace('.', ',')} h · {m.modalidad}</span>
                <span>{xpDe(p)}/{xpMaxDe(p)} XP</span>
              </div>
              {bloqueada ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-dagrd-navy/60"><IconoCandado className="h-4 w-4" />Se habilita al aprobar la misión anterior o cuando se registre tu asistencia a su sesión.</p>
              ) : (
                <Link to={`/mision/${p.codigo}`} className="mt-4 inline-flex min-h-[44px] items-center font-bold text-dagrd-azul hover:underline"
                  aria-label={`Ver misión ${p.codigo}: ${m.mision}`}>
                  {p.estado === 'aprobada' || p.estado === 'convalidada' ? 'Ver resultado' : 'Ver misión'} →
                </Link>
              )}
            </div>
          )
          return (
            <li key={p.codigo} className={`relative grid grid-cols-[56px_1fr] items-start gap-4 md:grid-cols-[1fr_56px_1fr] ${i > 0 ? "md:-mt-20" : ""}`}>
              <div className="hidden md:order-1 md:block">{!derecha && tarjeta}</div>
              <div className="relative z-10 flex justify-center pt-3 md:order-2">
                <Medalla codigo={p.codigo} obtenida={p.estado === 'aprobada' || p.estado === 'convalidada'} />
              </div>
              <div className="md:hidden">{tarjeta}</div>
              <div className="hidden md:order-3 md:block">{derecha && tarjeta}</div>
            </li>
          )
        })}
      </ol>
      <p className="mt-8 text-xs text-dagrd-navy/60">
        Asignación de misiones tomada del Mapa de Flujos BEL. Está <strong>por validar</strong> contra los permisos reales del sistema.
      </p>
    </div>
  )
}
