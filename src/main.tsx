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
function Rutas() {
  const { autenticado } = useEstado()
  if (!autenticado) return <Ingreso />
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
