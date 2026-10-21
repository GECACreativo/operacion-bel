import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cargarCuestionario, enviarCuestionario, type Cuestionario as TCuestionario, type Resultado } from '../data/evaluacion'
import { MODULOS } from '../data/modulos'
import { useEstado } from '../estado'
import { IconoAtras, IconoCheck } from '../components/Iconos'

export default function Cuestionario() {
  const { codigo = '' } = useParams()
  const { perfil, progreso, recargar } = useEstado()
  const [c, setC] = useState<TCuestionario | null | undefined>(undefined)
  const [resp, setResp] = useState<Record<string, string>>({})
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const mision = progreso.find((p) => p.codigo === codigo)

  const cargar = () => { if (perfil) cargarCuestionario(codigo, perfil.id).then(setC).catch((e) => setError(e.message)) }
  useEffect(cargar, [codigo, perfil])

  const volver = <Link to={`/mision/${codigo}`} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-dagrd-navy/70 hover:text-dagrd-navy"><IconoAtras className="h-4 w-4" /> Volver a la misión</Link>

  const conAsistencia = mision?.evidencias.find((e) => e.tipo === 'asistencia')?.estado === 'validada' || !!mision?.habilitacion
  if (!mision || !conAsistencia) return <div className="space-y-4">{volver}<p className="tarjeta p-6">El cuestionario se habilita cuando tu instructor registra tu asistencia a la sesión de esta misión.</p></div>
  if (error && !c) return <div className="space-y-4">{volver}<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p></div>
  if (c === undefined) return <p role="status">Cargando cuestionario…</p>
  if (c === null) return <div className="space-y-4">{volver}<p className="tarjeta p-6">Esta misión aún no tiene cuestionario.</p></div>

  const yaAprobado = c.intentos.some((i) => i.aprobado)
  const agotado = c.max_intentos !== null && c.intentos.length >= c.max_intentos
  const completas = c.preguntas.every((p) => resp[p.id])
  const detalle = (id: string) => resultado?.detalle.find((d) => d.pregunta_id === id)

  const enviar = async () => {
    setEnviando(true); setError(null)
    try {
      const r = await enviarCuestionario(c.id, resp)
      setResultado(r)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      recargar()
    } catch (e) { setError((e as Error).message) }
    setEnviando(false)
  }
  const reintentar = () => { setResultado(null); setResp({}); cargar(); window.scrollTo(0, 0) }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {volver}
      <header className="rounded-3xl bg-dagrd-fondo p-6 text-white sm:p-8">
        <p className="etiqueta text-dagrd-amarillo">Cuestionario · {codigo} · {MODULOS[codigo]?.nombre}</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{c.titulo}</h1>
        <p className="mt-2 text-white/75">{c.preguntas.length} preguntas · apruebas con {Math.round(c.umbral * 100)} % · {c.max_intentos ? `${c.max_intentos} intentos` : 'intentos ilimitados'}</p>
        {!c.validado && <p className="mt-3 inline-block rounded-pill bg-white/10 px-3 py-1 text-xs font-bold">Contenido en borrador, por validar</p>}
        {c.intentos.length > 0 && !resultado && (
          <p className="mt-3 text-sm text-white/75">Intentos anteriores: {c.intentos.length} · mejor resultado {Math.round(Math.max(...c.intentos.map((i) => Number(i.puntaje))) * 100)} %{yaAprobado && ' · ya lo aprobaste'}</p>
        )}
      </header>

      {resultado && (
        <section role="status" className={`rounded-3xl p-6 ${resultado.aprobado ? 'bg-dagrd-petroleo text-white' : 'bg-orange-50 text-orange-900'}`}>
          <p className="text-2xl font-black">{resultado.aprobado ? '¡Cuestionario aprobado!' : 'Todavía no alcanzas el puntaje'}</p>
          <p className="mt-1">{resultado.correctas} de {resultado.total} correctas ({Math.round(resultado.puntaje * 100)} %).
            {resultado.aprobado ? ' La XP del cuestionario quedó registrada.' : ' Revisa la retroalimentación y vuelve a intentarlo.'}</p>
          {!resultado.aprobado && !agotado && <button onClick={reintentar} className="boton-primario mt-4">Intentar de nuevo</button>}
        </section>
      )}

      {agotado && !resultado && !yaAprobado && (
        <p className="tarjeta p-6">Usaste todos los intentos permitidos. Habla con tu instructor para un refuerzo.</p>
      )}

      {(!agotado || resultado) && (
        <ol className="space-y-4">
          {c.preguntas.map((p, i) => {
            const d = detalle(p.id)
            return (
              <li key={p.id} className={`tarjeta p-5 sm:p-6 ${d ? (d.correcta ? 'ring-2 ring-dagrd-petroleo' : 'ring-2 ring-orange-300') : ''}`}>
                <fieldset disabled={!!resultado}>
                  <legend className="font-bold"><span className="mr-2 text-dagrd-azul">{i + 1}.</span>{p.enunciado}</legend>
                  <div className="mt-3 space-y-2">
                    {p.opciones.map((o) => (
                      <label key={o.id} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2 text-sm transition-colors
                        ${resp[p.id] === o.id ? 'border-dagrd-navy bg-dagrd-amarillo/30' : 'border-dagrd-navy/15 hover:bg-[#efefed]'}`}>
                        <input type="radio" name={p.id} value={o.id} checked={resp[p.id] === o.id}
                          onChange={() => setResp({ ...resp, [p.id]: o.id })} className="h-5 w-5 accent-[#00394b]" />
                        {o.texto}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {d && (
                  <p className={`mt-3 flex gap-2 rounded-xl p-3 text-sm ${d.correcta ? 'bg-dagrd-petroleo/10 text-dagrd-petroleo' : 'bg-orange-50 text-orange-900'}`}>
                    {d.correcta && <IconoCheck className="h-4 w-4 shrink-0" />}
                    <span><strong>{d.correcta ? 'Correcta. ' : 'Incorrecta. '}</strong>{d.retroalimentacion}</span>
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {!resultado && !agotado && (
        <div className="sticky bottom-20 z-10 md:bottom-4">
          <div className="tarjeta flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm">{Object.keys(resp).length} de {c.preguntas.length} respondidas</p>
            {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
            <button onClick={enviar} disabled={!completas || enviando} className="boton-primario">{enviando ? 'Enviando…' : 'Enviar respuestas'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
