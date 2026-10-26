import { supabase } from '../lib/supabase'
import { enlacesFirmas } from './firmas'
import logoBomberos from '../assets/logo-bomberos.png'
import logoDagrd from '../assets/logo-dagrd.png'
import logoAlcaldia from '../assets/logo-alcaldia.png'

// Listas de asistencia de los encuentros de capacitación: descarga para Excel e impresión / PDF.

export interface FilaAsistencia {
  sesion_id: string; inicio: string; fin: string; modulo_codigo: string; modulo: string; mision: string
  modalidad: string; lugar: string | null; enlace: string | null; instructor: string | null; estado_sesion: string
  temas_abordados: string | null; temas_pendientes: string | null
  nombre: string; correo: string; rol: string | null; estacion: string | null; compania: string | null; grupo_elite: boolean
  asistencia: 'Asistió' | 'No asistió' | 'Sin registrar'; registrado_por: string | null; registrado_en: string | null
  firma_path?: string | null; firmado_en?: string | null
}

export async function listaAsistencia(f: { sesion?: string; desde?: string; hasta?: string; modulo?: string }): Promise<FilaAsistencia[]> {
  const { data, error } = await supabase.rpc('lista_asistencia', {
    p_sesion: f.sesion ?? null, p_desde: f.desde || null, p_hasta: f.hasta || null, p_modulo: f.modulo || null,
  })
  if (error) throw new Error(error.message)
  const firmas = await supabase.rpc('firmas_lista', {
    p_sesion: f.sesion ?? null, p_desde: f.desde || null, p_hasta: f.hasta || null, p_modulo: f.modulo || null,
  })
  const fm = new Map(((firmas.data ?? []) as { sesion_id: string; correo: string; firma_path: string; firmado_en: string }[]).map((x) => [`${x.sesion_id}|${x.correo}`, x]))
  return (data as FilaAsistencia[]).map((r) => { const x = fm.get(`${r.sesion_id}|${r.correo}`); return { ...r, firma_path: x?.firma_path ?? null, firmado_en: x?.firmado_en ?? null } })
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
const fechaCorta = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '')
const ESTADO: Record<string, string> = { programada: 'Programada', realizada: 'Realizada', suspendida: 'Suspendida', cancelada: 'Cancelada' }

