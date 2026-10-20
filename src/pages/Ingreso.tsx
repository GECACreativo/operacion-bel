import { useState, type FormEvent } from 'react'
import { FAMILIAS, ROLES } from '../data/roles'
import { useEstado } from '../estado'
import { Logos, Marca } from '../components/Marco'

export default function Ingreso() {
  const { ingresar } = useEstado()
  const [rolId, setRolId] = useState('bombero')
  const [aviso, setAviso] = useState('')

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    ingresar(rolId)
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <section className="relative overflow-hidden bg-dagrd-fondo px-6 pb-10 pt-8 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:py-12">
        {/* Formas del key visual */}
        <span aria-hidden className="absolute -left-10 top-10 h-24 w-56 rounded-r-pill bg-white/10" />
        <span aria-hidden className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border-[28px] border-white/[.06]" />
        <span aria-hidden className="absolute -right-8 bottom-0 hidden h-40 w-28 rounded-t-pill bg-white/10 lg:block" />
        <span aria-hidden className="absolute right-10 top-10 flex gap-2">
          {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-white/25" />)}
        </span>

        <div className="relative">
          <Logos className="h-10 sm:h-12" />
        </div>

        <div className="relative mt-10 max-w-xl lg:mt-0">
          <Marca grande />
          <p className="mt-4 text-xl font-bold sm:text-2xl">Preparados para cada desafío.</p>
          <p className="mt-4 hidden max-w-md text-white/75 sm:block">
            Cada turno requiere coordinación, información confiable y decisiones oportunas. Recorre las misiones de tu rol, practica los flujos de
            Bomberos en Línea y demuestra que puedes ejecutarlos con autonomía.
          </p>
          <span className="sello mt-6 bg-dagrd-amarillo text-base text-dagrd-navy">La misión es individual.<br />El resultado es de todos.</span>
        </div>

        <p className="relative mt-10 hidden text-xs text-white/50 lg:block">DAGRD · Cuerpo Oficial de Bomberos de Medellín</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-10">
        <form onSubmit={enviar} className="tarjeta w-full max-w-md p-6 sm:p-8" aria-labelledby="titulo-ingreso">
          <h1 id="titulo-ingreso" className="text-2xl font-black">Ingresa a tu operación</h1>
          <p className="mt-1 text-sm text-dagrd-navy/70">Usa el correo con el que fuiste inscrito.</p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-bold">Correo electrónico</span>
              <input type="email" autoComplete="email" placeholder="nombre@correo.com"
                className="mt-1 block min-h-[48px] w-full rounded-2xl border border-dagrd-navy/20 bg-white px-4 text-base" />
            </label>
            <label className="block">
              <span className="text-sm font-bold">Contraseña</span>
              <input type="password" autoComplete="current-password"
                className="mt-1 block min-h-[48px] w-full rounded-2xl border border-dagrd-navy/20 bg-white px-4 text-base" />
            </label>

            <fieldset className="rounded-2xl border border-dashed border-dagrd-azul/50 bg-dagrd-azul/5 p-3">
              <legend className="px-1 text-xs font-bold text-dagrd-azul">Solo en el prototipo</legend>
              <label className="block text-sm">
                <span className="font-bold">Entrar con el rol de BEL</span>
                <select value={rolId} onChange={(e) => setRolId(e.target.value)}
                  className="mt-1 block min-h-[44px] w-full rounded-xl border border-dagrd-navy/20 bg-white px-3 text-sm">
                  {FAMILIAS.map((f) => (
                    <optgroup key={f} label={f}>
                      {ROLES.filter((r) => r.familia === f).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            </fieldset>
          </div>

          <button type="submit" className="boton-primario mt-6 w-full text-base">Ingresar</button>
          <button type="button" onClick={() => setAviso('En la versión final recibirás un enlace en tu correo para crear una nueva contraseña.')}
            className="mt-3 w-full rounded-pill py-2 text-sm font-bold text-dagrd-azul underline-offset-4 hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
          {aviso && <p role="status" className="mt-2 rounded-xl bg-dagrd-gris/40 p-3 text-xs">{aviso}</p>}
          <p className="mt-6 text-center text-xs text-dagrd-navy/60">Prototipo con datos ficticios. No uses tu contraseña de BEL.</p>
        </form>
      </section>
    </div>
  )
}
