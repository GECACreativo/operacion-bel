import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { MODULOS, ORDEN_FORMACION } from '../data/modulos'
import { useEstado } from '../estado'
import {
  ACCIONES, ESTADOS, IMPACTOS, TIPOS, crearReporte, editarReporte, exportarReportes, gestionarReporte, listarReportes, rolesDeModulo,
  type DatosReporte, type EstadoReporte, type Impacto, type Reporte, type TipoReporte,
} from '../data/reportes'

const campo = 'mt-1 block min-h-[44px] w-full rounded-xl border border-dagrd-navy/20 bg-white px-3 text-sm'
const MODULOS_BEL = ORDEN_FORMACION.filter((c) => c !== 'RI').slice().sort()
const fecha = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

function Formulario({ inicial, alGuardar, alCancelar }: { inicial?: Reporte; alGuardar: () => void; alCancelar?: () => void }) {
  const { perfil } = useEstado()
  const [d, setD] = useState<DatosReporte>({
    modulo_codigo: inicial?.modulo_codigo ?? '', rol_bel_id: inicial?.rol_bel_id ?? '', accion: inicial?.accion ?? '',
    tipo: inicial?.tipo ?? 'falla', impacto: inicial?.impacto ?? 'medio', observacion: inicial?.observacion ?? '',
  })
  const [roles, setRoles] = useState<{ id: string; nombre: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!d.modulo_codigo) { setRoles([]); return }
    rolesDeModulo(d.modulo_codigo).then((r) => {
      setRoles(r)
      setD((x) => r.some((y) => y.id === x.rol_bel_id) ? x
        : { ...x, rol_bel_id: r.some((y) => y.id === perfil?.rol_bel_id) ? perfil!.rol_bel_id! : '' })
    }).catch(() => setRoles([]))
  }, [d.modulo_codigo, perfil])

  const enviar = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setOk(false)
    if (!d.modulo_codigo || !d.rol_bel_id) return setError('Elige el módulo y el rol.')
    if (d.accion.trim().length < 3) return setError('Describe la acción que se estaba haciendo en BEL.')
    if (d.observacion.trim().length < 10) return setError('La observación debe tener al menos 10 caracteres.')
    setGuardando(true)
    try {
      if (inicial) await editarReporte(inicial.id, d); else await crearReporte(d)
      if (!inicial) { setD({ ...d, accion: '', observacion: '' }); setOk(true) }
      alGuardar()
    } catch (err) { setError((err as Error).message) }
    setGuardando(false)
  }

  return (
    <form onSubmit={enviar} className={inicial ? 'mt-3 rounded-2xl bg-[#f7f7f5] p-4' : 'tarjeta p-6'} aria-label={inicial ? 'Editar reporte' : 'Nuevo reporte'}>
      {!inicial && <>
        <h2 className="text-xl font-black">Nuevo reporte</h2>
        <p className="mt-1 text-sm text-dagrd-navy/70">Cuéntanos qué pasó en BEL. Un reporte por situación.</p>
      </>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label><span className="text-sm font-bold">Módulo de BEL *</span>
          <select required className={campo} value={d.modulo_codigo} onChange={(e) => setD({ ...d, modulo_codigo: e.target.value })}>
            <option value="">Elige el módulo</option>
            {MODULOS_BEL.map((c) => <option key={c} value={c}>{c} · {MODULOS[c]?.nombre}</option>)}
          </select>
        </label>
        <label><span className="text-sm font-bold">Rol que usaba BEL *</span>
          <select required className={campo} value={d.rol_bel_id} disabled={!roles.length} onChange={(e) => setD({ ...d, rol_bel_id: e.target.value })}>
            <option value="">{d.modulo_codigo ? 'Elige el rol' : 'Primero elige el módulo'}</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2"><span className="text-sm font-bold">Acción *</span>
          <span className="block text-xs text-dagrd-navy/60">Qué se estaba haciendo. Elige una sugerencia o escribe otra.</span>
          <input required list="acciones-bel" className={campo} value={d.accion} maxLength={300}
            onChange={(e) => setD({ ...d, accion: e.target.value })} placeholder="Ej.: Chequeo vehicular" />
          <datalist id="acciones-bel">{(ACCIONES[d.modulo_codigo] ?? []).map((a) => <option key={a} value={a} />)}</datalist>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-bold">Tipo *</legend>
          <div className="mt-1 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {(Object.keys(TIPOS) as TipoReporte[]).map((t) => (
              <label key={t} className={`cursor-pointer rounded-xl border-2 p-3 text-sm ${d.tipo === t ? 'border-dagrd-navy bg-white' : 'border-transparent bg-[#efefed]'}`}>
                <input type="radio" name="tipo" value={t} checked={d.tipo === t} onChange={() => setD({ ...d, tipo: t })} className="sr-only" />
                <span className="block font-bold">{TIPOS[t].texto}</span>
                <span className="block text-xs text-dagrd-navy/60">{TIPOS[t].ayuda}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label><span className="text-sm font-bold">Impacto en la operación *</span>
          <select className={campo} value={d.impacto} onChange={(e) => setD({ ...d, impacto: e.target.value as Impacto })}>
            {(Object.keys(IMPACTOS) as Impacto[]).map((i) => <option key={i} value={i}>{IMPACTOS[i]}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2"><span className="text-sm font-bold">Observación *</span>
          <span className="block text-xs text-dagrd-navy/60">Qué pasó, qué esperabas que pasara y, si aplica, cómo lo resolviste.</span>
          <textarea required rows={4} className={`${campo} py-2`} value={d.observacion} onChange={(e) => setD({ ...d, observacion: e.target.value })} />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p role="status" className="mt-3 rounded-xl bg-dagrd-petroleo/10 p-3 text-sm text-dagrd-petroleo">Reporte guardado. ¡Gracias por cuidar BEL!</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={guardando} className="boton-primario">{guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Enviar reporte'}</button>
        {alCancelar && <button type="button" onClick={alCancelar} className="boton-fantasma">Cancelar</button>}
      </div>
    </form>
  )
}

function Gestionar({ r, alGuardar }: { r: Reporte; alGuardar: () => void }) {
  const [estado, setEstado] = useState<EstadoReporte>(r.estado === 'nuevo' ? 'en_revision' : r.estado)
  const [respuesta, setRespuesta] = useState(r.respuesta ?? '')
  const [error, setError] = useState<string | null>(null)
  const enviar = async (e: FormEvent) => {
    e.preventDefault(); setError(null)
    try { await gestionarReporte(r.id, estado, respuesta); alGuardar() } catch (err) { setError((err as Error).message) }
  }
  return (
    <form onSubmit={enviar} className="mt-3 grid gap-3 rounded-2xl bg-dagrd-amarillo/15 p-4 sm:grid-cols-[200px_1fr]">
      <label><span className="text-sm font-bold">Estado</span>
        <select className={campo} value={estado} onChange={(e) => setEstado(e.target.value as EstadoReporte)}>
          {(Object.keys(ESTADOS) as EstadoReporte[]).map((s) => <option key={s} value={s}>{ESTADOS[s].texto}</option>)}
        </select>
      </label>
      <label><span className="text-sm font-bold">Respuesta al Grupo Élite</span>
        <textarea rows={2} className={`${campo} py-2`} value={respuesta} onChange={(e) => setRespuesta(e.target.value)}
          placeholder="Obligatoria si se escala, resuelve o descarta" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><button type="submit" className="boton-secundario">Guardar seguimiento</button></div>
    </form>
  )
}

function Tarjeta({ r, alCambiar }: { r: Reporte; alCambiar: () => void }) {
  const { perfil, esGestor } = useEstado()
  const [modo, setModo] = useState<'ver' | 'editar' | 'gestionar'>('ver')
  const propio = r.autor_id === perfil?.id
  return (
    <li className="tarjeta p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-dagrd-navy/50">#{r.numero}</span>
        <span className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${TIPOS[r.tipo].clase}`}>{TIPOS[r.tipo].texto}</span>
        <span className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${ESTADOS[r.estado].clase}`}>{ESTADOS[r.estado].texto}</span>
        {r.impacto === 'alto' && <span className="rounded-pill bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">Impacto alto</span>}
      </div>
      <p className="mt-2 etiqueta text-dagrd-azul">{r.modulo_codigo} · {r.modulo} · {r.rol}</p>
      <h3 className="mt-1 font-black">{r.accion}</h3>
      <p className="mt-1 whitespace-pre-line text-sm">{r.observacion}</p>
      <p className="mt-2 text-xs text-dagrd-navy/60">{r.autor}{r.estacion ? ` · ${r.estacion}` : ''} · {fecha(r.creado_en)}</p>
      {r.respuesta && (
        <p className="mt-3 rounded-2xl bg-dagrd-petroleo/10 p-3 text-sm text-dagrd-petroleo">
          <span className="font-bold">Respuesta{r.gestionado_por ? ` de ${r.gestionado_por}` : ''}: </span>{r.respuesta}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {propio && r.estado === 'nuevo' && modo === 'ver' && <button onClick={() => setModo('editar')} className="boton-fantasma min-h-[36px] text-sm">Editar</button>}
        {esGestor && modo === 'ver' && <button onClick={() => setModo('gestionar')} className="boton-fantasma min-h-[36px] text-sm">Hacer seguimiento</button>}
        {modo !== 'ver' && modo !== 'editar' && <button onClick={() => setModo('ver')} className="boton-fantasma min-h-[36px] text-sm">Cerrar</button>}
      </div>
      {modo === 'editar' && <Formulario inicial={r} alGuardar={() => { setModo('ver'); alCambiar() }} alCancelar={() => setModo('ver')} />}
      {modo === 'gestionar' && <Gestionar r={r} alGuardar={() => { setModo('ver'); alCambiar() }} />}
    </li>
  )
}

export default function Reportes() {
  const { esElite, perfil } = useEstado()
  const [lista, setLista] = useState<Reporte[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({ modulo: '', rol: '', tipo: '', estado: '', desde: '', hasta: '', texto: '', mios: false })

  const cargar = () => listarReportes().then(setLista).catch((e) => setError(e.message))
  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => (lista ?? []).filter((r) =>
    (!f.modulo || r.modulo_codigo === f.modulo) && (!f.rol || r.rol_bel_id === f.rol) && (!f.tipo || r.tipo === f.tipo)
    && (!f.estado || r.estado === f.estado) && (!f.mios || r.autor_id === perfil?.id)
    && (!f.desde || r.creado_en.slice(0, 10) >= f.desde) && (!f.hasta || r.creado_en.slice(0, 10) <= f.hasta)
    && (!f.texto || `${r.accion} ${r.observacion} ${r.autor}`.toLowerCase().includes(f.texto.toLowerCase()))), [lista, f, perfil])

  const rolesEnLista = useMemo(() => [...new Map((lista ?? []).map((r) => [r.rol_bel_id, r.rol])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [lista])
  const resumen = useMemo(() => ({
    abiertos: (lista ?? []).filter((r) => ['nuevo', 'en_revision', 'escalado'].includes(r.estado)).length,
    altos: (lista ?? []).filter((r) => r.impacto === 'alto' && !['resuelto', 'descartado'].includes(r.estado)).length,
    resueltos: (lista ?? []).filter((r) => r.estado === 'resuelto').length,
  }), [lista])

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-dagrd-fondo p-6 text-white sm:p-8">
        <span aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[18px] border-white/[.06]" />
        <p className="etiqueta text-dagrd-amarillo">Grupo Élite</p>
        <h1 className="mt-1 text-3xl font-black">Reportes de BEL en operación</h1>
        <p className="mt-2 max-w-2xl text-white/75">
          Registra fallas, dificultades, dudas frecuentes y mejoras de BEL por módulo, rol y acción. Cada reporte queda guardado,
          con seguimiento de administración, y se puede descargar para Excel.
        </p>
        <dl className="mt-5 flex flex-wrap gap-3">
          {[['Abiertos', resumen.abiertos], ['Impacto alto sin resolver', resumen.altos], ['Resueltos', resumen.resueltos]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/10 px-4 py-2"><dt className="etiqueta text-white/60">{k}</dt><dd className="text-xl font-black">{v}</dd></div>
          ))}
        </dl>
      </header>

      {esElite ? <Formulario alGuardar={cargar} />
        : <p className="rounded-2xl bg-dagrd-azul/10 p-4 text-sm text-dagrd-petroleo">Consulta y seguimiento. Solo los integrantes del Grupo Élite registran reportes.</p>}

      <section aria-labelledby="t-reportes" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-reportes" className="text-xl font-black">Reportes registrados</h2>
          <button onClick={() => exportarReportes(filtrados)} disabled={!filtrados.length} className="boton-fantasma">
            Descargar para Excel ({filtrados.length})
          </button>
        </div>
        <div className="tarjeta grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
          <label className="text-sm font-bold">Módulo
            <select className={campo} value={f.modulo} onChange={(e) => setF({ ...f, modulo: e.target.value })}>
              <option value="">Todos</option>{MODULOS_BEL.map((c) => <option key={c} value={c}>{c} · {MODULOS[c]?.nombre}</option>)}
            </select></label>
          <label className="text-sm font-bold">Rol
            <select className={campo} value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
              <option value="">Todos</option>{rolesEnLista.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select></label>
          <label className="text-sm font-bold">Tipo
            <select className={campo} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
              <option value="">Todos</option>{(Object.keys(TIPOS) as TipoReporte[]).map((t) => <option key={t} value={t}>{TIPOS[t].texto}</option>)}
            </select></label>
          <label className="text-sm font-bold">Estado
            <select className={campo} value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
              <option value="">Todos</option>{(Object.keys(ESTADOS) as EstadoReporte[]).map((s) => <option key={s} value={s}>{ESTADOS[s].texto}</option>)}
            </select></label>
          <label className="text-sm font-bold">Desde<input type="date" className={campo} value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></label>
          <label className="text-sm font-bold">Hasta<input type="date" className={campo} value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></label>
          <label className="col-span-2 text-sm font-bold lg:col-span-1">Buscar<input type="search" className={campo} value={f.texto} placeholder="Acción, observación o autor" onChange={(e) => setF({ ...f, texto: e.target.value })} /></label>
          {esElite && (
            <label className="col-span-2 flex items-center gap-2 self-end pb-3 text-sm font-bold lg:col-span-1">
              <input type="checkbox" className="h-5 w-5 accent-[#00394b]" checked={f.mios} onChange={(e) => setF({ ...f, mios: e.target.checked })} /> Solo mis reportes
            </label>
          )}
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
        {lista === null && !error && <p role="status">Cargando reportes…</p>}
        {lista && filtrados.length === 0 && <p className="tarjeta p-6 text-sm text-dagrd-navy/70">{lista.length ? 'Ningún reporte coincide con los filtros.' : 'Todavía no hay reportes.'}</p>}
        <ul className="space-y-3">{filtrados.map((r) => <Tarjeta key={r.id} r={r} alCambiar={cargar} />)}</ul>
      </section>
    </div>
  )
}
