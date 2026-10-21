import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MODULOS, ORDEN_FORMACION } from '../../data/modulos'
import { ESTADO_INFO } from '../../components/UI'
import type { EstadoMision } from '../../data/types'
import ControlNav from './ControlNav'

interface Fila {
  perfil_id: string; nombre: string; correo: string; rol: string; familia: string; estacion: string | null; compania: string | null
  grupo_elite: boolean; codigo: string; estado: EstadoMision; xp: number; asistencia: boolean; cuestionario: boolean; reto: string
}
interface Persona {
  id: string; nombre: string; correo: string; rol: string; familia: string; estacion: string; compania: string; elite: boolean
  ruta: number; aprobadas: number; xp: number; refuerzo: string[]; asistio: boolean; siguiente: string | null
}

const ok = (e: EstadoMision) => e === 'aprobada' || e === 'convalidada'
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const campo = 'block min-h-[40px] w-full rounded-xl border border-dagrd-navy/20 bg-white px-3 text-sm'

function agrupar(filas: Fila[]): Persona[] {
  const m = new Map<string, Persona>()
  for (const f of filas) {
    let p = m.get(f.perfil_id)
    if (!p) {
      p = { id: f.perfil_id, nombre: f.nombre, correo: f.correo, rol: f.rol, familia: f.familia, estacion: f.estacion ?? 'Sin estación',
            compania: f.compania ?? 'Sin compañía', elite: f.grupo_elite, ruta: 0, aprobadas: 0, xp: 0, refuerzo: [], asistio: false, siguiente: null }
      m.set(f.perfil_id, p)
    }
    if (f.codigo !== 'RI') { p.ruta++; if (ok(f.estado)) p.aprobadas++ }
    p.xp += f.xp
    if (f.estado === 'requiere_refuerzo') p.refuerzo.push(f.codigo)
    if (f.asistencia) p.asistio = true
    if (!p.siguiente && !ok(f.estado) && f.estado !== 'bloqueada') p.siguiente = f.codigo
  }
  return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** Barra horizontal de un solo color: valor en % con etiqueta directa (sin leyenda: el título nombra la serie). */
function Barras({ titulo, datos }: { titulo: string; datos: { etiqueta: string; valor: number; detalle: string }[] }) {
  return (
    <figure className="tarjeta p-5">
      <figcaption className="font-black">{titulo}</figcaption>
      {datos.length === 0 ? <p className="mt-3 text-sm text-dagrd-navy/60">Sin datos para los filtros elegidos.</p> : (
        <ul className="mt-4 space-y-2.5">
          {datos.map((d) => (
            <li key={d.etiqueta} className="grid grid-cols-[minmax(70px,140px)_1fr_auto] items-center gap-3 text-sm" title={`${d.etiqueta}: ${d.valor} % (${d.detalle})`}>
              <span className="truncate text-dagrd-navy/80">{d.etiqueta}</span>
              <span className="relative h-3 rounded-r bg-[#ececea]" aria-hidden>
                {d.valor > 0 && <span className="absolute inset-y-0 left-0 rounded-r bg-dagrd-azul" style={{ width: `${Math.max(d.valor, 1.5)}%` }} />}
              </span>
              <span className="w-24 text-right tabular-nums"><strong>{d.valor} %</strong> <span className="text-xs text-dagrd-navy/60">{d.detalle}</span></span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

function Indicador({ titulo, valor, detalle, meta }: { titulo: string; valor: string; detalle: string; meta?: number }) {
  return (
    <div className="tarjeta p-5">
      <p className="etiqueta text-dagrd-navy/60">{titulo}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{valor}</p>
      <p className="mt-1 text-xs text-dagrd-navy/70">{detalle}{meta !== undefined && ` · meta piloto ${meta} %`}</p>
    </div>
  )
}

function exportarCSV(personas: Persona[]) {
  const enc = ['Nombre', 'Correo', 'Rol BEL', 'Familia', 'Estación', 'Compañía', 'Grupo Élite', 'Misiones de la ruta', 'Aprobadas', 'Avance %', 'XP', 'Requiere refuerzo en', 'Siguiente misión']
  const filas = personas.map((p) => [p.nombre, p.correo, p.rol, p.familia, p.estacion, p.compania, p.elite ? 'Sí' : 'No', p.ruta, p.aprobadas,
    pct(p.aprobadas, p.ruta), p.xp, p.refuerzo.join(' '), p.siguiente ?? ''])
  const csv = [enc, ...filas].map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = `operacion-bel-seguimiento-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function Tablero() {
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({ compania: '', estacion: '', familia: '', busqueda: '', elite: false, refuerzo: false })

  useEffect(() => {
    supabase.rpc('tablero').then(({ data, error }) => { if (error) setError(error.message); else setFilas(data as Fila[]) })
  }, [])

  const todas = useMemo(() => agrupar(filas ?? []), [filas])
  const opciones = (k: 'compania' | 'estacion' | 'familia') => [...new Set(todas.map((p) => p[k]))].sort()
  const q = f.busqueda.trim().toLowerCase()
  const personas = todas.filter((p) => (!f.compania || p.compania === f.compania) && (!f.estacion || p.estacion === f.estacion)
    && (!f.familia || p.familia === f.familia) && (!f.elite || p.elite) && (!f.refuerzo || p.refuerzo.length > 0)
    && (!q || `${p.nombre} ${p.correo} ${p.rol}`.toLowerCase().includes(q)))
  const ids = new Set(personas.map((p) => p.id))
  const filasF = (filas ?? []).filter((x) => ids.has(x.perfil_id))

  const porModulo = ORDEN_FORMACION.map((c) => {
    const del = filasF.filter((x) => x.codigo === c)
    const a = del.filter((x) => ok(x.estado)).length
    return { etiqueta: `${c} · ${MODULOS[c]?.nombre ?? ''}`, valor: pct(a, del.length), detalle: `${a}/${del.length}`, n: del.length }
  }).filter((d) => d.n > 0)
  const porGrupo = (k: 'compania' | 'estacion' | 'familia') => [...new Set(personas.map((p) => p[k]))].sort().map((g) => {
    const ps = personas.filter((p) => p[k] === g)
    const prom = ps.reduce((s, p) => s + (p.ruta ? p.aprobadas / p.ruta : 0), 0) / ps.length
    return { etiqueta: g, valor: Math.round(prom * 100), detalle: `${ps.length} pers.` }
  })

  const retos = filasF.filter((x) => x.reto !== 'pendiente')
  const conAsistencia = personas.filter((p) => p.asistio).length
  const completas = personas.filter((p) => p.ruta > 0 && p.aprobadas === p.ruta).length

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>

  return (
    <div className="space-y-6">
      <header>
        <p className="etiqueta text-dagrd-azul">Centro de control</p>
        <h1 className="mt-1 text-3xl font-black">Tablero de seguimiento</h1>
        <p className="mt-1 text-dagrd-navy/75">El avance se mide sobre la ruta de cada rol, para comparar de forma justa.</p>
      </header>
      <ControlNav />

      <div className="tarjeta grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.3fr_auto]">
        {([['compania', 'Compañía'], ['estacion', 'Estación'], ['familia', 'Familia de roles']] as const).map(([k, t]) => (
          <label key={k} className="text-xs font-bold">{t}
            <select className={`${campo} mt-1`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
              <option value="">Todas</option>{opciones(k).map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        ))}
        <label className="text-xs font-bold">Buscar
          <input type="search" className={`${campo} mt-1`} value={f.busqueda} onChange={(e) => setF({ ...f, busqueda: e.target.value })} placeholder="Nombre, correo o rol" />
        </label>
        <div className="flex flex-col justify-end gap-1 text-xs font-bold">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#00394b]" checked={f.elite} onChange={(e) => setF({ ...f, elite: e.target.checked })} />Grupo Élite</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#00394b]" checked={f.refuerzo} onChange={(e) => setF({ ...f, refuerzo: e.target.checked })} />Requieren refuerzo</label>
        </div>
      </div>

      {filas === null ? <p role="status">Cargando indicadores…</p> : (
        <>
          <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador titulo="Cobertura de formación" valor={`${pct(conAsistencia, personas.length)} %`} detalle={`${conAsistencia} de ${personas.length} con al menos una asistencia`} meta={90} />
            <Indicador titulo="Finalización de ruta" valor={`${pct(completas, personas.length)} %`} detalle={`${completas} de ${personas.length} completaron su ruta`} meta={85} />
            <Indicador titulo="Aprobación práctica" valor={`${pct(retos.filter((x) => x.reto === 'aprobado').length, retos.length)} %`} detalle={`${retos.length} retos evaluados`} meta={85} />
            <Indicador titulo="Requieren refuerzo" valor={String(personas.filter((p) => p.refuerzo.length).length)} detalle="personas con al menos una misión en refuerzo" />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Barras titulo="Misiones aprobadas por módulo (% de quienes la tienen asignada)" datos={porModulo} />
            <div className="space-y-4">
              <Barras titulo="Avance promedio por compañía" datos={porGrupo('compania')} />
              <Barras titulo="Avance promedio por familia de roles" datos={porGrupo('familia')} />
            </div>
          </div>
          <Barras titulo="Avance promedio por estación" datos={porGrupo('estacion')} />

          <section className="tarjeta p-5" aria-labelledby="t-personas">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="t-personas" className="text-xl font-black">Participantes ({personas.length})</h2>
              <button onClick={() => exportarCSV(personas)} disabled={!personas.length} className="boton-fantasma">Descargar para Excel</button>
            </div>
            {personas.length === 0 ? <p className="mt-4 text-sm text-dagrd-navy/70">No hay participantes con estos filtros.</p> : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-dagrd-navy/15 text-xs uppercase tracking-wide text-dagrd-navy/60">
                    <tr><th className="py-2 pr-3">Nombre</th><th className="pr-3">Rol</th><th className="pr-3">Estación · Compañía</th>
                      <th className="pr-3 text-right">Avance</th><th className="pr-3 text-right">XP</th><th className="pr-3">Siguiente</th><th>Refuerzo</th></tr>
                  </thead>
                  <tbody className="divide-y divide-dagrd-navy/10">
                    {personas.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-3"><span className="font-bold">{p.nombre}</span>{p.elite && <span className="ml-2 rounded-pill bg-dagrd-amarillo px-2 py-0.5 text-[10px] font-black">ÉLITE</span>}
                          <span className="block text-xs text-dagrd-navy/60">{p.correo}</span></td>
                        <td className="pr-3">{p.rol}</td>
                        <td className="pr-3 text-dagrd-navy/80">{p.estacion} · {p.compania}</td>
                        <td className="pr-3 text-right tabular-nums"><strong>{pct(p.aprobadas, p.ruta)} %</strong><span className="block text-xs text-dagrd-navy/60">{p.aprobadas}/{p.ruta}</span></td>
                        <td className="pr-3 text-right tabular-nums">{p.xp}</td>
                        <td className="pr-3">{p.siguiente ?? (p.aprobadas === p.ruta ? 'Ruta completa' : '—')}</td>
                        <td>{p.refuerzo.length ? <span className={`rounded-pill px-2 py-0.5 text-xs font-bold ${ESTADO_INFO.requiere_refuerzo.clase}`}>⚠ {p.refuerzo.join(', ')}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
