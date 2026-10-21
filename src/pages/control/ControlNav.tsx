import { NavLink } from 'react-router-dom'
import { useEstado } from '../../estado'

/** Pestañas del Centro de control según los permisos de cada persona. */
export function opcionesControl(esGestor: boolean, esInstructor: boolean, esCoordinacion: boolean) {
  return [
    (esGestor || esInstructor) && { to: '/control', texto: 'Sesiones' },
    esGestor && { to: '/control/contenidos', texto: 'Contenidos' },
    esGestor && { to: '/control/usuarios', texto: 'Usuarios' },
    (esGestor || esCoordinacion) && { to: '/control/tablero', texto: 'Tablero' },
  ].filter(Boolean) as { to: string; texto: string }[]
}

export default function ControlNav() {
  const { esGestor, esInstructor, esCoordinacion } = useEstado()
  const opciones = opcionesControl(esGestor, esInstructor, esCoordinacion)
  if (opciones.length < 2) return null
  return (
    <nav aria-label="Centro de control" className="-mt-2 mb-6 flex gap-2 overflow-x-auto">
      {opciones.map((o) => (
        <NavLink key={o.to} to={o.to} end
          className={({ isActive }) => `min-h-[40px] shrink-0 rounded-pill px-4 py-2 text-sm font-bold ${isActive ? 'bg-dagrd-navy text-white' : 'bg-white text-dagrd-navy hover:bg-dagrd-gris/40'}`}>
          {o.texto}
        </NavLink>
      ))}
    </nav>
  )
}
