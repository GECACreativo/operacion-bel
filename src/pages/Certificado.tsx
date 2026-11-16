import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useEstado } from '../estado'
import CertificadoHoja from '../components/Certificado'
import { IconoAtras } from '../components/Iconos'

/** La persona completó su ruta: todas sus misiones (incluido el reto integrador) aprobadas o convalidadas. */
export function useRutaCompleta() {
  const { progreso } = useEstado()
  return progreso.length > 0 && progreso.every((p) => p.estado === 'aprobada' || p.estado === 'convalidada')
}

/** Tarjeta para descargar el certificado; solo aparece cuando la ruta está completa. */
export function TarjetaCertificado() {
  const completa = useRutaCompleta()
  if (!completa) return null
  return (
    <section className="tarjeta flex flex-wrap items-center justify-between gap-4 border-l-8 border-dagrd-amarillo p-6" aria-labelledby="t-cert">
      <div>
        <p className="etiqueta text-dagrd-azul">Ruta completa</p>
        <h2 id="t-cert" className="mt-1 text-xl font-black">Eres Especialista BEL</h2>
        <p className="mt-1 text-sm text-dagrd-navy/70">Aprobaste todas las misiones de tu ruta. Descarga tu certificado.</p>
      </div>
      <Link to="/certificado" className="boton-primario">Descargar mi certificado</Link>
    </section>
  )
}

/** Página del certificado: vista ajustada a la pantalla y botón para imprimir o guardar como PDF. */
export default function Certificado() {
  const { perfil, progreso } = useEstado()
  const completa = useRutaCompleta()
  const [fecha, setFecha] = useState<string | null>(null)
  const [escala, setEscala] = useState(1)

  useEffect(() => {
    if (!perfil || !completa) return
    const codigos = progreso.map((p) => p.codigo)
    supabase.from('misiones_aprobadas').select('modulo_codigo, fecha').eq('perfil_id', perfil.id)
      .then(({ data }) => {
        const fechas = ((data ?? []) as { modulo_codigo: string; fecha: string }[]).filter((x) => codigos.includes(x.modulo_codigo)).map((x) => x.fecha).sort()
        setFecha(fechas[fechas.length - 1] ?? new Date().toISOString())
      })
  }, [perfil, completa, progreso])

  useEffect(() => {
    const ajustar = () => setEscala(Math.min(1, (window.innerWidth - 32) / 1056))
    ajustar(); window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [])

  const volver = <Link to="/insignias" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-dagrd-navy/70 hover:text-dagrd-navy"><IconoAtras className="h-4 w-4" /> Volver</Link>
  if (!perfil) return null
  if (!completa) return (
    <div className="mx-auto max-w-xl space-y-4 p-6">{volver}
      <p className="tarjeta p-6">El certificado se habilita cuando apruebas todas las misiones de tu ruta y el reto integrador.</p>
    </div>
  )

  return (
    <div className="min-h-dvh bg-[#9aa0a8] pb-10 print:min-h-0 print:bg-white print:p-0">
      <style>{`@page { size: letter landscape; margin: 0 } @media print { html, body { background: #fff !important } }`}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-dagrd-fondo px-4 py-3 text-white print:hidden">
        <Link to="/insignias" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-white/85 hover:text-white"><IconoAtras className="h-4 w-4" /> Volver</Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden text-xs text-white/70 sm:inline">En el diálogo de impresión elige «Guardar como PDF», orientación horizontal.</span>
          <button onClick={() => window.print()} disabled={!fecha} className="boton-primario">Descargar o imprimir (PDF)</button>
        </div>
      </div>
      {fecha && (
        <div className="mx-auto mt-6 print:m-0 print:!h-auto print:!w-auto" style={{ width: 1056 * escala, height: 816 * escala }}>
          <div className="origin-top-left shadow-2xl print:!transform-none print:shadow-none" style={{ transform: `scale(${escala})`, width: 1056 }}>
            <CertificadoHoja d={{ nombre: perfil.nombre, misiones: progreso.map((p) => p.codigo), fecha }} />
          </div>
        </div>
      )}
    </div>
  )
}
