import type { Participacion, Rol } from './types'

// Fuente: 00_Mapa_General.md (Mapa de Flujos BEL). Matriz POR VALIDAR contra los permisos reales de BEL.
// Formato compacto: código de módulo → [qué hace, participación]

type Fila = Record<string, [string, string]>

const p = (s: string) => s.split('') as Participacion[]
const rol = (id: string, nombre: string, familia: string, f: Fila): Rol => ({
  id,
  nombre,
  familia,
  ruta: Object.fromEntries(Object.entries(f).map(([k, [hace, part]]) => [k, { hace, participacion: p(part) }])),
})

const DASH_AR = 'Usuario con Dashboard y Actividad Reciente'
const DASH = 'Usuario con Dashboard'
const SIN_DASH = 'Usuario sin Dashboard en el menú'
const PARTICIPA = 'Participa en actividades'
const FIRMA = 'Firma y formatos'

export const FAMILIAS = ['Mando y control', 'Personal de línea', 'Mantenimiento y logística', 'Programas misionales', 'Administrativo y consulta']

export const ROLES: Rol[] = [
  rol('administrador', 'Administrador del Sistema', FAMILIAS[0], {
    M00: [DASH_AR, 'EC'], M01: ['Programa, firma y cierra', 'EA'], M02: ['Aprueba o rechaza', 'EA'], M03: ['Asegura la flota del turno', 'EA'],
    M04: ['Decide qué pasa con la novedad', 'EA'], M05: ['Reporta la novedad', 'E'], M06: ['Supervisa y cierra', 'EA'], M07: ['Coordina el Centro', 'EAK'],
    M08: ['Administra todo el módulo', 'EAK'], M09: ['Liquida la nómina', 'EAK'], M10: ['Genera el informe de cualquier estación', 'E'], M11: ['Configura todo', 'K'],
  }),
  rol('subcomandante', 'Subcomandante', FAMILIAS[0], {
    M00: [DASH_AR, 'EC'], M01: ['Programa, firma y cierra', 'EA'], M02: ['Aprueba o rechaza', 'EA'], M03: ['Asegura la flota del turno', 'EA'],
    M04: ['Decide qué pasa con la novedad', 'EA'], M05: ['Reporta la novedad', 'E'], M06: ['Supervisa y cierra', 'EA'], M07: [PARTICIPA, 'E'],
    M09: ['Crea reglas de calendario', 'K'], M10: ['Genera el informe de cualquier estación', 'E'], M11: ['Administra usuarios, roles e inventarios', 'K'],
  }),
  rol('encargado_operativo', 'Encargado Operativo', FAMILIAS[0], {
    M00: [DASH_AR, 'EC'], M01: ['Programa y ajusta, sin cerrar', 'E'], M02: ['Aprueba o rechaza', 'EA'], M03: ['Asegura la flota del turno', 'EA'],
    M04: ['Decide qué pasa con la novedad', 'EA'], M05: ['Reporta la novedad', 'E'], M06: ['Anota y cierra con firma', 'E'], M07: [PARTICIPA, 'E'],
    M10: ['Genera el informe de cualquier estación', 'E'], M11: ['Mantiene el inventario de HEAs', 'K'],
  }),
  rol('encargado_estacion', 'Encargado de Estación', FAMILIAS[0], {
    M00: [DASH_AR, 'EC'], M01: ['Responde por su estación', 'E'], M02: ['Registra por su personal', 'E'], M03: ['Responde por los vehículos de su estación', 'A'],
    M04: ['Decide qué pasa con la novedad', 'EA'], M05: ['Reporta la novedad', 'E'], M06: ['Anota y cierra con firma', 'E'], M07: [PARTICIPA, 'E'],
    M10: ['Genera el informe de su estación', 'E'], M11: [FIRMA, 'E'],
  }),
  rol('bombero', 'Bombero', FAMILIAS[1], {
    M00: [DASH, 'E'], M01: ['Consulta «Mis turnos»', 'C'], M02: ['Registra sus propias novedades', 'E'], M03: ['Consulta', 'C'],
    M04: ['Hace el chequeo del turno', 'E'], M06: ['Anota en la bitácora', 'E'], M07: [PARTICIPA, 'E'], M11: [FIRMA, 'E'],
  }),
  rol('bombero_maquinista', 'Bombero Maquinista', FAMILIAS[1], {
    M00: [DASH, 'E'], M01: ['Consulta «Mis turnos»', 'C'], M02: ['Registra sus propias novedades', 'E'], M03: ['Hace el chequeo vehicular', 'E'],
    M06: ['Anota en la bitácora', 'E'], M07: [PARTICIPA, 'E'], M11: [FIRMA, 'E'],
  }),
  rol('guardia_permanente', 'Guardia Permanente', FAMILIAS[1], {
    M00: [DASH, 'E'], M01: ['Consulta «Mis turnos»', 'C'], M02: ['Registra sus propias novedades', 'E'], M06: ['Anota en la bitácora', 'E'],
    M07: [PARTICIPA, 'E'], M11: [FIRMA, 'E'],
  }),
  rol('mant_vehicular', 'Encargado de Mantenimiento Vehicular', FAMILIAS[2], {
    M00: [SIN_DASH, 'E'], M02: ['Registra sus propias novedades', 'E'], M03: ['Lleva el mantenimiento', 'EA'], M07: [PARTICIPA, 'E'],
    M11: ['Hoja de vida de la flota', 'K'],
  }),
  rol('profesional_supervisor', 'Profesional Supervisor', FAMILIAS[2], {
    M00: [DASH, 'E'], M02: ['Registra sus propias novedades', 'E'], M03: ['Da el visto bueno final', 'A'], M11: ['Consulta catálogos o formatos', 'C'],
  }),
  rol('mant_locativo', 'Encargado de Mantenimiento Locativo', FAMILIAS[2], {
    M00: [SIN_DASH, 'E'], M02: ['Consulta', 'C'], M05: ['Gestiona la intervención', 'E'], M07: [PARTICIPA, 'E'], M11: ['Consulta catálogos o formatos', 'C'],
  }),
  rol('mant_heas', "Encargado de Mantenimiento HEA'S", FAMILIAS[2], {
    M00: [DASH, 'E'], M02: ['Consulta', 'C'], M04: ['Repara', 'E'], M11: ['Solo firma digital', 'E'],
  }),
  rol('almacenista', 'Almacenista', FAMILIAS[2], {
    M00: [DASH, 'E'], M02: ['Consulta', 'C'], M04: ['Da de baja y repone', 'E'], M11: ['Solo firma digital', 'E'],
  }),
  rol('coord_cf', 'Coordinador Centro de Formación', FAMILIAS[3], {
    M00: [SIN_DASH, 'E'], M01: ['Consulta para programar formación', 'C'], M07: ['Coordina el Centro', 'EAK'], M11: ['Configura el Centro de Formación', 'K'],
  }),
  rol('bombero_cf', 'Bombero Centro de Formación', FAMILIAS[3], {
    M00: [DASH, 'E'], M02: ['Registra sus propias novedades', 'E'], M06: ['Anota y cierra con firma', 'E'], M07: ['Apoya el Centro y su bitácora', 'E'],
    M11: [FIRMA, 'E'],
  }),
  rol('coord_sh', 'Coordinador de Seguridad Humana', FAMILIAS[3], {
    M00: [DASH, 'E'], M02: ['Consulta', 'C'], M08: ['Planea', 'EK'], M11: ['Solo firma digital', 'E'],
  }),
  rol('lider_compania', 'Líder de Compañía', FAMILIAS[3], {
    M00: [DASH, 'E'], M02: ['Consulta', 'C'], M08: ['Organiza, revisa y cierra', 'EA'], M11: ['Solo firma digital', 'E'],
  }),
  rol('bombero_sh', 'Bombero Seguridad Humana', FAMILIAS[3], {
    M00: [DASH, 'E'], M02: ['Registra sus propias novedades', 'E'], M06: ['Anota y cierra con firma', 'E'], M07: [PARTICIPA, 'E'],
    M08: ['Diligencia en campo', 'E'], M11: [FIRMA, 'E'],
  }),
  rol('secretaria', 'Secretaria', FAMILIAS[4], {
    M00: [DASH_AR, 'EC'], M02: ['Registra sus propias novedades', 'E'], M06: ['Consulta el archivo', 'C'], M07: [PARTICIPA, 'E'],
    M09: ['Liquida la nómina', 'EAK'], M11: [FIRMA, 'E'],
  }),
  rol('subdirector', 'Subdirector', FAMILIAS[4], {
    M00: [DASH_AR, 'EC'], M01: ['Sigue los reportes del día', 'C'], M02: ['Consulta', 'C'], M06: ['Consulta el archivo', 'C'], M07: [PARTICIPA, 'E'],
    M11: ['Consulta catálogos o formatos', 'C'],
  }),
  rol('lider_programa', 'Líder de Programa', FAMILIAS[4], {
    M00: [SIN_DASH, 'E'], M02: ['Consulta', 'C'], M03: ['Consulta', 'C'], M04: ['Consulta', 'C'], M07: [PARTICIPA, 'E'],
  }),
  rol('lider_proyecto', 'Líder de Proyecto', FAMILIAS[4], {
    M00: [SIN_DASH, 'E'], M02: ['Consulta', 'C'], M04: ['Consulta', 'C'],
  }),
]

export const PARTICIPACION_TEXTO: Record<Participacion, string> = {
  E: 'Ejecuta',
  A: 'Aprueba o decide',
  C: 'Consulta',
  K: 'Configura',
}

export const rolPorId = (id: string) => ROLES.find((r) => r.id === id) ?? ROLES[4]
