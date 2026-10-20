/** Línea gráfica DAGRD — Key visual 2026 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dagrd: {
          amarillo: '#fddb16',
          navy: '#1f2b3f',
          fondo: '#232c4b',
          petroleo: '#00394b',
          azul: '#0086c3',
          gris: '#d3d3d1',
        },
      },
      fontFamily: { sans: ['Metropolis', 'system-ui', 'sans-serif'] },
      borderRadius: { pill: '9999px' },
    },
  },
  plugins: [],
}
