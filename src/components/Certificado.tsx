import Insignia from './Insignia'
import { MODULOS } from '../data/modulos'
import logoBomberos from '../assets/logo-bomberos.png'
import logoDagrd from '../assets/logo-dagrd.png'
import logoAlcaldia from '../assets/logo-alcaldia.png'

// Certificado «Especialista BEL»: hoja carta horizontal, lista para imprimir o guardar como PDF.
// Solo usa recursos del proyecto (logos institucionales e insignias propias de Operación BEL).

export interface DatosCertificado {
  nombre: string
  misiones: string[] // códigos aprobados, incluido RI
  fecha: string // ISO: fecha en que completó la ruta
}

const fechaLarga = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
/** Intensidad horaria del curso */
const HORAS = 16

export default function Certificado({ d }: { d: DatosCertificado }) {
  const misiones = d.misiones.filter((c) => c !== 'RI')
  return (
    <article className="certificado relative mx-auto grid overflow-hidden bg-white text-dagrd-navy"
      style={{ width: '11in', height: '8.5in', gridTemplateColumns: '3.15in 1fr', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      aria-label={`Certificado Especialista BEL de ${d.nombre}`}>
      {/* Franja institucional */}
      <aside className="relative flex flex-col items-center justify-between overflow-hidden bg-dagrd-fondo px-8 py-10 text-white">
        <span aria-hidden className="absolute -bottom-28 -right-24 h-72 w-72 rounded-full border-[26px] border-white/[.06]" />
        <div className="relative flex w-full items-center justify-center gap-4">
          <img src={logoBomberos} alt="Bomberos Medellín" className="h-[52px]" />
          <img src={logoDagrd} alt="DAGRD Medellín" className="h-[52px]" />
          <img src={logoAlcaldia} alt="Alcaldía de Medellín" className="h-[52px]" />
        </div>
        <div className="relative flex flex-col items-center text-center">
          <Insignia codigo="RI" obtenida tam={150} titulo="Mi turno en BEL" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[.22em] text-white/70">Reto integrador</p>
          <p className="text-base font-black text-dagrd-amarillo">«Mi turno en BEL»</p>
        </div>
        <div className="relative flex flex-col items-center leading-none">
          <span className="text-[11px] font-medium tracking-[.3em] text-white/80">OPERACIÓN</span>
          <span className="text-5xl font-black text-dagrd-amarillo">BEL</span>
          <span className="mt-2 text-[10px] text-white/70">Ruta de formación gamificada</span>
        </div>
      </aside>

      {/* Contenido */}
      <section className="relative flex flex-col px-14 py-11">
        <span aria-hidden className="absolute right-0 top-0 h-3 w-full bg-dagrd-amarillo" />
        <p className="text-[11px] font-bold uppercase tracking-[.28em] text-dagrd-azul">Certificado</p>
        <p className="mt-10 text-lg text-dagrd-navy/80">Operación BEL reconoce a</p>
        <h1 className="mt-1 text-[44px] font-black leading-[1.05]">{d.nombre}</h1>
        <p className="mt-4 text-lg text-dagrd-navy/80">con el título de</p>
        <p className="mt-2"><span className="sello bg-dagrd-amarillo text-[40px] text-dagrd-navy">Especialista BEL</span></p>
        <p className="mt-6 max-w-[6.4in] text-[15px] leading-relaxed text-dagrd-navy/85">
          por completar su ruta de formación en <strong>BEL · Bomberos en Línea</strong>.
        </p>

        <div className="mt-12">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-dagrd-navy/55">Insignias obtenidas</p>
          <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-3">
            {misiones.map((c) => (
              <li key={c} className="flex w-[70px] flex-col items-center text-center">
                <Insignia codigo={c} obtenida tam={60} titulo={MODULOS[c]?.insignia} />
                <span className="mt-1 text-[9px] font-bold leading-tight text-dagrd-navy/70">{MODULOS[c]?.nombre ?? c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-6 border-t border-dagrd-navy/15 pt-4 text-[13px]">
          <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-dagrd-navy/55">Fecha</p><p className="mt-0.5 font-bold">Medellín, {fechaLarga(d.fecha)}</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-dagrd-navy/55">Intensidad horaria</p><p className="mt-0.5 font-bold">{HORAS} horas</p></div>
        </div>
        <div className="mt-3 flex items-end justify-between gap-6">
          <p className="max-w-[4.6in] text-[9.5px] leading-snug text-dagrd-navy/55">
            Reconocimiento de la ruta gamificada Operación BEL, estrategia de uso y apropiación de BEL del Cuerpo de Bomberos de Medellín · DAGRD.
            No reemplaza certificaciones académicas ni laborales.
          </p>
          <span className="sello shrink-0 bg-dagrd-navy text-[11px] text-white">La misión es individual.<br />El resultado es de todos.</span>
        </div>
      </section>
    </article>
  )
}
