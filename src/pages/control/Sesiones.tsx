import { useEffect, useState, type FormEvent } from 'react'
import { descargarExcel, imprimir, listaAsistencia } from '../../data/asistencia'
import { Link, useNavigate } from 'react-router-dom'
import { guardarSesion, listarInstructores, listarSesiones, type NuevaSesion, type SesionControl } from '../../data/control'
import { MODULOS, ORDEN_FORMACION } from '../../data/modulos'
import { useEstado } from '../../estado'
import { fmtFecha } from '../MiOperacion'
import ControlNav from './ControlNav'
import { IconoCalendario, IconoGrupo, IconoUbicacion, IconoUsuario } from '../../components/Iconos'
import type { Modalidad } from '../../data/types'

const campo = 'mt-1 block min-h-[44px] w-full rounded-xl border border-dagrd-navy/20 bg-white px-3 text-sm'
const ESTADO_SESION: Record<SesionControl['estado'], string> = {
  programada: 'bg-dagrd-azul/10 text-dagrd-azul', realizada: 'bg-dagrd-petroleo text-white', suspendida: 'bg-orange-100 text-orange-800', cancelada: 'bg-dagrd-gris/60 text-dagrd-navy/70',
}
/** Convierte ISO a valor de <input type="datetime-local"> en la hora del navegador */
export const aLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

