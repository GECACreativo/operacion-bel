import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useEstado } from '../estado'
import { opcionesControl } from '../pages/control/ControlNav'
import { IconoCalendario, IconoCasa, IconoInsignia, IconoReporte, IconoRuta, IconoSalir } from './Iconos'
import logoBomberos from '../assets/logo-bomberos.png'
import logoDagrd from '../assets/logo-dagrd.png'
import logoAlcaldia from '../assets/logo-alcaldia.png'

const NAV_BASE = [
  { to: '/', texto: 'Mi Operación', Icono: IconoCasa },
  { to: '/ruta', texto: 'Mi ruta', Icono: IconoRuta },
  { to: '/insignias', texto: 'Insignias', Icono: IconoInsignia },
]

export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`flex flex-col leading-none ${grande ? 'gap-1' : 'gap-0.5'}`}>
      <span className={`font-medium tracking-[.2em] text-white/80 ${grande ? 'text-sm' : 'text-[10px]'}`}>OPERACIÓN</span>
      <span className={`font-black text-dagrd-amarillo ${grande ? 'text-6xl sm:text-7xl' : 'text-2xl'}`}>BEL</span>
    </span>
  )
}

export function Logos({ className = 'h-10' }: { className?: string }) {
  return (
    <span className="flex items-center gap-4">
      <img src={logoBomberos} alt="Bomberos Medellín" className={className} />
      <img src={logoDagrd} alt="DAGRD Medellín" className={className} />
      <img src={logoAlcaldia} alt="Alcaldía de Medellín" className={className} />
    </span>
  )
}

export default function Marco() {
  const { salir, perfil, esGestor, esInstructor, esCoordinacion, esElite } = useEstado()
  const control = opcionesControl(esGestor, esInstructor, esCoordinacion)
  const NAV = [...NAV_BASE,
    ...(esElite || esGestor || esCoordinacion ? [{ to: '/reportes', texto: 'Reportes', Icono: IconoReporte }] : []),
    ...(control.length ? [{ to: control[0].to, texto: 'Control', Icono: IconoCalendario }] : [])]
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 boton-primario">Saltar al contenido</a>
      <header className="sticky top-0 z-30 bg-dagrd-fondo text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/" aria-label="Operación BEL, inicio"><Marca /></NavLink>
          <nav aria-label="Principal" className="hidden md:block">
            <ul className="flex gap-1">
              {NAV.map(({ to, texto, Icono }) => (
                <li key={to}>
                  <NavLink to={to} end={!to.startsWith('/control')} className={({ isActive }) =>
                    `flex min-h-[44px] items-center gap-2 rounded-pill px-4 text-sm font-bold transition-colors ${isActive ? 'bg-dagrd-amarillo text-dagrd-navy' : 'text-white/85 hover:bg-white/10'}`}>
                    <Icono /> {texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[160px] truncate text-sm font-bold text-white/85 sm:block">{perfil?.nombre}</span>
            <span className="hidden lg:block"><Logos className="h-9" /></span>
            <button onClick={salir} className="grid h-11 w-11 place-items-center rounded-full text-white/85 hover:bg-white/10" aria-label="Cerrar sesión">
              <IconoSalir />
            </button>
          </div>
        </div>
      </header>


      <main id="contenido" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="mt-8 hidden bg-dagrd-fondo md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-6">
          <span className="sello bg-dagrd-amarillo text-dagrd-navy text-sm">Preparados para<br />cada desafío</span>
          <Logos className="h-12" />
        </div>
      </footer>

      {/* Barra inferior en celular */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-dagrd-fondo md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}>
          {NAV.map(({ to, texto, Icono }) => (
            <li key={to}>
              <NavLink to={to} end={!to.startsWith('/control')} className={({ isActive }) =>
                `flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-bold ${isActive ? 'text-dagrd-amarillo' : 'text-white/70'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`grid h-8 w-12 place-items-center rounded-pill ${isActive ? 'bg-dagrd-amarillo text-dagrd-navy' : ''}`}><Icono /></span>
                    {texto}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