/** Descarga para Excel (CSV con «;» y BOM UTF-8). */
export function descargarExcel(filas: FilaAsistencia[], nombreArchivo: string) {
  const enc = ['Fecha', 'Hora inicio', 'Hora fin', 'Misión', 'Módulo BEL', 'Modalidad', 'Lugar', 'Instructor', 'Estado de la sesión',
    'N.º', 'Nombre', 'Correo', 'Rol BEL', 'Estación', 'Compañía', 'Grupo Élite', 'Asistencia', 'Registrado por', 'Fecha de registro', 'Firmó', 'Fecha de firma']
  let n = 0, sesionAnterior = ''
  const datos = filas.map((r) => {
    n = r.sesion_id === sesionAnterior ? n + 1 : 1; sesionAnterior = r.sesion_id
    return [new Date(r.inicio).toLocaleDateString('es-CO'), hora(r.inicio), hora(r.fin), `${r.modulo_codigo} · ${r.mision}`, r.modulo,
      r.modalidad, r.lugar ?? (r.enlace ? 'Virtual' : ''), r.instructor ?? '', ESTADO[r.estado_sesion] ?? r.estado_sesion,
      n, r.nombre, r.correo, r.rol ?? '', r.estacion ?? '', r.compania ?? '', r.grupo_elite ? 'Sí' : 'No', r.asistencia,
      r.registrado_por ?? '', fechaCorta(r.registrado_en), r.firmado_en ? 'Sí' : 'No', fechaCorta(r.firmado_en ?? null)]
  })
  const csv = [enc, ...datos].map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = `${nombreArchivo}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const abs = (src: string) => new URL(src, window.location.href).href

/** Formato imprimible (y para guardar como PDF): una hoja por sesión, con espacio para firma. */
export async function imprimir(filas: FilaAsistencia[], ventana?: Window | null): Promise<boolean> {
  const enlaces = await enlacesFirmas(filas.map((r) => r.firma_path).filter(Boolean) as string[])
  const sesiones = [...new Map(filas.map((r) => [r.sesion_id, r])).values()]
  const hojas = sesiones.map((s) => {
    const personas = filas.filter((r) => r.sesion_id === s.sesion_id)
    const cuenta = (e: string) => personas.filter((p) => p.asistencia === e).length
    return `
    <section class="hoja">
      <header>
        <div class="logos"><img src="${abs(logoBomberos)}" alt="Bomberos Medellín"><img src="${abs(logoDagrd)}" alt="DAGRD"><img src="${abs(logoAlcaldia)}" alt="Alcaldía de Medellín"></div>
        <div class="titulo"><p class="marca">OPERACIÓN BEL</p><h1>Lista de asistencia</h1><p>Encuentro de capacitación</p></div>
      </header>
      <table class="datos">
        <tr><th>Misión</th><td>${esc(s.modulo_codigo)} · ${esc(s.mision)} <span class="suave">(${esc(s.modulo)})</span></td><th>Estado</th><td>${esc(ESTADO[s.estado_sesion] ?? s.estado_sesion)}</td></tr>
        <tr><th>Fecha</th><td>${esc(fecha(s.inicio))}</td><th>Horario</th><td>${esc(hora(s.inicio))} – ${esc(hora(s.fin))}</td></tr>
        <tr><th>Modalidad</th><td>${esc(s.modalidad)}</td><th>Lugar</th><td>${esc(s.lugar ?? (s.enlace ? 'Virtual' : '—'))}</td></tr>
        <tr><th>Instructor</th><td colspan="3">${esc(s.instructor ?? 'Sin asignar')}</td></tr>
      </table>
      ${s.estado_sesion === 'suspendida' ? `<p class="aviso"><strong>Sesión suspendida.</strong> Temas abordados: ${esc(s.temas_abordados)}. Temas pendientes: ${esc(s.temas_pendientes)}.</p>` : ''}
      <p class="resumen">Inscritos: <strong>${personas.length}</strong> · Asistieron: <strong>${cuenta('Asistió')}</strong> · No asistieron: <strong>${cuenta('No asistió')}</strong> · Sin registrar: <strong>${cuenta('Sin registrar')}</strong></p>
      <table class="lista">
        <thead><tr><th>N.º</th><th>Nombre</th><th>Correo</th><th>Rol BEL</th><th>Estación · Compañía</th><th>Asistencia</th><th class="firma">Firma</th></tr></thead>
        <tbody>${personas.map((p, i) => `<tr><td>${i + 1}</td><td><strong>${esc(p.nombre)}</strong></td><td>${esc(p.correo)}</td><td>${esc(p.rol ?? '')}</td>
          <td>${esc([p.estacion, p.compania].filter(Boolean).join(' · '))}</td><td>${esc(p.asistencia)}</td><td class="firma">${p.firma_path && enlaces[p.firma_path] ? `<img src="${esc(enlaces[p.firma_path])}" alt="Firma de ${esc(p.nombre)}">` : ''}</td></tr>`).join('')}</tbody>
      </table>
      <footer>
        <div class="linea">Nombre del instructor</div><div class="linea">Firma del instructor</div>
        <p class="generado">Generado en Operación BEL el ${esc(fechaCorta(new Date().toISOString()))}. La asistencia se registra en Operación BEL; la práctica se realiza en BEL.</p>
      </footer>
    </section>`
  }).join('')

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Lista de asistencia · Operación BEL</title>
  <style>
    @page { size: letter landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Metropolis, Arial, Helvetica, sans-serif; color: #1f2b3f; margin: 0; font-size: 11px; }
    .hoja { page-break-after: always; padding: 4px; }
    .hoja:last-child { page-break-after: auto; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    header { display: flex; align-items: center; justify-content: space-between; background: #232c4b; color: #fff; border-bottom: 5px solid #fddb16; border-radius: 10px 10px 0 0; padding: 10px 14px; margin-bottom: 10px; }
    .logos img { height: 44px; margin-right: 14px; }
    .titulo { text-align: right; }
    .marca { margin: 0; font-size: 9px; letter-spacing: 3px; font-weight: 700; color: #fddb16; }
    h1 { margin: 2px 0; font-size: 20px; }
    .titulo p { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    .datos th { text-align: left; width: 90px; background: #efefed; padding: 5px 8px; font-size: 10px; text-transform: uppercase; }
    .datos td { padding: 5px 8px; border-bottom: 1px solid #d3d3d1; }
    .suave { color: #5b6474; }
    .aviso { background: #fff4e5; border-left: 4px solid #f59e0b; padding: 6px 8px; }
    .resumen { margin: 10px 0 6px; }
    .lista th { background: #232c4b; color: #fff; text-align: left; padding: 6px; font-size: 10px; }
    .lista td { border-bottom: 1px solid #d3d3d1; padding: 7px 6px; height: 30px; vertical-align: middle; }
    .lista tr:nth-child(even) td { background: #f7f7f5; }
    .firma { width: 150px; }
    td.firma img { max-height: 34px; max-width: 140px; display: block; }
    footer { margin-top: 26px; display: flex; flex-wrap: wrap; gap: 40px; }
    .linea { border-top: 1px solid #1f2b3f; width: 230px; padding-top: 4px; font-size: 10px; }
    .generado { width: 100%; color: #5b6474; font-size: 9px; margin: 6px 0 0; }
    .barra { position: sticky; top: 0; background: #232c4b; color: #fff; padding: 10px 16px; display: flex; gap: 12px; align-items: center; font-size: 13px; }
    .barra button { background: #fddb16; color: #1f2b3f; border: 0; border-radius: 999px; padding: 8px 18px; font-weight: 800; cursor: pointer; }
    @media print { .barra { display: none; } }
  </style></head><body>
  <div class="barra" role="region" aria-label="Acciones"><button onclick="window.print()">Imprimir o guardar como PDF</button>
    <span>En el diálogo de impresión elige «Guardar como PDF» si quieres el archivo.</span></div>
  ${hojas || '<p style="padding:20px">No hay personas inscritas en las sesiones elegidas.</p>'}
  </body></html>`

  const w = ventana ?? window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(html); w.document.close()
  return true
}
