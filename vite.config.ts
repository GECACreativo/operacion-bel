import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// "singlefile" genera un solo HTML para vistas previas; el modo normal es para GitHub Pages.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'singlefile' ? [viteSingleFile()] : [])],
  build: { sourcemap: mode !== 'singlefile', outDir: mode === 'singlefile' ? 'dist-preview' : 'dist', assetsInlineLimit: mode === 'singlefile' ? 100_000_000 : 4096 },
}))
