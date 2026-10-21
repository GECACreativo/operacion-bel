import { useCallback, useEffect, useState } from 'react'
import {
  actualizarCuestionario, borrarOpcion, criteriosAdmin, crearCuestionario, cuestionarioAdmin, guardarCriterio, guardarPregunta, rolesDelModulo,
  type CriterioAdmin, type CuestionarioAdmin, type PreguntaAdmin,
} from '../../data/contenidos'
import { MODULOS, ORDEN_FORMACION } from '../../data/modulos'
import ControlNav from './ControlNav'

const campo = 'block w-full rounded-xl border border-dagrd-navy/20 bg-white px-3 py-2 text-sm'
type Aviso = { tipo: 'ok' | 'error'; texto: string } | null
const AvisoTxt = ({ a }: { a: Aviso }) => a
  ? <p role={a.tipo === 'error' ? 'alert' : 'status'} className={`rounded-xl p-2 text-sm ${a.tipo === 'ok' ? 'bg-dagrd-petroleo/10 text-dagrd-petroleo' : 'bg-red-50 text-red-800'}`}>{a.texto}</p>
  : null
const Insignia = ({ validado }: { validado: boolean }) => (
  <span className={`rounded-pill px-2 py-0.5 text-[11px] font-bold ${validado ? 'bg-dagrd-petroleo text-white' : 'bg-dagrd-amarillo/60 text-dagrd-navy'}`}>
    {validado ? 'Validado' : 'Por validar'}
  </span>
)

// ───────── Cuestionario ─────────

function EditorPregunta({ p: inicial, cuestionarioId, nueva, alGuardar, alCambiarContenido }: {
  p: PreguntaAdmin; cuestionarioId: string; nueva: boolean; alGuardar: () => void; alCambiarContenido: () => Promise<void>
}) {
  const [p, setP] = useState(inicial)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [guardando, setGuardando] = useState(false)
  const setOp = (i: number, cambios: Partial<PreguntaAdmin['opciones'][number]>) =>
    setP({ ...p, opciones: p.opciones.map((o, j) => j === i ? { ...o, ...cambios } : (cambios.correcta ? { ...o, correcta: false } : o)) })

  const guardar = async () => {
    setAviso(null)
    const llenas = p.opciones.filter((o) => o.texto.trim())
    if (!p.enunciado.trim()) return setAviso({ tipo: 'error', texto: 'Escribe el enunciado.' })
    if (llenas.length < 2) return setAviso({ tipo: 'error', texto: 'La pregunta necesita al menos dos opciones.' })
    if (!llenas.some((o) => o.correcta)) return setAviso({ tipo: 'error', texto: 'Marca cuál es la opción correcta.' })
    setGuardando(true)
    try { await alCambiarContenido(); await guardarPregunta(cuestionarioId, p, nueva); setAviso({ tipo: 'ok', texto: 'Pregunta guardada.' }); alGuardar() }
    catch (e) { setAviso({ tipo: 'error', texto: (e as Error).message }) }
    setGuardando(false)
  }
  const quitar = async (i: number) => {
    const o = p.opciones[i]
    if (!o.id.startsWith('nueva-')) {
      try { await borrarOpcion(o.id) } catch (e) { return setAviso({ tipo: 'error', texto: (e as Error).message }) }
    }
    setP({ ...p, opciones: p.opciones.filter((_, j) => j !== i) })
  }

  return (
    <li className={`tarjeta p-5 ${p.activo ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="etiqueta text-dagrd-azul">{nueva ? 'Nueva pregunta' : `Pregunta ${p.orden}`}</p>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" className="h-5 w-5 accent-[#00394b]" checked={p.activo} onChange={(e) => setP({ ...p, activo: e.target.checked })} /> Activa
        </label>
      </div>
      <label className="mt-2 block text-sm font-bold">Enunciado
        <textarea rows={2} className={`${campo} mt-1`} value={p.enunciado} onChange={(e) => setP({ ...p, enunciado: e.target.value })} />
      </label>
      <fieldset className="mt-3">
        <legend className="text-sm font-bold">Opciones <span className="font-normal text-dagrd-navy/60">(marca la correcta)</span></legend>
        <ul className="mt-2 space-y-2">
          {p.opciones.map((o, i) => (
            <li key={o.id} className="flex items-center gap-2">
              <input type="radio" name={`correcta-${p.id}`} aria-label={`Marcar opción ${i + 1} como correcta`} className="h-5 w-5 shrink-0 accent-[#00394b]"
                checked={o.correcta} onChange={() => setOp(i, { correcta: true })} />
              <input className={campo} value={o.texto} onChange={(e) => setOp(i, { texto: e.target.value })} placeholder={`Opción ${i + 1}`} aria-label={`Texto de la opción ${i + 1}`} />
              <button type="button" onClick={() => quitar(i)} aria-label={`Quitar opción ${i + 1}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-dagrd-navy/60 hover:bg-[#efefed]">✕</button>
            </li>
          ))}
        </ul>
        {p.opciones.length < 6 && (
          <button type="button" className="mt-2 text-sm font-bold text-dagrd-azul hover:underline"
            onClick={() => setP({ ...p, opciones: [...p.opciones, { id: `nueva-${Date.now()}`, orden: p.opciones.length + 1, texto: '', correcta: false }] })}>
            + Agregar opción
          </button>
        )}
      </fieldset>
      <label className="mt-3 block text-sm font-bold">Retroalimentación <span className="font-normal text-dagrd-navy/60">(se muestra después de responder)</span>
        <textarea rows={2} className={`${campo} mt-1`} value={p.retroalimentacion ?? ''} onChange={(e) => setP({ ...p, retroalimentacion: e.target.value })} />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={guardar} disabled={guardando} className="boton-secundario">{guardando ? 'Guardando…' : 'Guardar pregunta'}</button>
        <AvisoTxt a={aviso} />
      </div>
    </li>
  )
}

