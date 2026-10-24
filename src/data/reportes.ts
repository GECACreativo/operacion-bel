import { supabase } from '../lib/supabase'

// Reportes de uso de BEL del Grupo Élite: retroalimentación del sistema en operación.

const ok = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(/row-level security/i.test(r.error.message) ? 'Solo el Grupo Élite puede registrar reportes.' : r.error.message.replace(/^.*?:\s*/, ''))
  return r.data
}

export type TipoReporte = 'falla' | 'dificultad' | 'duda'
export type Impacto = 'bajo' | 'medio' | 'alto'
export type EstadoReporte = 'nuevo' | 'en_revision' | 'escalado' | 'resuelto' | 'descartado'

export const TIPOS: Record<TipoReporte, { texto: string; ayuda: string; clase: string }> = {
  falla: { texto: 'Falla o error', ayuda: 'BEL no hace lo que debería', clase: 'bg-red-100 text-red-800' },
  dificultad: { texto: 'Dificultad de uso', ayuda: 'Funciona, pero cuesta usarlo', clase: 'bg-orange-100 text-orange-800' },
  duda: { texto: 'Duda frecuente', ayuda: 'El personal pregunta mucho esto', clase: 'bg-dagrd-amarillo/40 text-dagrd-navy' },
}
export const IMPACTOS: Record<Impacto, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto · impide operar' }
export const ESTADOS: Record<EstadoReporte, { texto: string; clase: string }> = {
  nuevo: { texto: 'Nuevo', clase: 'bg-dagrd-amarillo text-dagrd-navy' },
  en_revision: { texto: 'En revisión', clase: 'bg-dagrd-azul/10 text-dagrd-azul' },
  escalado: { texto: 'Escalado', clase: 'bg-orange-100 text-orange-800' },
  resuelto: { texto: 'Resuelto', clase: 'bg-dagrd-petroleo text-white' },
  descartado: { texto: 'Descartado', clase: 'bg-dagrd-gris/60 text-dagrd-navy/70' },
}

/** Acciones frecuentes de cada módulo (sugerencias; se puede escribir otra). */
export const ACCIONES: Record<string, string[]> = {
  M00: ['Ingresar a BEL', 'Recuperar contraseña', 'Usar las Acciones Rápidas del Dashboard', 'Revisar notificaciones', 'Actualizar Mi Perfil', 'Registrar firma digital'],
  M01: ['Crear turno', 'Asignar personal por estación y puesto', 'Mover personal en el Panel Operativo', 'Publicar cambios', 'Reporte de inicio de turno', 'Reporte de fin de turno', 'Consultar «Mis turnos»', 'Aprobar el Consolidado General', 'Firmar y Cerrar Turno'],
  M02: ['Descargar formato de soporte', 'Registrar novedad propia', 'Registrar novedad a nombre de otro', 'Adjuntar soportes', 'Aprobar o rechazar novedad', 'Corregir novedad aprobada', 'Descargar comprobante PDF', 'Exportar a Excel'],
  M03: ['Chequeo vehicular', 'Reportar falla con fotos', 'Aceptar o rechazar novedad del vehículo', 'Registrar mantenimiento y avances', 'Aprobar retorno a operativo', 'Asignar vehículo de reemplazo', 'Solicitar o aprobar préstamo', 'Consolidar Turno'],
  M04: ['Chequeo de HEAs', 'Reportar novedad de un ítem', 'Escalar novedad', 'Rechazar o reabrir novedad', 'Diagnóstico y reparación', 'Registrar baja', 'Cargar denuncia', 'Registrar reposición'],
  M05: ['Crear novedad locativa', 'Adjuntar fotos', 'Programar visita', 'Registrar intervención y avances', 'Cerrar como Resuelto', 'Descargar informe PDF'],
  M06: ['Abrir la bitácora del turno', 'Agregar anotación con plantilla', 'Registrar despacho de emergencia', 'Completar regreso de la máquina', 'Agregar observación', 'Cerrar y firmar bitácora', 'Consultar Archivo de Bitácoras', 'Trabajar sin conexión'],
  M07: ['Crear actividad', 'Asignar participantes o convocatoria', 'Aceptar o rechazar una fecha', 'Inscribirse a convocatoria', 'Cargar evidencias', 'Marcar asistencia', 'Registrar préstamo del Centro', 'Aprobar devolución'],
  M08: ['Planear actividad', 'Asignar vehículo y personal', 'Guardar cambios y enviar correo', 'Diligenciar «Mi Actividad»', 'Solicitar mejora', 'Cerrar el informe', 'Descargar Word o PDF'],
  M09: ['Crear período o Generar año', 'Validar novedades de la quincena', 'Ajuste masivo de horas', 'Guardar Nómina', 'Descargar cronograma + SCAT', 'Cerrar período', 'Crear regla de calendario'],
  M10: ['Seleccionar compañía, estación y fecha', 'Vista previa del informe', 'Generar PDF firmado'],
  M11: ['Crear o activar usuario', 'Cambiar roles y permisos', 'Autorizar equipo en Gestionar Hardware', 'Inventario de HEAs', 'Hoja de vida de vehículos', 'Configurar notificaciones', 'Subir formatos', 'Registrar firma digital'],
}

