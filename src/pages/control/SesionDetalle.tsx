import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  candidatos, cambiarEstadoSesion, inscribir, listarInscritos, obtenerSesion, registrarAsistencia, retirar,
  type Inscrito, type SesionControl,
} from '../../data/control'
import { MODULOS } from '../../data/modulos'
import { useEstado } from '../../estado'
import { fmtFecha } from '../MiOperacion'
import { FormularioSesion } from './Sesiones'
import { IconoAtras, IconoCheck } from '../../components/Iconos'

function FilaAsistencia({ i, sesion, alCambiar, puedeRetirar }: {
  i: Inscrito; sesion: SesionControl; alCambiar: () => void; puedeRetirar: boolean
}) {
  const { perfil, esGestor, recargar } = useEstado()
  const [corrigiendo, setCorrigiendo] = useState<boolean | null>(null) // valor nuevo pendiente de motivo
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esPropia = i.perfil_id === perfil?.id
  const bloqueada = sesion.estado === 'cancelada' || (esPropia && !esGestor)

  const marcar = async (presente: boolean, m?: string) => {
    if (i.presente !== null && i.presente !== presente && !m) { setCorrigiendo(presente); return }
    setOcupado(true); setError(null)
    try {
      await registrarAsistencia(sesion.id, i.perfil_id, presente, m)
      setCorrigiendo(null); setMotivo('')
      alCambiar()
      if (esPropia) recargar()
    } catch (e) { setError((e as Error).message) }
    setOcupado(false)
  }

  const btn = (activo: boolean, color: string) =>
    `min-h-[40px] rounded-pill px-4 text-sm font-bold transition-colors ${activo ? color : 'bg-[#efefed] text-dagrd-navy hover:bg-dagrd-gris/60'}`

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{i.nombre}{esPropia && <span className="ml-2 text-xs font-medium text-dagrd-navy/60">(tú)</span>}</p>
          <p className="truncate text-xs text-dagrd-navy/60">{i.rol ?? 'Sin rol BEL'} · {i.correo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Asistencia de ${i.nombre}`}>
          <button disabled={ocupado || bloqueada} aria-pressed={i.presente === true} onClick={() => marcar(true)}
            className={btn(i.presente === true, 'bg-dagrd-petroleo text-white')}>
            {i.presente === true && <IconoCheck className="mr-1 inline h-4 w-4" />}Asistió
          </button>
          <button disabled={ocupado || bloqueada} aria-pressed={i.presente === false} onClick={() => marcar(false)}
            className={btn(i.presente === false, 'bg-orange-100 text-orange-800')}>No asistió</button>
          {puedeRetirar && i.presente === null && (
            <button disabled={ocupado} onClick={async () => { await retirar(sesion.id, i.perfil_id); alCambiar() }}
              className="min-h-[40px] rounded-pill px-3 text-xs font-bold text-dagrd-navy/60 underline-offset-2 hover:underline">Retirar</button>
          )}
        </div>
      </div>
      {esPropia && !esGestor && <p className="mt-1 text-xs text-dagrd-navy/60">Tu propia asistencia la registra otro instructor.</p>}
      {corrigiendo !== null && (
        <form onSubmit={(e) => { e.preventDefault(); if (motivo.trim()) marcar(corrigiendo, motivo.trim()) }}
          className="mt-3 rounded-2xl bg-dagrd-amarillo/20 p-3">
          <label className="block text-sm"><span className="font-bold">Motivo de la corrección</span>
            <span className="block text-xs text-dagrd-navy/70">Queda en la auditoría. {corrigiendo === false && 'Si la misión ya estaba aprobada, volverá a «requiere refuerzo».'}</span>
            <input autoFocus required value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="mt-2 block min-h-[40px] w-full rounded-xl border border-dagrd-navy/20 bg-white px-3" placeholder="Ej.: se registró por error" />
          </label>
          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={ocupado} className="boton-secundario min-h-[36px]">Confirmar corrección</button>
            <button type="button" onClick={() => { setCorrigiendo(null); setMotivo('') }} className="boton-fantasma min-h-[36px]">Cancelar</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </li>
  )
}

function Inscribir({ sesion, inscritos, alInscribir }: { sesion: SesionControl; inscritos: Inscrito[]; alInscribir: () => void }) {
  const [lista, setLista] = useState<{ id: string; nombre: string; correo: string; rol: string }[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [elegidos, setElegidos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { candidatos(sesion.modulo_codigo).then(setLista).catch((e) => setError(e.message)) }, [sesion.modulo_codigo])

  const ya = new Set(inscritos.map((i) => i.perfil_id))
  const q = busqueda.trim().toLowerCase()
  const filtrados = (lista ?? []).filter((p) => !ya.has(p.id) && (!q || `${p.nombre} ${p.correo} ${p.rol}`.toLowerCase().includes(q)))
  const libres = sesion.cupo ? Math.max(0, sesion.cupo - inscritos.length) : Infinity

  const guardar = async () => {
    setError(null)
    if (elegidos.length > libres) return setError(`Solo quedan ${libres} cupos.`)
    try { await inscribir(sesion.id, elegidos); setElegidos([]); alInscribir() } catch (e) { setError((e as Error).message) }
  }

  return (
    <section className="tarjeta p-6" aria-labelledby="t-inscribir">
      <h2 id="t-inscribir" className="text-xl font-black">Inscribir participantes</h2>
      <p className="mt-1 text-sm text-dagrd-navy/70">Solo aparecen personas cuyo rol BEL incluye {sesion.modulo_codigo}.</p>
      <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, correo o rol"
        aria-label="Buscar participantes" className="mt-4 block min-h-[44px] w-full rounded-xl border border-dagrd-navy/20 px-3 text-sm" />
      {lista === null && !error && <p role="status" className="mt-3 text-sm">Cargando…</p>}
      {lista !== null && filtrados.length === 0 && (
        <p className="mt-3 text-sm text-dagrd-navy/70">{lista.length === 0 ? 'Todavía no hay personas registradas con un rol que incluya esta misión.' : 'No hay más personas para inscribir.'}</p>
      )}
      <ul className="mt-3 max-h-80 divide-y divide-dagrd-navy/10 overflow-y-auto">
        {filtrados.map((p) => (
          <li key={p.id}>
            <label className="flex min-h-[48px] cursor-pointer items-center gap-3 py-2">
              <input type="checkbox" className="h-5 w-5 accent-[#00394b]" checked={elegidos.includes(p.id)}
                onChange={(e) => setElegidos(e.target.checked ? [...elegidos, p.id] : elegidos.filter((x) => x !== p.id))} />
              <span className="min-w-0"><span className="block text-sm font-bold">{p.nombre}</span>
                <span className="block truncate text-xs text-dagrd-navy/60">{p.rol} · {p.correo}</span></span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <button onClick={guardar} disabled={!elegidos.length} className="boton-primario mt-4">
        Inscribir {elegidos.length || ''} {elegidos.length === 1 ? 'persona' : 'personas'}
      </button>
    </section>
  )
}

export default function SesionDetalle() {
  const { id = '' } = useParams()
  const { esGestor, perfil } = useEstado()
  const [sesion, setSesion] = useState<SesionControl | null>(null)
  const [inscritos, setInscritos] = useState<Inscrito[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  const cargar = useCallback(async () => {
    try { setSesion(await obtenerSesion(id)); setInscritos(await listarInscritos(id)) } catch (e) { setError((e as Error).message) }
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  const resumen = useMemo(() => ({
    si: inscritos.filter((i) => i.presente === true).length,
    no: inscritos.filter((i) => i.presente === false).length,
    pend: inscritos.filter((i) => i.presente === null).length,
  }), [inscritos])

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>
  if (!sesion) return <p role="status">Cargando sesión…</p>
  const m = MODULOS[sesion.modulo_codigo]
  const gestiona = esGestor || sesion.instructor_id === perfil?.id

  const estado = async (e: SesionControl['estado']) => { await cambiarEstadoSesion(sesion.id, e); cargar() }

  return (
    <div className="space-y-6">
      <Link to="/control" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-dagrd-navy/70 hover:text-dagrd-navy">
        <IconoAtras className="h-4 w-4" /> Sesiones
      </Link>

      {editando ? (
        <FormularioSesion inicial={sesion} alGuardar={() => { setEditando(false); cargar() }} alCancelar={() => setEditando(false)} />
      ) : (
        <header className="rounded-3xl bg-dagrd-fondo p-6 text-white sm:p-8">
          <p className="etiqueta text-dagrd-amarillo">{sesion.modulo_codigo} · {m?.nombre} · {sesion.estado}</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{m?.mision}</h1>
          <p className="mt-2 text-white/80">{fmtFecha(sesion.inicio)} · {sesion.modalidad}</p>
          <p className="text-white/80">{sesion.lugar ?? ''}{sesion.lugar && sesion.enlace ? ' · ' : ''}
            {sesion.enlace && <a href={sesion.enlace} target="_blank" rel="noreferrer" className="underline">Enlace de conexión</a>}</p>
          <p className="text-white/80">Instructor: {sesion.instructor ?? 'Sin asignar'}</p>
          {gestiona && sesion.estado !== 'cancelada' && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setEditando(true)} className="boton border border-white/30 text-white hover:bg-white/10">Editar</button>
              {sesion.estado === 'programada' && <button onClick={() => estado('realizada')} className="boton-primario">Marcar como realizada</button>}
              {sesion.estado === 'programada' && resumen.si + resumen.no === 0 && (
                <button onClick={() => { if (confirm('¿Cancelar esta sesión?')) estado('cancelada') }} className="boton text-white/80 hover:bg-white/10">Cancelar sesión</button>
              )}
            </div>
          )}
        </header>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="tarjeta p-6" aria-labelledby="t-asistencia">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="t-asistencia" className="text-xl font-black">Asistencia</h2>
            <p className="text-sm text-dagrd-navy/70">{resumen.si} asistieron · {resumen.no} no asistieron · {resumen.pend} sin registrar</p>
          </div>
          <p className="mt-1 text-xs text-dagrd-navy/60">
            Al marcar «Asistió» se otorgan {sesion.modulo_codigo === 'RI' ? 0 : 20} XP una sola vez por misión. La asistencia sola no aprueba la misión.
          </p>
          {inscritos.length === 0
            ? <p className="mt-4 text-sm text-dagrd-navy/70">Todavía no hay participantes inscritos.</p>
            : <ul className="mt-2 divide-y divide-dagrd-navy/10">
                {inscritos.map((i) => <FilaAsistencia key={i.perfil_id} i={i} sesion={sesion} alCambiar={cargar} puedeRetirar={gestiona} />)}
              </ul>}
        </section>
        {gestiona && sesion.estado !== 'cancelada' && <Inscribir sesion={sesion} inscritos={inscritos} alInscribir={cargar} />}
      </div>
    </div>
  )
}
