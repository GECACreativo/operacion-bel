import { useState, type FormEvent } from 'react'
import { useEstado } from '../estado'
import { Logos, Marca } from '../components/Marco'

const campo = 'mt-1 block min-h-[48px] w-full rounded-2xl border border-dagrd-navy/20 bg-white px-4 text-base'

function PanelMarca() {
  return (
    <section className="relative overflow-hidden bg-dagrd-fondo px-6 pb-10 pt-8 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:py-12">
      <span aria-hidden className="absolute -left-10 top-10 h-24 w-56 rounded-r-pill bg-white/10" />
      <span aria-hidden className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border-[28px] border-white/[.06]" />
      <span aria-hidden className="absolute -right-8 bottom-0 hidden h-40 w-28 rounded-t-pill bg-white/10 lg:block" />
      <span aria-hidden className="absolute right-10 top-10 flex gap-2">
        {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-white/25" />)}
      </span>
      <div className="relative"><Logos className="h-10 sm:h-12" /></div>
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
  )
}

function Formulario() {
  const { ingresar, recuperar } = useEstado()
  const [modo, setModo] = useState<'ingreso' | 'recuperar'>('ingreso')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true); setMensaje(null)
    if (modo === 'ingreso') {
      const err = await ingresar(correo, clave)
      if (err) setMensaje({ tipo: 'error', texto: err })
    } else {
      const err = await recuperar(correo)
      setMensaje(err ? { tipo: 'error', texto: err }
        : { tipo: 'ok', texto: 'Si el correo está registrado, recibirás un enlace para crear una nueva contraseña. Ábrelo en este mismo navegador.' })
    }
    setEnviando(false)
  }

  return (
    <form onSubmit={enviar} className="tarjeta w-full max-w-md p-6 sm:p-8" aria-labelledby="titulo-ingreso">
      <h1 id="titulo-ingreso" className="text-2xl font-black">{modo === 'ingreso' ? 'Ingresa a tu operación' : 'Recupera tu contraseña'}</h1>
      <p className="mt-1 text-sm text-dagrd-navy/70">
        {modo === 'ingreso' ? 'Usa el correo con el que fuiste inscrito.' : 'Te enviaremos un enlace a tu correo.'}
      </p>
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-bold">Correo electrónico</span>
          <input type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
            placeholder="nombre@correo.com" className={campo} />
        </label>
        {modo === 'ingreso' && (
          <label className="block">
            <span className="text-sm font-bold">Contraseña</span>
            <input type="password" required autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} className={campo} />
          </label>
        )}
      </div>
      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-xl p-3 text-sm ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-800' : 'bg-dagrd-azul/10 text-dagrd-petroleo'}`}>
          {mensaje.texto}
        </p>
      )}
      <button type="submit" disabled={enviando} className="boton-primario mt-6 w-full text-base">
        {enviando ? 'Un momento…' : modo === 'ingreso' ? 'Ingresar' : 'Enviar enlace'}
      </button>
      <button type="button" onClick={() => { setModo(modo === 'ingreso' ? 'recuperar' : 'ingreso'); setMensaje(null) }}
        className="mt-3 w-full rounded-pill py-2 text-sm font-bold text-dagrd-azul underline-offset-4 hover:underline">
        {modo === 'ingreso' ? '¿Olvidaste tu contraseña?' : 'Volver al ingreso'}
      </button>
      <p className="mt-6 text-center text-xs text-dagrd-navy/60">Esta plataforma es independiente de BEL. No uses aquí tu contraseña de BEL.</p>
    </form>
  )
}

export function NuevaClave() {
  const { cambiarClave } = useEstado()
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (clave !== confirmacion) return setError('Las contraseñas no coinciden.')
    setEnviando(true)
    setError(await cambiarClave(clave))
    setEnviando(false)
  }

  return (
    <form onSubmit={enviar} className="tarjeta w-full max-w-md p-6 sm:p-8" aria-labelledby="titulo-clave">
      <h1 id="titulo-clave" className="text-2xl font-black">Crea tu nueva contraseña</h1>
      <p className="mt-1 text-sm text-dagrd-navy/70">Mínimo 8 caracteres. Usa una distinta a la de BEL.</p>
      <div className="mt-6 space-y-4">
        <label className="block"><span className="text-sm font-bold">Nueva contraseña</span>
          <input type="password" required autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} className={campo} /></label>
        <label className="block"><span className="text-sm font-bold">Confírmala</span>
          <input type="password" required autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className={campo} /></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={enviando} className="boton-primario mt-6 w-full text-base">{enviando ? 'Guardando…' : 'Guardar y entrar'}</button>
    </form>
  )
}

export default function Ingreso({ recuperacion = false }: { recuperacion?: boolean }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <PanelMarca />
      <section className="flex items-center justify-center px-4 py-10 sm:px-10">
        {recuperacion ? <NuevaClave /> : <Formulario />}
      </section>
    </div>
  )
}
