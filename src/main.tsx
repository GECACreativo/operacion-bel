import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { ProveedorEstado, useEstado } from './estado'
import Marco from './components/Marco'
import Ingreso from './pages/Ingreso'
import MiOperacion from './pages/MiOperacion'
import Ruta from './pages/Ruta'
import Mision from './pages/Mision'
import Insignias from './pages/Insignias'
import Sesiones from './pages/control/Sesiones'
import SesionDetalle from './pages/control/SesionDetalle'

// Si algo falla al dibujar una pantalla, se muestra un aviso en lugar de una pantalla en blanco.
class Protector extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('[Operación BEL]', error) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center bg-dagrd-fondo p-6 text-center text-white">
        <div className="max-w-md">
          <p className="text-xl font-black">Algo salió mal en esta pantalla</p>
          <p className="mt-2 text-sm text-white/70">{this.state.error.message}</p>
          <button onClick={() => { window.location.hash = '#/'; window.location.reload() }} className="boton-primario mt-6">Volver al inicio</button>
        </div>
      </div>
    )
  }
}

// HashRouter: compatible con GitHub Pages sin configuración adicional del servidor.
function Pantalla({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center bg-dagrd-fondo p-6 text-center text-white">{children}</div>
}

function Rutas() {
  const { fase, error, recargar, salir, esGestor, esInstructor } = useEstado()
  if (fase === 'cargando') return (
    <Pantalla>
      <div>
        <p role="status" className="text-lg font-bold">Preparando tu operación…</p>
        <button onClick={() => window.location.reload()} className="mt-6 text-sm text-white/60 underline underline-offset-4">¿Tarda demasiado? Recargar</button>
      </div>
    </Pantalla>
  )
  if (fase === 'sin_sesion') return <Ingreso />
  if (fase === 'recuperacion') return <Ingreso recuperacion />
  if (fase === 'error') return (
    <Pantalla>
      <div className="max-w-md">
        <p className="text-xl font-black">No pudimos cargar tu información</p>
        <p className="mt-2 text-white/75">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={recargar} className="boton-primario">Reintentar</button>
          <button onClick={salir} className="boton border border-white/30 text-white">Salir</button>
        </div>
      </div>
    </Pantalla>
  )
  return (
    <Routes>
      <Route element={<Marco />}>
        <Route index element={<MiOperacion />} />
        <Route path="ruta" element={<Ruta />} />
        <Route path="mision/:codigo" element={<Mision />} />
        <Route path="insignias" element={<Insignias />} />
        {(esGestor || esInstructor) && <Route path="control" element={<Sesiones />} />}
        {(esGestor || esInstructor) && <Route path="control/sesion/:id" element={<SesionDetalle />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Protector>
    <ProveedorEstado>
      <HashRouter>
        <Rutas />
      </HashRouter>
    </ProveedorEstado>
    </Protector>
  </StrictMode>,
)
