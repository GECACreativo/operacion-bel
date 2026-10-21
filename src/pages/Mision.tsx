import { Link, useParams } from 'react-router-dom'
import { xpDe, xpMaxDe } from '../data/demo'
import { MODULOS } from '../data/modulos'
import { PARTICIPACION_TEXTO } from '../data/roles'
import { useEstado } from '../estado'
import { fmtFecha } from './MiOperacion'
import { Barra, ChipEstado, IconoEvidencia, Medalla } from '../components/UI'
import { IconoAtras, IconoCalendario, IconoUbicacion, IconoUsuario } from '../components/Iconos'

const CICLO = ['Preparación', 'Sesión', 'Asistencia', 'Práctica', 'Cuestionario', 'Validación', 'Aprobación']

function pasoActual(evid: { tipo: string; estado: string }[], aprobada: boolean) {
  if (aprobada) return CICLO.length
  const ok = (t: string) => evid.find((e) => e.tipo === t)?.estado === 'validada'
  if (!ok('asistencia')) return 1
  if (!ok('reto')) return 3
  if (!ok('cuestionario')) return 4
  return 5
}

export default function Mision() {
  const { codigo = '' } = useParams()
  const { rol, progreso, sesiones } = useEstado()
  const m = MODULOS[codigo]
  const p = progreso.find((x) => x.codigo === codigo)

  if (!m || !p) {
    return (
      <div className="tarjeta p-8 text-center">
        <h1 className="text-2xl font-black">Esta misión no está en tu ruta</h1>
        <p className="mt-2 text-dagrd-navy/70">Tu rol actual no tiene asignado este módulo.</p>
        <Link to="/ruta" className="boton-secundario mt-6">Volver a mi ruta</Link>
      </div>
    )
  }

  const enRol = rol?.ruta[codigo]
  const aprobada = p.estado === 'aprobada'
  const paso = pasoActual(p.evidencias, aprobada)
  const sesion = sesiones.find((s) => s.codigo === codigo)

  return (
    <article className="space-y-6">
      <Link to="/ruta" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-dagrd-navy/70 hover:text-dagrd-navy">
        <IconoAtras className="h-4 w-4" /> Mi ruta
      </Link>

      {/* Encabezado */}
      <header className="relative overflow-hidden rounded-3xl bg-dagrd-fondo p-6 text-white sm:p-8">
        <span aria-hidden className="absolute -right-6 -top-6 h-40 w-28 rounded-b-pill bg-white/[.06]" />
        <span aria-hidden className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full border-[18px] border-white/[.05]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Medalla codigo={codigo} obtenida={aprobada} tam="lg" oscuro />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="etiqueta text-dagrd-amarillo">{codigo === 'RI' ? 'Reto integrador' : `Misión ${codigo} · ${m.nombre}`}</span>
              <ChipEstado estado={p.estado} />
            </div>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{m.mision}</h1>
            <p className="mt-1 text-white/75">{m.lema}</p>
          </div>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Modalidad', m.modalidad],
            ['Duración', `${m.duracionH.toString().replace('.', ',')} horas`],
            ['Tipo', m.tipo],
            ['En BEL', m.ubicacion],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/10 px-4 py-3">
              <dt className="etiqueta text-white/60">{k}</dt>
              <dd className="mt-0.5 text-sm font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Ciclo de la misión */}
      <section className="tarjeta p-5 sm:p-6" aria-labelledby="t-ciclo">
        <h2 id="t-ciclo" className="sr-only">Etapas de la misión</h2>
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {CICLO.map((c, i) => {
            const hecho = i < paso
            const actual = i === paso
            return (
              <li key={c} className="flex min-w-[96px] flex-1 flex-col items-center gap-2 text-center" aria-current={actual ? 'step' : undefined}>
                <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${hecho ? 'bg-dagrd-petroleo text-white' : actual ? 'bg-dagrd-amarillo text-dagrd-navy ring-4 ring-dagrd-amarillo/30' : 'bg-dagrd-gris/60 text-dagrd-navy/50'}`}>
                  {i + 1}
                </span>
                <span className={`text-xs font-bold ${hecho || actual ? '' : 'text-dagrd-navy/50'}`}>{c}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {enRol && (
            <section className="tarjeta border-l-8 border-dagrd-amarillo p-6" aria-labelledby="t-papel">
              <p className="etiqueta text-dagrd-azul">Tu papel como {rol?.nombre}</p>
              <h2 id="t-papel" className="mt-1 text-xl font-black">{enRol.hace}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {enRol.participacion.map((x) => (
                  <li key={x} className="rounded-pill bg-dagrd-navy px-3 py-1 text-xs font-bold text-white">{PARTICIPACION_TEXTO[x]}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-dagrd-navy/60">Se te evalúa solo sobre lo que tu rol hace en BEL.</p>
            </section>
          )}

          <section className="tarjeta p-6" aria-labelledby="t-mision">
            <h2 id="t-mision" className="text-xl font-black">La misión</h2>
            <dl className="mt-4 space-y-4">
              {[['Objetivo', m.objetivo], ['Reto', m.reto], ['Victoria', m.victoria]].map(([k, v]) => (
                <div key={k} className="grid gap-1 sm:grid-cols-[110px_1fr]">
                  <dt className="etiqueta pt-0.5 text-dagrd-azul">{k}</dt>
                  <dd className="text-sm leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="tarjeta p-6" aria-labelledby="t-reglas">
            <h2 id="t-reglas" className="text-xl font-black">Reglas de BEL que debes tener presentes</h2>
            <ul className="mt-3 space-y-2">
              {m.reglas.map((r) => (
                <li key={r} className="flex gap-3 text-sm"><span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-dagrd-amarillo" />{r}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="tarjeta p-6" aria-labelledby="t-evid">
            <h2 id="t-evid" className="text-xl font-black">Evidencias y experiencia</h2>
            <div className="mt-3">
              <Barra valor={xpDe(p) / xpMaxDe(p)} etiqueta="Experiencia de la misión" />
              <p className="mt-1 text-xs text-dagrd-navy/60">{xpDe(p)} de {xpMaxDe(p)} XP</p>
            </div>
            <ul className="mt-4 space-y-4">
              {p.evidencias.map((e) => (
                <li key={e.tipo} className="flex items-start gap-3">
                  <IconoEvidencia estado={e.estado} />
                  <span className="flex-1 text-sm">
                    <span className="font-bold">{e.etiqueta}</span>
                    <span className="block text-xs text-dagrd-navy/60">
                      {e.detalle ?? (e.estado === 'validada' ? 'Validada' : e.estado === 'no_aprobada' ? 'No lograda: puedes volver a intentarlo en un reto de refuerzo' : 'Pendiente')}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-dagrd-navy/60">+{e.xp}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-2xl bg-[#efefed] p-3 text-xs leading-relaxed">
              La misión se aprueba cuando cumples todas las evidencias obligatorias y los criterios críticos. La asistencia sola no la aprueba.
            </p>
            {!aprobada && (
              <div className="mt-4 grid gap-2">
                {p.estado === 'bloqueada'
                  ? <button className="boton-primario" disabled>Responder cuestionario</button>
                  : <Link to={`/mision/${codigo}/cuestionario`} className="boton-primario">
                      {p.evidencias.find((e) => e.tipo === 'cuestionario')?.estado === 'validada' ? 'Ver cuestionario' : 'Responder cuestionario'}
                    </Link>}
                <p className="text-center text-xs text-dagrd-navy/60">El reto práctico lo evalúa tu instructor en la sesión.</p>
              </div>
            )}
          </section>

          {sesion && (
            <section className="tarjeta p-6" aria-labelledby="t-sesion">
              <h2 id="t-sesion" className="text-xl font-black">Tu sesión</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2"><IconoCalendario className="h-4 w-4" />{fmtFecha(sesion.fecha)}</li>
                <li className="flex items-center gap-2"><IconoUbicacion className="h-4 w-4" />{sesion.lugar}</li>
                <li className="flex items-center gap-2"><IconoUsuario className="h-4 w-4" />{sesion.instructor}</li>
              </ul>
            </section>
          )}

          <section className="tarjeta flex items-center gap-4 p-6" aria-labelledby="t-insignia">
            <Medalla codigo={codigo} obtenida={aprobada} />
            <div>
              <p className="etiqueta text-dagrd-azul">Insignia</p>
              <h2 id="t-insignia" className="text-lg font-black">{m.insignia}</h2>
              <p className="text-xs text-dagrd-navy/60">{aprobada ? 'Obtenida' : 'Se otorga al aprobar la misión'}</p>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}