export interface Reporte {
  id: string; numero: number; creado_en: string; autor_id: string; autor: string; estacion: string | null
  modulo_codigo: string; modulo: string; rol_bel_id: string; rol: string; accion: string
  tipo: TipoReporte; impacto: Impacto; observacion: string; estado: EstadoReporte
  respuesta: string | null; gestionado_por: string | null; gestionado_en: string | null
}
export type DatosReporte = Pick<Reporte, 'modulo_codigo' | 'rol_bel_id' | 'accion' | 'tipo' | 'impacto' | 'observacion'>

export async function listarReportes(): Promise<Reporte[]> {
  return ok(await supabase.rpc('reportes_bel_lista')) as Reporte[]
}

export async function crearReporte(d: DatosReporte) {
  ok(await supabase.from('reportes_bel').insert(d))
}

export async function editarReporte(id: string, d: DatosReporte) {
  ok(await supabase.rpc('editar_reporte_bel', {
    p_id: id, p_modulo: d.modulo_codigo, p_rol: d.rol_bel_id, p_accion: d.accion, p_tipo: d.tipo, p_impacto: d.impacto, p_observacion: d.observacion,
  }))
}

export async function gestionarReporte(id: string, estado: EstadoReporte, respuesta: string) {
  ok(await supabase.rpc('gestionar_reporte_bel', { p_id: id, p_estado: estado, p_respuesta: respuesta }))
}

/** Roles que participan en un módulo (para elegir el rol del reporte). */
export async function rolesDeModulo(modulo: string): Promise<{ id: string; nombre: string }[]> {
  const filas = ok(await supabase.from('rol_modulo').select('rol:rol_bel_id(id, nombre, orden)').eq('modulo_codigo', modulo)) as any[]
  return filas.map((f) => f.rol).filter(Boolean).sort((a: any, b: any) => a.orden - b.orden)
}

/** Todos los roles BEL (para filtrar cuando no hay módulo elegido). */
export async function todosLosRoles(): Promise<{ id: string; nombre: string }[]> {
  return ok(await supabase.from('roles_bel').select('id, nombre').order('orden')) as { id: string; nombre: string }[]
}

/** Descarga para Excel (CSV con «;» y BOM UTF-8). */
export function exportarReportes(lista: Reporte[]) {
  const enc = ['N.º', 'Fecha', 'Autor', 'Estación', 'Módulo', 'Nombre del módulo', 'Rol', 'Acción', 'Tipo', 'Impacto', 'Observación', 'Estado', 'Respuesta', 'Gestionado por', 'Fecha de gestión']
  const f = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '')
  const filas = lista.map((r) => [r.numero, f(r.creado_en), r.autor, r.estacion ?? '', r.modulo_codigo, r.modulo, r.rol, r.accion,
    (TIPOS[r.tipo]?.texto ?? r.tipo), IMPACTOS[r.impacto], r.observacion, ESTADOS[r.estado].texto, r.respuesta ?? '', r.gestionado_por ?? '', f(r.gestionado_en)])
  const csv = [enc, ...filas].map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = `reportes-bel-grupo-elite-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
