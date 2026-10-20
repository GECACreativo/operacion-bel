import { Link } from 'react-router-dom'
import { NIVELES, xpDe, xpMaxDe } from '../data/demo'
import { MODULOS } from '../data/modulos'
import { useEstado } from '../estado'
import { Anillo, Barra, ChipEstado, IconoEvidencia, Medalla } from '../components/UI'
import { IconoCalendario, IconoFlecha, IconoUbicacion } from '../components/Iconos'

export const fmtFecha = (iso: string) => {
  const t = new Date(iso).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default function MiOperacion() {
  const { rol, progreso, xp, xpMax, nivel, perfil, sesiones, companias } = useEstado()
  if (!rol || !perfil) return <SinRol nombre={perfil?.nombre} />
  const obligatorias = progreso.filter((p) => p.codigo !== 'RI')
  const aprobadas = obligatorias.filter((p) => p.estado === 'aprobada')
  const actual = progreso.find((p) => p.estado === 'en_curso') ?? progreso.find((p) => p.estado === 'disponible')

  return (
    <div className="space-y-6">

      {/* Resumen */}
      <section className="relative overflow-hidden rounded-3xl bg-dagrd-fondo p-6 text-white sm:p-8" aria-labelledby="t-resumen">
        <span aria-hidden className="absolute -right-16 -top-16 h-52 w-52 rounded-full border-[22px] border-white/[.06]" />
        <span aria-hidden className="absolute -bottom-10 right-24 hidden h-24 w-24 rounded-t-pill bg-white/[.06] sm:block" />
        <div className="relative grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <Anillo valor={obligatorias.length ? aprobadas.length / obligatorias.length : 0} tam={132} grosor={13} claro>
            <span>
              <span className="block text-3xl font-black">{aprobadas.length}<span className="text-lg text-white/60">/{obligatorias.length}</span></span>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/70">misiones</span>
            </span>
          </Anillo>
          <div>
            <p className="etiqueta text-dagrd-amarillo">Mi Operación</p>
            <h1 id="t-resumen" className="mt-1 text-2xl font-black sm:text-3xl">Hola, {perfil.nombre.split(' ')[0]}</h1>
            <p className="mt-1 text-white/75">{[rol.nombre, perfil.estacion, perfil.compania].filter(Boolean).join(' · ')}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="etiqueta text-white/60">Nivel</p>
                <p className="font-bold">{NIVELES[nivel].nombre}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="etiqueta text-white/60">Experiencia</p>
                <p className="font-bold"><span className="text-dagrd-amarillo">{xp} XP</span> <span className="text-white/60">de {xpMax}</span></p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="etiqueta text-white/60">Insignias</p>
                <p className="font-bold">{aprobadas.length}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-white/60">La XP muestra tu recorrido. Lo que acredita tu dominio son las misiones aprobadas.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Siguiente paso */}
        {actual && (
          <section className="tarjeta p-6" aria-labelledby="t-siguiente">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="etiqueta text-dagrd-azul">Tu siguiente paso</p>
                <h2 id="t-siguiente" className="mt-1 text-xl font-black">
                  {actual.codigo} · {MODULOS[actual.codigo].mision}
                </h2>
                <p className="text-sm text-dagrd-navy/70">{MODULOS[actual.codigo].nombre} — {rol.ruta[actual.codigo]?.hace}</p>
              </div>
              <ChipEstado estado={actual.estado} />
            </div>
            <div className="mt-4">
              <Barra valor={xpDe(actual) / xpMaxDe(actual)} etiqueta="Avance de la misión" />
              <p className="mt-1 text-xs text-dagrd-navy/60">{xpDe(actual)} de {xpMaxDe(actual)} XP en esta misión</p>
            </div>
            <ul className="mt-4 space-y-3">
              {actual.evidencias.map((e) => (
                <li key={e.tipo} className="flex items-center gap-3">
                  <IconoEvidencia estado={e.estado} />
                  <span className="flex-1 text-sm">
                    <span className="font-bold">{e.etiqueta}</span>
                    {e.detalle && <span className="block text-xs text-dagrd-navy/60">{e.detalle}</span>}
                  </span>
                  <span className="text-xs font-bold text-dagrd-navy/60">+{e.xp} XP</span>
                </li>
              ))}
            </ul>
            <Link to={`/mision/${actual.codigo}`} className="boton-secundario mt-6">Continuar misión <IconoFlecha /></Link>
          </section>
        )}

        {/* Sesiones */}
        <section className="tarjeta p-6" aria-labelledby="t-sesiones">
          <p className="etiqueta text-dagrd-azul">Agenda</p>
          <h2 id="t-sesiones" className="mt-1 text-xl font-black">Próximas sesiones</h2>
          {sesiones.length === 0 ? (
            <p className="mt-4 text-sm text-dagrd-navy/70">No tienes sesiones programadas.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sesiones.map((s) => (
                <li key={s.id} className="rounded-2xl bg-[#efefed] p-4">
                  <p className="font-bold">{s.codigo} · {MODULOS[s.codigo].nombre}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-dagrd-navy/80"><IconoCalendario className="h-4 w-4" />{fmtFecha(s.fecha)}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-dagrd-navy/80"><IconoUbicacion className="h-4 w-4" />{s.lugar}</p>
                  <span className="mt-2 inline-block rounded-pill bg-white px-2.5 py-1 text-xs font-bold">{s.modalidad}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Insignias */}
        <section className="tarjeta p-6" aria-labelledby="t-insignias">
          <div className="flex items-center justify-between">
            <h2 id="t-insignias" className="text-xl font-black">Mis insignias</h2>
            <Link to="/insignias" className="text-sm font-bold text-dagrd-azul hover:underline">Ver todas</Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-3">
            {progreso.map((p) => (
              <li key={p.codigo} title={MODULOS[p.codigo].insignia}>
                <Medalla codigo={p.codigo} obtenida={p.estado === 'aprobada'} tam="sm" />
                <span className="sr-only">{MODULOS[p.codigo].insignia}: {p.estado === 'aprobada' ? 'obtenida' : 'pendiente'}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Nuestra compañía */}
        <section className="tarjeta p-6" aria-labelledby="t-compania">
          <p className="etiqueta text-dagrd-azul">Nivel 2 · Nuestra compañía</p>
          <h2 id="t-compania" className="mt-1 text-xl font-black">Avance colectivo</h2>
          <ul className="mt-4 space-y-4">
            {companias.map((c) => (
              <li key={c.nombre}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={`font-bold ${c.nombre === perfil.compania ? 'text-dagrd-azul' : ''}`}>
                    {c.nombre}{c.nombre === perfil.compania && ' (la tuya)'}
                  </span>
                  <span className="font-bold">{Math.round(c.avance * 100)} %</span>
                </div>
                <Barra valor={c.avance} etiqueta={`Avance de ${c.nombre}`} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-dagrd-navy/60">Se calcula sobre la ruta asignada a cada persona, para que la comparación sea justa entre roles.</p>
        </section>
      </div>
    </div>
  )
}

export function SinRol({ nombre }: { nombre?: string }) {
  return (
    <div className="tarjeta mx-auto max-w-xl p-8 text-center">
      <h1 className="text-2xl font-black">Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}</h1>
      <p className="mt-2 text-dagrd-navy/75">Todavía no tienes un rol de BEL asignado, por eso no hay misiones en tu ruta. La administración de formación lo asignará pronto.</p>
    </div>
  )
}
