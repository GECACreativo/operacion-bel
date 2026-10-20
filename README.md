# Operación BEL

Plataforma web de formación gamificada para la apropiación de **Bomberos en Línea (BEL)**, DAGRD y Cuerpo Oficial de Bomberos de Medellín.

> **Estado actual: Paso 1, prototipo visual con datos ficticios.** No guarda información ni se conecta con BEL ni con Supabase todavía.

## Tecnología

| Parte | Herramienta |
|---|---|
| Interfaz | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS con la línea gráfica DAGRD (key visual 2026) |
| Tipografía | Metropolis |
| Publicación | GitHub Pages (automática con GitHub Actions) |
| Datos y acceso (desde el Paso 2) | Supabase: base de datos, autenticación y reglas en el servidor |

## Estructura

```
src/
  data/        Catálogo de módulos (M00–M11 y RI), matriz rol–módulo y datos de prueba
  components/  Marco general, íconos y piezas visuales
  pages/       Ingreso, Mi Operación, Mi ruta, Detalle de misión, Insignias
```

La matriz rol–módulo (`src/data/roles.ts`) se tomó del Mapa de Flujos BEL y está **por validar** contra los permisos reales del sistema.

## Comandos

```bash
npm install          # instala dependencias
npm run dev          # abre la plataforma en el computador para desarrollar
npm run build        # verifica tipos y genera la versión publicable en dist/
npm run build:preview  # genera un único archivo HTML para vistas previas
```

## Publicación

Cada cambio en la rama `main` se publica automáticamente en GitHub Pages
(Settings → Pages → Source: **GitHub Actions**). El subdominio de GoDaddy se configura en el Paso 9.

## Línea gráfica

Amarillo `#fddb16` · Azul noche `#1f2b3f` / `#232c4b` · Petróleo `#00394b` · Azul `#0086c3` · Gris `#d3d3d1` · Blanco.
