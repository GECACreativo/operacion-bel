import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { useEstado } from '../estado'
import { enlacesFirmas, firmarAsistencia, firmasPendientes, subirFirma, type FirmaPendiente } from '../data/firmas'
import { fmtFecha } from '../pages/MiOperacion'

type Modo = 'dibujar' | 'subir' | 'guardada'

/** Panel para firmar una asistencia: dibujar con el dedo o el mouse, subir una imagen o usar la firma guardada. */
export function FirmarAsistencia({ sesion, alFirmar, alCancelar }: { sesion: FirmaPendiente; alFirmar: () => void; alCancelar: () => void }) {
  const { perfil, recargar } = useEstado()
  const [modo, setModo] = useState<Modo>(perfil?.firma_path ? 'guardada' : 'dibujar')
  const [guardar, setGuardar] = useState(!perfil?.firma_path)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vistaArchivo, setVistaArchivo] = useState<string | null>(null)
  const [vistaGuardada, setVistaGuardada] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const trazando = useRef(false)
  const [hayTrazo, setHayTrazo] = useState(false)

  useEffect(() => {
    if (perfil?.firma_path) enlacesFirmas([perfil.firma_path]).then((u) => setVistaGuardada(u[perfil.firma_path!] ?? null))
  }, [perfil?.firma_path])

  // Lienzo nítido en pantallas de alta densidad
  useEffect(() => {
    const c = lienzo.current; if (!c || modo !== 'dibujar') return
    const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1
    c.width = r.width * d; c.height = r.height * d
    const ctx = c.getContext('2d')!; ctx.scale(d, d)
    ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1f2b3f'
    setHayTrazo(false)
  }, [modo])

  const punto = (e: PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const }
  const empezar = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); trazando.current = true
    const ctx = e.currentTarget.getContext('2d')!; const [x, y] = punto(e); ctx.beginPath(); ctx.moveTo(x, y)
  }
  const mover = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!trazando.current) return
    const ctx = e.currentTarget.getContext('2d')!; const [x, y] = punto(e); ctx.lineTo(x, y); ctx.stroke(); setHayTrazo(true)
  }
  const borrar = () => { const c = lienzo.current; if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setHayTrazo(false) }

  const elegirArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null; setError(null)
    if (f && !/^image\/(png|jpeg|webp)$/.test(f.type)) { setError('Sube una imagen PNG, JPG o WEBP.'); return }
    if (f && f.size > 1048576) { setError('La imagen pesa más de 1 MB. Prueba con una foto más liviana o un recorte.'); return }
    setArchivo(f); setVistaArchivo(f ? URL.createObjectURL(f) : null)
  }

  const confirmar = async () => {
    if (!perfil) return
    setError(null); setEnviando(true)
    try {
      let ruta: string
      if (modo === 'guardada' && perfil.firma_path) ruta = perfil.firma_path
      else if (modo === 'subir') { if (!archivo) throw new Error('Elige la imagen de tu firma.'); ruta = await subirFirma(perfil.id, archivo) }
      else {
        if (!hayTrazo) throw new Error('Dibuja tu firma en el recuadro.')
        const blob = await new Promise<Blob | null>((r) => lienzo.current!.toBlob(r, 'image/png'))
        if (!blob) throw new Error('No se pudo leer la firma. Inténtalo de nuevo.')
        ruta = await subirFirma(perfil.id, blob)
      }
      await firmarAsistencia(sesion.sesion_id, ruta, modo !== 'guardada' && guardar)
      if (modo !== 'guardada' && guardar) recargar()
      alFirmar()
    } catch (e) { setError((e as Error).message) }
    setEnviando(false)
  }

  const pestana = (m: Modo, t: string) => (
    <button type="button" role="tab" aria-selected={modo === m} onClick={() => { setModo(m); setError(null) }}
      className={`min-h-[40px] rounded-pill px-4 text-sm font-bold ${modo === m ? 'bg-dagrd-navy text-white' : 'bg-[#efefed] text-dagrd-navy'}`}>{t}</button>
  )

  return (
    <div className="aparecer mt-3 rounded-2xl border-2 border-dagrd-navy/15 bg-white p-4" role="group" aria-label={`Firmar asistencia de ${sesion.modulo_codigo}`}>
      <p className="text-sm"><span className="font-bold">{sesion.modulo_codigo} · {sesion.mision}</span> — {fmtFecha(sesion.inicio)}</p>
      <div role="tablist" aria-label="Forma de firmar" className="mt-3 flex flex-wrap gap-2">
        {perfil?.firma_path && pestana('guardada', 'Mi firma guardada')}
        {pestana('dibujar', 'Dibujar')}
        {pestana('subir', 'Subir imagen')}
      </div>

      {modo === 'guardada' && (
        <div className="mt-3 grid h-32 place-items-center rounded-xl border border-dagrd-navy/15 bg-[#f7f7f5]">
          {vistaGuardada ? <img src={vistaGuardada} alt="Tu firma guardada" className="max-h-28 max-w-full" /> : <span className="text-sm text-dagrd-navy/60">Cargando tu firma…</span>}
        </div>
      )}
      {modo === 'dibujar' && (
        <div className="mt-3">
          <canvas ref={lienzo} onPointerDown={empezar} onPointerMove={mover} onPointerUp={() => { trazando.current = false }} onPointerLeave={() => { trazando.current = false }}
            role="img" aria-label="Recuadro para dibujar tu firma. Si no puedes usar el mouse o el dedo, elige «Subir imagen»."
            className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-dagrd-navy/25 bg-[#fbfbfa]" />
          <div className="mt-1 flex items-center justify-between text-xs text-dagrd-navy/60">
            <span>Firma con el dedo o el mouse dentro del recuadro.</span>
            <button type="button" onClick={borrar} className="font-bold text-dagrd-azul hover:underline">Borrar</button>
          </div>
        </div>
      )}
      {modo === 'subir' && (
        <div className="mt-3">
          <label className="block text-sm font-bold">Foto o imagen de tu firma (PNG, JPG o WEBP, máximo 1 MB)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={elegirArchivo} className="mt-2 block w-full text-sm" />
          </label>
          {vistaArchivo && <img src={vistaArchivo} alt="Vista previa de la firma" className="mt-3 max-h-32 rounded-xl border border-dagrd-navy/15" />}
        </div>
      )}

      {modo !== 'guardada' && (
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#00394b]" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
          Guardar esta firma para mis próximas asistencias</label>
      )}
      <p className="mt-2 text-xs text-dagrd-navy/60">Al firmar confirmas tu asistencia a este encuentro de capacitación. Tu firma aparecerá en la lista de asistencia.</p>
      {error && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-800">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={confirmar} disabled={enviando} className="boton-primario">{enviando ? 'Firmando…' : 'Firmar asistencia'}</button>
        <button onClick={alCancelar} className="boton-fantasma">Cancelar</button>
      </div>
    </div>
  )
}

/** Tarjeta con las asistencias pendientes de firma (se muestra solo si hay alguna). */
export function FirmasPendientes({ modulo }: { modulo?: string }) {
  const [lista, setLista] = useState<FirmaPendiente[]>([])
  const [abierta, setAbierta] = useState<string | null>(null)
  const [listo, setListo] = useState<string | null>(null)
  const cargar = () => firmasPendientes().then((l) => setLista(modulo ? l.filter((x) => x.modulo_codigo === modulo) : l)).catch(() => setLista([]))
  useEffect(() => { cargar() }, [modulo]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!lista.length && !listo) return null
  return (
    <section className="tarjeta border-l-8 border-dagrd-amarillo p-6" aria-labelledby="t-firmas">
      <p className="etiqueta text-dagrd-azul">Asistencia</p>
      <h2 id="t-firmas" className="mt-1 text-xl font-black">{lista.length ? 'Firma tu asistencia' : 'Asistencia firmada'}</h2>
      {listo && <p role="status" className="mt-2 rounded-xl bg-dagrd-petroleo/10 p-3 text-sm font-bold text-dagrd-petroleo">✓ {listo}</p>}
      {lista.length > 0 && <p className="mt-1 text-sm text-dagrd-navy/70">Tu formador registró que asististe. Firma para dejar constancia en la lista de asistencia.</p>}
      <ul className="mt-3 space-y-3">
        {lista.map((s) => (
          <li key={s.sesion_id} className="rounded-2xl bg-[#f7f7f5] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm"><span className="font-bold">{s.modulo_codigo} · {s.mision}</span><span className="block text-xs text-dagrd-navy/60">{fmtFecha(s.inicio)} · {s.modalidad}</span></span>
              {abierta !== s.sesion_id && <button onClick={() => { setAbierta(s.sesion_id); setListo(null) }} className="boton-secundario min-h-[40px]">Firmar</button>}
            </div>
            {abierta === s.sesion_id && <FirmarAsistencia sesion={s} alCancelar={() => setAbierta(null)}
              alFirmar={() => { setAbierta(null); setListo(`Firmaste tu asistencia de ${s.modulo_codigo}.`); cargar() }} />}
          </li>
        ))}
      </ul>
    </section>
  )
}
