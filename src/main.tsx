import { StrictMode } from 'react'
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

// HashRouter: compatible con GitHub Pages sin configuración adicional del servidor.
function Pantalla({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center bg-dagrd-fondo p-6 text-center text-white">{children}</div>
}

function Rutas() {
  const { fase, error, recargar, salir } = useEstado()
  if (fase === 'cargando') return <Pantalla><p role="status" className="text-lg font-bold">Preparando tu operación…</p></Pantalla>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorEstado>
      <HashRouter>
        <Rutas />
      </HashRouter>
    </ProveedorEstado>
  </StrictMode>,
)
