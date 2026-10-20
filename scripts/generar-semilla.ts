// Genera supabase/migrations/0003_datos_iniciales.sql a partir del catálogo en src/data.
import { writeFileSync } from 'node:fs'
import { MODULOS, ORDEN_FORMACION } from '../src/data/modulos'
import { ROLES, FAMILIAS } from '../src/data/roles'

const q = (s: string | null | undefined) => (s == null ? 'null' : `'${s.replace(/'/g, "''")}'`)
const arr = (a: string[]) => `array[${a.map(q).join(', ')}]::text[]`
const L: string[] = ['-- Operación BEL · 0003 · Datos iniciales (generado por scripts/generar-semilla.ts)', '']

L.push('insert into unidades (tipo, nombre) values')
const unidades = [
  ...['A', 'B', 'C'].map((c) => `('compania', 'Compañía ${c}')`),
  ...Array.from({ length: 9 }, (_, i) => `('estacion', 'Estación ${i + 1} (por validar)')`),
]
L.push(unidades.join(',\n') + '\non conflict do nothing;', '')

L.push('insert into roles_bel (id, nombre, familia, orden) values')
L.push(ROLES.map((r, i) => `(${q(r.id)}, ${q(r.nombre)}, ${q(r.familia)}, ${FAMILIAS.indexOf(r.familia) * 100 + i})`).join(',\n') + '\non conflict (id) do nothing;', '')

L.push('insert into modulos (codigo, nombre, mision, lema, ubicacion, modalidad, duracion_h, tipo, insignia, objetivo, reto, victoria, reglas, orden) values')
L.push(ORDEN_FORMACION.map((c, i) => {
  const m = MODULOS[c]
  return `(${q(m.codigo)}, ${q(m.nombre)}, ${q(m.mision)}, ${q(m.lema)}, ${q(m.ubicacion)}, ${q(m.modalidad)}, ${m.duracionH}, ${q(m.tipo)}, ${q(m.insignia)}, ${q(m.objetivo)}, ${q(m.reto)}, ${q(m.victoria)}, ${arr(m.reglas)}, ${i})`
}).join(',\n') + '\non conflict (codigo) do nothing;', '')

L.push('-- Matriz rol–misión del Mapa de Flujos BEL (validado = false) + reto integrador para todos los roles')
const filas: string[] = []
for (const r of ROLES) {
  for (const [cod, v] of Object.entries(r.ruta)) filas.push(`(${q(r.id)}, ${q(cod)}, ${q(v.hace)}, ${q(v.participacion.join(''))})`)
  filas.push(`(${q(r.id)}, 'RI', 'Ejecuta su parte del turno simulado', 'E')`)
}
L.push('insert into rol_modulo (rol_bel_id, modulo_codigo, hace, participacion) values')
L.push(filas.join(',\n') + '\non conflict do nothing;', '')

L.push(`-- Reglas de XP del piloto (configurables). RI: 0 + 140 + 10 + 50 = 200 XP
insert into reglas_xp (tipo, modulo_codigo, xp) values
('asistencia', null, 20), ('reto', null, 50), ('cuestionario', null, 20), ('autonomia', null, 10),
('asistencia', 'RI', 0), ('reto', 'RI', 140), ('cuestionario', 'RI', 10), ('autonomia', 'RI', 50)
on conflict do nothing;

insert into parametros (clave, valor, descripcion) values
('umbral_cuestionario', '0.8', 'Proporción mínima de respuestas correctas (por defecto para cuestionarios nuevos)'),
('umbral_reto', '0.8', 'Proporción mínima de criterios cumplidos en un reto (los críticos siempre son obligatorios)'),
('rankings_individuales', 'false', 'Mostrar clasificaciones individuales (desactivado por defecto)')
on conflict (clave) do nothing;
`)
writeFileSync('supabase/migrations/0003_datos_iniciales.sql', L.join('\n'))
console.log('ok', filas.length, 'filas rol_modulo')