export function FormularioSesion({ inicial, alGuardar, alCancelar }: {
  inicial?: SesionControl; alGuardar: (id: string) => void; alCancelar: () => void
}) {
  const { perfil, esGestor } = useEstado()
  const [instructores, setInstructores] = useState<{ id: string; nombre: string }[]>([])
  const [f, setF] = useState({
    modulo_codigo: inicial?.modulo_codigo ?? 'M00',
    modalidad: (inicial?.modalidad ?? MODULOS.M00.modalidad) as Modalidad,
    inicio: inicial ? aLocal(inicial.inicio) : '',
    fin: inicial ? aLocal(inicial.fin) : '',
    lugar: inicial?.lugar ?? '', enlace: inicial?.enlace ?? '',
    cupo: inicial?.cupo?.toString() ?? '',
    instructor_id: inicial?.instructor_id ?? perfil?.id ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { listarInstructores().then(setInstructores).catch(() => {}) }, [])
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const enviar = async (e: FormEvent) => {
    e.preventDefault(); setError(null)
    if (!f.inicio || !f.fin) return setError('Indica la fecha y hora de inicio y de fin.')
    if (new Date(f.fin) <= new Date(f.inicio)) return setError('La hora de fin debe ser posterior a la de inicio.')
    if (f.modalidad !== 'Presencial' && !f.enlace.trim()) return setError('Las sesiones virtuales o híbridas necesitan el enlace de conexión.')
    if (f.modalidad !== 'Virtual' && !f.lugar.trim()) return setError('Indica el lugar de la sesión presencial.')
    const datos: NuevaSesion = {
      modulo_codigo: f.modulo_codigo, modalidad: f.modalidad,
      inicio: new Date(f.inicio).toISOString(), fin: new Date(f.fin).toISOString(),
      lugar: f.lugar.trim() || null, enlace: f.enlace.trim() || null,
      cupo: f.cupo ? Number(f.cupo) : null, instructor_id: f.instructor_id || null,
    }
    setGuardando(true)
    try { alGuardar(await guardarSesion(datos, inicial?.id)) } catch (err) { setError((err as Error).message) }
    setGuardando(false)
  }

  return (
    <form onSubmit={enviar} className="tarjeta p-6" aria-labelledby="t-form-sesion">
      <h2 id="t-form-sesion" className="text-xl font-black">{inicial ? 'Editar sesión' : 'Programar una sesión'}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="text-sm font-bold">Misión</span>
          <select className={campo} value={f.modulo_codigo}
            onChange={(e) => setF({ ...f, modulo_codigo: e.target.value, modalidad: MODULOS[e.target.value].modalidad })}>
            {ORDEN_FORMACION.map((c) => <option key={c} value={c}>{c} · {MODULOS[c].nombre} — {MODULOS[c].mision}</option>)}
          </select>
        </label>
        <label><span className="text-sm font-bold">Modalidad</span>
          <select className={campo} value={f.modalidad} onChange={set('modalidad')}>
            {['Presencial', 'Virtual', 'Híbrida'].map((m) => <option key={m}>{m}</option>)}
          </select>
          <span className="mt-1 block text-xs text-dagrd-navy/60">El plan sugiere: {MODULOS[f.modulo_codigo].modalidad}, {MODULOS[f.modulo_codigo].duracionH.toString().replace('.', ',')} h</span>
        </label>
        <label><span className="text-sm font-bold">Instructor</span>
          <select className={campo} value={f.instructor_id} onChange={set('instructor_id')} disabled={!esGestor}>
            {!instructores.length && perfil && <option value={perfil.id}>{perfil.nombre}</option>}
            {instructores.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </label>
        <label><span className="text-sm font-bold">Inicio</span><input type="datetime-local" className={campo} value={f.inicio} onChange={set('inicio')} required /></label>
        <label><span className="text-sm font-bold">Fin</span><input type="datetime-local" className={campo} value={f.fin} onChange={set('fin')} required /></label>
        {f.modalidad !== 'Virtual' && (
          <label><span className="text-sm font-bold">Lugar</span><input className={campo} value={f.lugar} onChange={set('lugar')} placeholder="Centro de Formación · Aula 2" /></label>
        )}
        {f.modalidad !== 'Presencial' && (
          <label><span className="text-sm font-bold">Enlace de conexión</span><input type="url" className={campo} value={f.enlace} onChange={set('enlace')} placeholder="https://…" /></label>
        )}
        <label><span className="text-sm font-bold">Cupo (opcional)</span><input type="number" min={1} className={campo} value={f.cupo} onChange={set('cupo')} /></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={guardando} className="boton-primario">{guardando ? 'Guardando…' : 'Guardar sesión'}</button>
        <button type="button" onClick={alCancelar} className="boton-fantasma">Cancelar</button>
      </div>
    </form>
  )
}


/** Botones de descarga de la lista de asistencia (una sesión o un periodo). */
export function DescargasAsistencia({ filtro, nombre, deshabilitado = false }: {
  filtro: { sesion?: string; desde?: string; hasta?: string; modulo?: string }; nombre: string; deshabilitado?: boolean
}) {
  const [ocupado, setOcupado] = useState<'excel' | 'pdf' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const ejecutar = async (tipo: 'excel' | 'pdf') => {
    setOcupado(tipo); setAviso(null)
    // La ventana se abre antes de consultar para que el navegador no la bloquee
    const ventana = tipo === 'pdf' ? window.open('', '_blank') : null
    if (ventana) ventana.document.write('<p style="font-family:Arial;padding:20px">Preparando la lista de asistencia…</p>')
    try {
      const filas = await listaAsistencia(filtro)
      if (!filas.length) { ventana?.close(); setAviso('No hay personas inscritas en las sesiones elegidas.') }
      else if (tipo === 'excel') descargarExcel(filas, nombre)
      else if (!imprimir(filas, ventana)) setAviso('El navegador bloqueó la ventana. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.')
    } catch (e) { ventana?.close(); setAviso((e as Error).message) }
    setOcupado(null)
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => ejecutar('excel')} disabled={deshabilitado || !!ocupado} className="boton-fantasma min-h-[40px]">
        {ocupado === 'excel' ? 'Preparando…' : 'Descargar Excel'}</button>
      <button onClick={() => ejecutar('pdf')} disabled={deshabilitado || !!ocupado} className="boton-fantasma min-h-[40px]">
        {ocupado === 'pdf' ? 'Preparando…' : 'Imprimir o PDF'}</button>
      {aviso && <p role="status" className="w-full text-sm text-orange-800">{aviso}</p>}
    </div>
  )
}

function AsistenciaPeriodo() {
  const hoy = new Date().toISOString().slice(0, 10)
  const inicioMes = hoy.slice(0, 8) + '01'
  const [f, setF] = useState({ desde: inicioMes, hasta: hoy, modulo: '' })
  return (
    <details className="tarjeta p-5">
      <summary className="cursor-pointer font-black">Descargar listas de asistencia de un periodo</summary>
      <p className="mt-2 text-sm text-dagrd-navy/70">Incluye todas las sesiones del periodo{' '}(o de una misión) con las personas inscritas y su asistencia. En «Imprimir o PDF» sale una hoja por sesión con espacio para firma.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold">Desde<input type="date" className={campo} value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></label>
        <label className="text-sm font-bold">Hasta<input type="date" className={campo} value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></label>
        <label className="text-sm font-bold">Misión
          <select className={campo} value={f.modulo} onChange={(e) => setF({ ...f, modulo: e.target.value })}>
            <option value="">Todas</option>{ORDEN_FORMACION.map((c) => <option key={c} value={c}>{c} · {MODULOS[c]?.mision}</option>)}
          </select></label>
      </div>
      <div className="mt-3"><DescargasAsistencia filtro={f} nombre={`asistencia-${f.desde}-a-${f.hasta}${f.modulo ? '-' + f.modulo : ''}`} deshabilitado={!f.desde || !f.hasta} /></div>
    </details>
  )
}

export default function Sesiones() {
  const { perfil, esGestor } = useEstado()
  const nav = useNavigate()
  const [sesiones, setSesiones] = useState<SesionControl[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [filtro, setFiltro] = useState<'proximas' | 'pasadas' | 'todas'>('proximas')

  useEffect(() => {
    listarSesiones(esGestor ? null : perfil?.id ?? null).then(setSesiones).catch((e) => setError(e.message))
  }, [esGestor, perfil?.id])

  const ahora = Date.now()
  const visibles = (sesiones ?? []).filter((s) =>
    filtro === 'todas' ? true : filtro === 'proximas' ? new Date(s.fin).getTime() >= ahora : new Date(s.fin).getTime() < ahora)
    .sort((a, b) => filtro === 'proximas' ? a.inicio.localeCompare(b.inicio) : b.inicio.localeCompare(a.inicio))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="etiqueta text-dagrd-azul">Centro de control</p>
          <h1 className="mt-1 text-3xl font-black">Sesiones de formación</h1>
          <p className="mt-1 text-dagrd-navy/75">{esGestor ? 'Todas las sesiones programadas.' : 'Las sesiones que tienes asignadas como instructor.'}</p>
        </div>
        {!creando && <button onClick={() => setCreando(true)} className="boton-primario">+ Programar sesión</button>}
      </header>

      <ControlNav />

      {creando && <FormularioSesion alGuardar={(id) => nav(`/control/sesion/${id}`)} alCancelar={() => setCreando(false)} />}

      <AsistenciaPeriodo />

      <div role="tablist" aria-label="Filtrar sesiones" className="flex gap-2">
        {([['proximas', 'Próximas'], ['pasadas', 'Pasadas'], ['todas', 'Todas']] as const).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={filtro === k} onClick={() => setFiltro(k)}
            className={`min-h-[40px] rounded-pill px-4 text-sm font-bold ${filtro === k ? 'bg-dagrd-navy text-white' : 'bg-white text-dagrd-navy'}`}>{t}</button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {sesiones === null && !error && <p role="status" className="text-dagrd-navy/70">Cargando sesiones…</p>}
      {sesiones !== null && visibles.length === 0 && (
        <div className="tarjeta p-8 text-center">
          <p className="font-bold">No hay sesiones {filtro === 'proximas' ? 'próximas' : filtro === 'pasadas' ? 'pasadas' : ''}.</p>
          <p className="mt-1 text-sm text-dagrd-navy/70">Usa «Programar sesión» para crear la primera.</p>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {visibles.map((s) => (
          <li key={s.id}>
            <Link to={`/control/sesion/${s.id}`} className="tarjeta block p-5 transition-shadow hover:shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="etiqueta text-dagrd-navy/60">{s.modulo_codigo} · {MODULOS[s.modulo_codigo]?.nombre}</span>
                <span className={`rounded-pill px-2.5 py-1 text-xs font-bold capitalize ${ESTADO_SESION[s.estado]}`}>{s.estado}</span>
              </div>
              <p className="mt-2 text-lg font-black">{MODULOS[s.modulo_codigo]?.mision}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-dagrd-navy/80">
                <li className="flex items-center gap-2"><IconoCalendario className="h-4 w-4" />{fmtFecha(s.inicio)}</li>
                <li className="flex items-center gap-2"><IconoUbicacion className="h-4 w-4" />{s.modalidad} · {s.lugar ?? 'Virtual'}</li>
                <li className="flex items-center gap-2"><IconoUsuario className="h-4 w-4" />{s.instructor ?? 'Sin instructor'}</li>
                <li className="flex items-center gap-2"><IconoGrupo className="h-4 w-4" />{s.inscritos} inscritos{s.cupo ? ` de ${s.cupo}` : ''}</li>
              </ul>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