function EditorCuestionario({ modulo }: { modulo: string }) {
  const [c, setC] = useState<CuestionarioAdmin | null | undefined>(undefined)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [nuevas, setNuevas] = useState<PreguntaAdmin[]>([])
  const [versionSubida, setVersionSubida] = useState(false)
  const cargar = useCallback(() => { cuestionarioAdmin(modulo).then(setC).catch((e) => setAviso({ tipo: 'error', texto: e.message })) }, [modulo])
  useEffect(() => { setC(undefined); setNuevas([]); setVersionSubida(false); cargar() }, [cargar])

  // Si ya hay intentos, el primer cambio crea una nueva versión del cuestionario (los intentos viejos conservan la suya).
  const alCambiarContenido = async () => {
    if (c && c.intentos > 0 && !versionSubida) { await actualizarCuestionario(c.id, { version: c.version + 1 }); setVersionSubida(true) }
  }

  if (c === undefined) return <p role="status">Cargando…</p>
  if (c === null) return (
    <div className="tarjeta p-6">
      <p className="font-bold">Esta misión todavía no tiene cuestionario.</p>
      <button className="boton-primario mt-4" onClick={async () => { await crearCuestionario(modulo, MODULOS[modulo].mision); cargar() }}>Crear cuestionario</button>
    </div>
  )

  const guardarDatos = async (cambios: Partial<CuestionarioAdmin>) => {
    try { await actualizarCuestionario(c.id, cambios); setC({ ...c, ...cambios }); setAviso({ tipo: 'ok', texto: 'Cambios guardados.' }) }
    catch (e) { setAviso({ tipo: 'error', texto: (e as Error).message }) }
  }
  const siguienteOrden = Math.max(0, ...c.preguntas.map((p) => p.orden), ...nuevas.map((p) => p.orden)) + 1

  return (
    <div className="space-y-4">
      <section className="tarjeta p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black">Cuestionario</h2>
          <Insignia validado={c.validado} />
        </div>
        {c.intentos > 0 && <p className="mt-2 rounded-xl bg-dagrd-amarillo/25 p-3 text-xs">Ya tiene {c.intentos} intentos. Los cambios aplican a los intentos nuevos; los anteriores conservan su versión.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-bold sm:col-span-3">Título
            <input className={`${campo} mt-1`} defaultValue={c.titulo} onBlur={(e) => e.target.value.trim() && e.target.value !== c.titulo && guardarDatos({ titulo: e.target.value.trim() })} />
          </label>
          <label className="text-sm font-bold">Puntaje para aprobar (%)
            <input type="number" min={50} max={100} className={`${campo} mt-1`} defaultValue={Math.round(c.umbral * 100)}
              onBlur={(e) => { const v = Number(e.target.value) / 100; if (v >= 0.5 && v <= 1 && v !== c.umbral) guardarDatos({ umbral: v }) }} />
          </label>
          <label className="text-sm font-bold">Intentos máximos
            <input type="number" min={1} placeholder="Sin límite" className={`${campo} mt-1`} defaultValue={c.max_intentos ?? ''}
              onBlur={(e) => guardarDatos({ max_intentos: e.target.value ? Number(e.target.value) : null })} />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm font-bold">
            <input type="checkbox" className="h-5 w-5 accent-[#00394b]" checked={c.validado} onChange={(e) => guardarDatos({ validado: e.target.checked })} />
            Contenido validado por el equipo funcional
          </label>
        </div>
        <div className="mt-3"><AvisoTxt a={aviso} /></div>
      </section>

      <ol className="space-y-4">
        {c.preguntas.map((p) => <EditorPregunta key={p.id} p={p} cuestionarioId={c.id} nueva={false} alGuardar={() => {}} alCambiarContenido={alCambiarContenido} />)}
        {nuevas.map((p) => (
          <EditorPregunta key={p.id} p={p} cuestionarioId={c.id} nueva alCambiarContenido={alCambiarContenido}
            alGuardar={() => { setNuevas(nuevas.filter((n) => n.id !== p.id)); cargar() }} />
        ))}
      </ol>
      <button className="boton-primario" onClick={() => setNuevas([...nuevas, {
        id: `nueva-p-${Date.now()}`, orden: siguienteOrden, enunciado: '', retroalimentacion: '', activo: true,
        opciones: [0, 1, 2, 3].map((i) => ({ id: `nueva-${Date.now()}-${i}`, orden: i + 1, texto: '', correcta: false })),
      }])}>+ Nueva pregunta</button>
    </div>
  )
}

// ───────── Criterios del reto ─────────

function FilaCriterio({ c: inicial, modulo, nuevo, roles, alGuardar }: {
  c: CriterioAdmin; modulo: string; nuevo: boolean; roles: { id: string; nombre: string }[]; alGuardar: () => void
}) {
  const [c, setC] = useState(inicial)
  const [aviso, setAviso] = useState<Aviso>(null)
  const sucio = JSON.stringify(c) !== JSON.stringify(inicial)
  const guardar = async () => {
    if (!c.descripcion.trim()) return setAviso({ tipo: 'error', texto: 'Escribe el criterio.' })
    try { await guardarCriterio(modulo, c, nuevo); setAviso({ tipo: 'ok', texto: 'Guardado.' }); alGuardar() }
    catch (e) { setAviso({ tipo: 'error', texto: (e as Error).message }) }
  }
  return (
    <li className={`rounded-2xl border border-dagrd-navy/10 bg-white p-4 ${c.activo ? '' : 'opacity-60'}`}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <textarea rows={2} className={campo} value={c.descripcion} aria-label="Descripción del criterio" onChange={(e) => setC({ ...c, descripcion: e.target.value })} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {nuevo && (
            <select className={`${campo} w-auto`} value={c.rol_bel_id ?? ''} aria-label="Aplica a" onChange={(e) => setC({ ...c, rol_bel_id: e.target.value || null })}>
              <option value="">Todos los roles</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-red-700" checked={c.critico} onChange={(e) => setC({ ...c, critico: e.target.checked })} />Crítico</label>
          <label className="flex items-center gap-2"><span className="font-bold">Orden</span>
            <input type="number" min={1} className={`${campo} w-16`} value={c.orden} onChange={(e) => setC({ ...c, orden: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#00394b]" checked={c.activo} onChange={(e) => setC({ ...c, activo: e.target.checked })} />Activo</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#00394b]" checked={c.validado} onChange={(e) => setC({ ...c, validado: e.target.checked })} />Validado</label>
        </div>
      </div>
      {(sucio || nuevo || aviso) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(sucio || nuevo) && <button onClick={guardar} className="boton-secundario min-h-[36px]">Guardar</button>}
          <AvisoTxt a={aviso} />
        </div>
      )}
    </li>
  )
}

function EditorCriterios({ modulo }: { modulo: string }) {
  const [criterios, setCriterios] = useState<CriterioAdmin[] | null>(null)
  const [roles, setRoles] = useState<{ id: string; nombre: string }[]>([])
  const [nuevos, setNuevos] = useState<CriterioAdmin[]>([])
  const [error, setError] = useState<string | null>(null)
  const cargar = useCallback(() => { criteriosAdmin(modulo).then(setCriterios).catch((e) => setError(e.message)) }, [modulo])
  useEffect(() => { setCriterios(null); setNuevos([]); cargar(); rolesDelModulo(modulo).then(setRoles).catch(() => {}) }, [modulo, cargar])

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>
  if (!criterios) return <p role="status">Cargando…</p>

  const grupos = [{ id: null as string | null, nombre: 'Todos los roles de la misión' }, ...roles]
    .map((g) => ({ ...g, items: criterios.filter((c) => c.rol_bel_id === g.id) }))
    .filter((g) => g.items.length)

  const validarTodo = async (items: CriterioAdmin[]) => {
    for (const c of items.filter((x) => !x.validado)) await guardarCriterio(modulo, { ...c, validado: true }, false)
    cargar()
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-dagrd-navy/70">Cada persona se evalúa con los criterios de «Todos los roles» más los de su rol. Un criterio crítico sin cumplir impide aprobar. Desactiva en lugar de borrar: así se conservan las evaluaciones anteriores.</p>
      {grupos.length === 0 && <p className="tarjeta p-6">Esta misión aún no tiene criterios.</p>}
      {grupos.map((g) => (
        <section key={g.id ?? 'todos'} className="tarjeta p-5" aria-label={g.nombre}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black">{g.nombre}</h3>
            <div className="flex items-center gap-2">
              <Insignia validado={g.items.every((c) => c.validado)} />
              {!g.items.every((c) => c.validado) && <button onClick={() => validarTodo(g.items)} className="text-xs font-bold text-dagrd-azul hover:underline">Marcar todo como validado</button>}
            </div>
          </div>
          <ul className="mt-3 space-y-3">{g.items.map((c) => <FilaCriterio key={c.id} c={c} modulo={modulo} nuevo={false} roles={roles} alGuardar={cargar} />)}</ul>
        </section>
      ))}
      {nuevos.length > 0 && (
        <ul className="space-y-3">
          {nuevos.map((c) => <FilaCriterio key={c.id} c={c} modulo={modulo} nuevo roles={roles} alGuardar={() => { setNuevos(nuevos.filter((n) => n.id !== c.id)); cargar() }} />)}
        </ul>
      )}
      <button className="boton-primario" onClick={() => setNuevos([...nuevos, {
        id: `nuevo-${Date.now()}`, rol_bel_id: null, descripcion: '', critico: false, orden: criterios.length + nuevos.length + 1, activo: true, validado: false,
      }])}>+ Nuevo criterio</button>
    </div>
  )
}

export default function Contenidos() {
  const [modulo, setModulo] = useState('M00')
  const [pestana, setPestana] = useState<'cuestionario' | 'reto'>('reto')
  return (
    <div>
      <header className="mb-6">
        <p className="etiqueta text-dagrd-azul">Centro de control</p>
        <h1 className="mt-1 text-3xl font-black">Contenidos de las misiones</h1>
      </header>
      <ControlNav />
      <label className="block max-w-xl text-sm font-bold">Misión
        <select className={`${campo} mt-1 min-h-[44px]`} value={modulo} onChange={(e) => setModulo(e.target.value)}>
          {ORDEN_FORMACION.map((c) => <option key={c} value={c}>{c} · {MODULOS[c].nombre} — {MODULOS[c].mision}</option>)}
        </select>
      </label>
      <div role="tablist" aria-label="Tipo de contenido" className="my-6 flex gap-2">
        {([['reto', 'Reto práctico'], ['cuestionario', 'Cuestionario']] as const).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
            className={`min-h-[40px] rounded-pill px-4 text-sm font-bold ${pestana === k ? 'bg-dagrd-amarillo text-dagrd-navy' : 'bg-white'}`}>{t}</button>
        ))}
      </div>
      {pestana === 'reto' ? <EditorCriterios modulo={modulo} /> : <EditorCuestionario modulo={modulo} />}
    </div>
  )
}
