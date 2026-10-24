import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  asignarClavesTemporales, catalogos, estadoAcceso, guardarUsuario, invitar, listarUsuarios, renombrarUnidad, ROLES_PLATAFORMA,
  type ClaveAsignada, type EstadoAcceso, type Usuario,
} from '../../data/usuarios'
import ControlNav from './ControlNav'
import { urlRetorno } from '../../lib/supabase'

type Catalogos = Awaited<ReturnType<typeof catalogos>>
const campo = 'mt-1 block min-h-[44px] w-full rounded-xl border border-dagrd-navy/20 bg-white px-3 text-sm'
const ESTADO: Record<EstadoAcceso, { t: string; c: string }> = {
  preinscrito: { t: 'Preinscrito', c: 'bg-dagrd-gris/60 text-dagrd-navy' },
  invitado: { t: 'Invitado', c: 'bg-dagrd-amarillo/60 text-dagrd-navy' },
  activo: { t: 'Activo', c: 'bg-dagrd-petroleo text-white' },
  inactivo: { t: 'Inactivo', c: 'bg-orange-100 text-orange-800' },
}
const vacio = (): Usuario => ({ correo: '', nombre: '', rol_bel_id: null, roles_bel_extra: [], estacion_id: null, compania_id: null, grupo_elite: false,
  roles: ['participante'], perfil_id: null, activo: true, invitado_en: null, ultimo_ingreso: null })

function Editor({ inicial, cat, alCerrar }: { inicial: Usuario; cat: Catalogos; alCerrar: (guardado: boolean) => void }) {
  const [u, setU] = useState(inicial)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const nuevo = !inicial.correo
  const guardar = async () => {
    setError(null)
    if (!u.nombre.trim() || !u.correo.trim()) return setError('Escribe el nombre y el correo.')
    if (!u.rol_bel_id) return setError('Elige el rol de BEL: de él depende la ruta de misiones.')
    setGuardando(true)
    try { await guardarUsuario(u); alCerrar(true) } catch (e) { setError((e as Error).message) }
    setGuardando(false)
  }
  return (
    <section className="tarjeta p-6" aria-labelledby="t-editor">
      <h2 id="t-editor" className="text-xl font-black">{nuevo ? 'Nueva persona' : `Editar · ${inicial.nombre}`}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Nombre completo<input className={campo} value={u.nombre} onChange={(e) => setU({ ...u, nombre: e.target.value })} /></label>
        <label className="text-sm font-bold">Correo<input type="email" className={campo} value={u.correo} disabled={!nuevo} onChange={(e) => setU({ ...u, correo: e.target.value })} /></label>
        <label className="text-sm font-bold">Rol principal en BEL
          <select className={campo} value={u.rol_bel_id ?? ''} onChange={(e) => setU({ ...u, rol_bel_id: e.target.value || null })}>
            <option value="">Elegir…</option>
            {[...new Set(cat.roles.map((r) => r.familia))].map((f) => (
              <optgroup key={f} label={f}>{cat.roles.filter((r) => r.familia === f).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</optgroup>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold">Estación
            <select className={campo} value={u.estacion_id ?? ''} onChange={(e) => setU({ ...u, estacion_id: e.target.value || null })}>
              <option value="">—</option>{cat.estaciones.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Compañía
            <select className={campo} value={u.compania_id ?? ''} onChange={(e) => setU({ ...u, compania_id: e.target.value || null })}>
              <option value="">—</option>{cat.companias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </label>
        </div>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-bold">Roles adicionales en BEL <span className="font-normal text-dagrd-navy/60">(si la persona tiene varios roles al tiempo; su ruta suma las misiones de todos)</span></legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {cat.roles.filter((r) => r.id !== u.rol_bel_id).map((r) => {
            const on = u.roles_bel_extra.includes(r.id)
            return (
              <label key={r.id} className={`flex min-h-[36px] cursor-pointer items-center gap-2 rounded-pill border px-3 text-xs ${on ? 'border-dagrd-navy bg-dagrd-azul/10 font-bold' : 'border-dagrd-navy/20'}`}>
                <input type="checkbox" className="h-4 w-4 accent-[#00394b]" checked={on}
                  onChange={(e) => setU({ ...u, roles_bel_extra: e.target.checked ? [...u.roles_bel_extra, r.id] : u.roles_bel_extra.filter((x) => x !== r.id) })} />
                {r.nombre}
              </label>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-sm font-bold">Permisos en Operación BEL <span className="font-normal text-dagrd-navy/60">(no dan permisos en BEL)</span></legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROLES_PLATAFORMA.map((r) => (
            <label key={r.id} className={`flex min-h-[40px] cursor-pointer items-center gap-2 rounded-pill border px-3 text-sm ${u.roles.includes(r.id) ? 'border-dagrd-navy bg-dagrd-amarillo/30 font-bold' : 'border-dagrd-navy/20'}`}>
              <input type="checkbox" className="h-4 w-4 accent-[#00394b]" checked={u.roles.includes(r.id)}
                onChange={(e) => setU({ ...u, roles: e.target.checked ? [...u.roles, r.id] : u.roles.filter((x) => x !== r.id) })} />
              {r.nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap gap-6 text-sm font-bold">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#00394b]" checked={u.grupo_elite} onChange={(e) => setU({ ...u, grupo_elite: e.target.checked })} />Integrante del Grupo Élite</label>
        {!nuevo && <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#00394b]" checked={u.activo} onChange={(e) => setU({ ...u, activo: e.target.checked })} />Activo</label>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={guardar} disabled={guardando} className="boton-primario">{guardando ? 'Guardando…' : 'Guardar'}</button>
        <button onClick={() => alCerrar(false)} className="boton-fantasma">Cancelar</button>
      </div>
    </section>
  )
}

// Importación desde Excel: se copian las filas y se pegan (columnas separadas por tabulación, ; o ,)
function Importar({ cat, alTerminar }: { cat: Catalogos; alTerminar: () => void }) {
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<string | null>(null)
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
  const buscar = <T extends { nombre: string }>(lista: T[], v: string) => {
    const n = norm(v); if (!n) return null
    return lista.find((x) => norm(x.nombre) === n) ?? lista.find((x) => norm(x.nombre).startsWith(n)) ??
      lista.find((x) => norm(x.nombre).endsWith(' ' + n)) ??
      (/\d+/.test(n) ? lista.find((x) => norm(x.nombre).match(/\d+/)?.[0] === n.match(/\d+/)![0]) : undefined) ?? null
  }
  const filas = useMemo(() => texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const c = l.split(l.includes('\t') ? '\t' : l.includes(';') ? ';' : ',').map((x) => x.trim())
    const [nombre = '', correo = '', rol = '', estacion = '', compania = '', elite = ''] = c
    // Varios roles en BEL: el primero es el principal (separados con + o con / dentro de la celda)
    const nombresRol = rol.split(/\s*[+/|]\s*|\s+y\s+/i).filter(Boolean)
    const rolesHallados = nombresRol.map((x) => buscar(cat.roles, x))
    const r = rolesHallados[0] ?? null, e = buscar(cat.estaciones, estacion), co = buscar(cat.companias, compania)
    const rolNoHallado = nombresRol.find((_, i) => !rolesHallados[i])
    const errores = [
      !nombre && 'falta nombre', !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo) && 'correo no válido',
      (!r || rolNoHallado) && `rol «${rolNoHallado ?? rol}» no reconocido`, estacion && !e && `estación «${estacion}» no encontrada`, compania && !co && `compañía «${compania}» no encontrada`,
    ].filter(Boolean) as string[]
    const extras = rolesHallados.slice(1).filter(Boolean).map((x) => x!.id)
    return { nombre, correo: correo.toLowerCase(), rol: r, extras, estacion: e, compania: co, elite: /^(s[ií]|x|1|true)$/i.test(elite), errores }
  }).filter((f) => !/^nombre$/i.test(f.nombre)), [texto, cat])
  const validas = filas.filter((f) => !f.errores.length)

  const preinscribir = async () => {
    let n = 0
    for (const f of validas) {
      try {
        await guardarUsuario({ ...vacio(), correo: f.correo, nombre: f.nombre, rol_bel_id: f.rol!.id, roles_bel_extra: f.extras, estacion_id: f.estacion?.id ?? null,
          compania_id: f.compania?.id ?? null, grupo_elite: f.elite, roles: f.elite ? ['participante', 'promotor_elite'] : ['participante'] })
        n++; setEstado(`Guardando ${n} de ${validas.length}…`)
      } catch (e) { setEstado(`Error con ${f.correo}: ${(e as Error).message}`); return }
    }
    setEstado(`Listo: ${n} personas preinscritas.`); setTexto(''); alTerminar()
  }

  return (
    <section className="tarjeta p-6" aria-labelledby="t-importar">
      <h2 id="t-importar" className="text-xl font-black">Importar desde Excel</h2>
      <p className="mt-1 text-sm text-dagrd-navy/75">Copia las filas en Excel y pégalas aquí, en este orden de columnas:</p>
      <p className="mt-2 rounded-xl bg-[#efefed] p-3 font-mono text-xs">Nombre · Correo · Rol BEL · Estación · Compañía · Grupo Élite (Sí/No)</p>
      <p className="mt-1 text-xs text-dagrd-navy/70">Si la persona tiene varios roles en BEL, escríbelos en la misma celda separados con «+». El primero queda como rol principal. Ej.: <span className="font-mono">Bombero Maquinista + Encargado de Estación</span></p>
      <textarea rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Filas pegadas desde Excel"
        placeholder={'Ana Pérez\tana@correo.com\tBombero\tCB4\tB\tSí'} className="mt-3 block w-full rounded-xl border border-dagrd-navy/20 p-3 font-mono text-xs" />
      {filas.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-dagrd-navy/60"><tr><th className="py-1 pr-2">Nombre</th><th className="pr-2">Correo</th><th className="pr-2">Rol</th><th className="pr-2">Estación · Compañía</th><th>Revisión</th></tr></thead>
            <tbody className="divide-y divide-dagrd-navy/10">
              {filas.map((f, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2">{f.nombre}{f.elite && ' ★'}</td><td className="pr-2">{f.correo}</td><td className="pr-2">{f.rol?.nombre ?? '—'}{f.extras.length > 0 && <span className="text-dagrd-navy/60"> + {f.extras.map((id) => cat.roles.find((x) => x.id === id)?.nombre).join(' + ')}</span>}</td>
                  <td className="pr-2">{f.estacion?.nombre ?? '—'} · {f.compania?.nombre ?? '—'}</td>
                  <td className={f.errores.length ? 'text-red-700' : 'text-dagrd-petroleo'}>{f.errores.length ? f.errores.join('; ') : 'Correcta'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {estado && <p role="status" className="mt-3 text-sm font-bold">{estado}</p>}
      <button onClick={preinscribir} disabled={!validas.length} className="boton-primario mt-4">Preinscribir {validas.length || ''} {validas.length === 1 ? 'persona' : 'personas'}</button>
      {filas.length > validas.length && <p className="mt-2 text-xs text-dagrd-navy/70">Las filas con errores no se guardan. Corrígelas en el texto y vuelve a revisar.</p>}
    </section>
  )
}

function Estaciones({ cat, alCambiar }: { cat: Catalogos; alCambiar: () => void }) {
  return (
    <details className="tarjeta p-5">
      <summary className="cursor-pointer font-black">Nombres de estaciones y compañías</summary>
      <p className="mt-2 text-sm text-dagrd-navy/70">Reemplaza los nombres provisionales «(por validar)» por los reales. Se guarda al salir del campo.</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[...cat.companias, ...cat.estaciones].map((x) => (
          <li key={x.id}><input defaultValue={x.nombre} aria-label={`Nombre de ${x.nombre}`} className={campo}
            onBlur={async (e) => { if (e.target.value.trim() && e.target.value !== x.nombre) { await renombrarUnidad(x.id, e.target.value); alCambiar() } }} /></li>
        ))}
      </ul>
    </details>
  )
}


// Plan B sin correo: contraseñas temporales que administración entrega por otro medio (WhatsApp, Teams, en persona)
function ClavesTemporales({ correos, alTerminar, alCerrar }: { correos: string[]; alTerminar: () => void; alCerrar: () => void }) {
  const [modo, setModo] = useState<'distinta' | 'misma'>('distinta')
  const [misma, setMisma] = useState('')
  const [res, setRes] = useState<ClaveAsignada[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const enlace = urlRetorno()
  const mensaje = (r: ClaveAsignada) =>
    `Hola${r.nombre ? ` ${r.nombre.split(' ')[0]}` : ''}, ya tienes acceso a Operación BEL.\nIngresa en ${enlace}\nUsuario: ${r.correo}\nContraseña temporal: ${r.clave}\nAl entrar te pedirá crear tu propia contraseña.`
  const copiar = async (texto: string, id: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(null), 2000) } catch { /* sin portapapeles */ }
  }
  const asignar = async () => {
    setError(null)
    if (modo === 'misma' && misma.trim().length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    setTrabajando(true)
    try { setRes(await asignarClavesTemporales(correos, modo === 'misma' ? misma.trim() : undefined)); alTerminar() }
    catch (e) { setError((e as Error).message) }
    setTrabajando(false)
  }
  const ok = (res ?? []).filter((r) => r.estado !== 'error')
  return (
    <div className="mt-4 rounded-2xl border-2 border-dagrd-navy/15 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-black">Contraseña temporal · {correos.length} {correos.length === 1 ? 'persona' : 'personas'}</h3>
          <p className="text-xs text-dagrd-navy/70">Úsala si el correo no llega. La persona entra con su correo y esta contraseña, y la plataforma le pide crear una propia.</p>
        </div>
        <button onClick={alCerrar} className="text-sm font-bold text-dagrd-navy/60 hover:underline">Cerrar</button>
      </div>
      {!res ? (
        <>
          <fieldset className="mt-3 space-y-2 text-sm">
            <label className="flex items-start gap-2"><input type="radio" name="modo" className="mt-1 accent-[#00394b]" checked={modo === 'distinta'} onChange={() => setModo('distinta')} />
              <span><span className="font-bold">Una distinta para cada persona</span> (recomendado). Ej.: Sirena-4827-Bel</span></label>
            <label className="flex items-start gap-2"><input type="radio" name="modo" className="mt-1 accent-[#00394b]" checked={modo === 'misma'} onChange={() => setModo('misma')} />
              <span><span className="font-bold">La misma para todas</span> <span className="text-dagrd-navy/60">— menos segura: cualquiera que la conozca podría entrar con el correo de otra persona antes de que la cambie.</span></span></label>
            {modo === 'misma' && <input value={misma} onChange={(e) => setMisma(e.target.value)} placeholder="Mínimo 8 caracteres" aria-label="Contraseña temporal"
              className="ml-6 block min-h-[40px] w-64 rounded-xl border border-dagrd-navy/20 px-3 font-mono" />}
          </fieldset>
          <p className="mt-3 text-xs text-dagrd-navy/70">Si la persona ya tenía contraseña, se reemplaza. Queda registrado en la auditoría.</p>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          <button onClick={asignar} disabled={trabajando} className="boton-secundario mt-3">{trabajando ? 'Asignando…' : 'Asignar contraseña temporal'}</button>
        </>
      ) : (
        <>
          <p role="status" className="mt-3 rounded-xl bg-dagrd-amarillo/30 p-3 text-sm font-bold">
            Copia y entrega estas contraseñas ahora: por seguridad no se guardan y no se podrán volver a ver. Si alguien la pierde, asígnale otra.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-dagrd-navy/60"><tr><th className="py-1 pr-2">Persona</th><th className="pr-2">Contraseña temporal</th><th></th></tr></thead>
              <tbody className="divide-y divide-dagrd-navy/10">
                {res.map((r) => (
                  <tr key={r.correo}>
                    <td className="py-2 pr-2"><span className="font-bold">{r.nombre ?? r.correo}</span><span className="block text-xs text-dagrd-navy/60">{r.correo}</span></td>
                    <td className="pr-2">{r.estado === 'error' ? <span className="text-red-700">{r.detalle}</span> : <span className="font-mono font-bold">{r.clave}</span>}</td>
                    <td className="text-right">{r.estado !== 'error' && (
                      <button onClick={() => copiar(mensaje(r), r.correo)} className="rounded-pill border border-dagrd-navy/20 px-3 py-1 text-xs font-bold hover:bg-[#efefed]">
                        {copiado === r.correo ? '¡Copiado!' : 'Copiar mensaje'}</button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ok.length > 1 && (
            <button onClick={() => copiar(ok.map((r) => `${r.nombre ?? ''}\t${r.correo}\t${r.clave}`).join('\n'), 'todo')} className="boton-fantasma mt-3">
              {copiado === 'todo' ? '¡Copiado!' : 'Copiar todo (para Excel)'}</button>
          )}
        </>
      )}
    </div>
  )
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [cat, setCat] = useState<Catalogos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [importando, setImportando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<EstadoAcceso | ''>('')
  const [elegidos, setElegidos] = useState<string[]>([])
  const [resultado, setResultado] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [claves, setClaves] = useState<string[] | null>(null)

  const cargar = useCallback(() => {
    listarUsuarios().then(setUsuarios).catch((e) => setError(e.message))
    catalogos().then(setCat).catch((e) => setError(e.message))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const nombreDe = (lista: { id: string; nombre: string }[] | undefined, id: string | null) => lista?.find((x) => x.id === id)?.nombre ?? '—'
  const q = busqueda.trim().toLowerCase()
  const visibles = (usuarios ?? []).filter((u) => (!filtro || estadoAcceso(u) === filtro)
    && (!q || `${u.nombre} ${u.correo} ${nombreDe(cat?.roles, u.rol_bel_id)}`.toLowerCase().includes(q)))

  const enviarInvitaciones = async () => {
    setEnviando(true); setResultado(null)
    try {
      const r = await invitar(elegidos)
      const cuenta = (e: string) => r.filter((x) => x.estado === e).length
      const errores = r.filter((x) => x.estado === 'error')
      setResultado(`${cuenta('invitado')} invitaciones enviadas, ${cuenta('reenviado')} accesos reenviados${errores.length ? `, ${errores.length} con error: ${errores.map((x) => `${x.correo} (${x.detalle})`).join('; ')}` : ''}.`)
      setElegidos([]); cargar()
    } catch (e) { setResultado(`No se pudo enviar: ${(e as Error).message}`) }
    setEnviando(false)
  }

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>

  return (
    <div className="space-y-6">
      <header>
        <p className="etiqueta text-dagrd-azul">Centro de control</p>
        <h1 className="mt-1 text-3xl font-black">Usuarios</h1>
        <p className="mt-1 text-dagrd-navy/75">Preinscribe a las personas con su rol de BEL y dales acceso: invitación por correo o contraseña temporal.</p>
      </header>
      <ControlNav />

      {cat && editando && <Editor key={editando.correo || 'nuevo'} inicial={editando} cat={cat} alCerrar={(g) => { setEditando(null); if (g) cargar() }} />}
      {cat && importando && !editando && <Importar cat={cat} alTerminar={cargar} />}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { setImportando(false); setEditando(vacio()) }} className="boton-primario">+ Nueva persona</button>
        <button onClick={() => { setEditando(null); setImportando(!importando) }} className="boton-fantasma">{importando ? 'Cerrar importación' : 'Importar desde Excel'}</button>
      </div>

      {cat && <Estaciones cat={cat} alCambiar={cargar} />}

      <section className="tarjeta p-5" aria-labelledby="t-lista">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-lista" className="text-xl font-black">Personas ({visibles.length})</h2>
          <div className="flex flex-wrap gap-2">
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar" aria-label="Buscar personas" className="min-h-[40px] rounded-xl border border-dagrd-navy/20 px-3 text-sm" />
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as EstadoAcceso | '')} aria-label="Filtrar por estado" className="min-h-[40px] rounded-xl border border-dagrd-navy/20 px-3 text-sm">
              <option value="">Todos los estados</option>{Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}
            </select>
          </div>
        </div>

        {elegidos.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-dagrd-amarillo/25 p-3">
            <p className="text-sm font-bold">{elegidos.length} seleccionadas</p>
            <button onClick={enviarInvitaciones} disabled={enviando} className="boton-secundario min-h-[40px]">{enviando ? 'Enviando…' : 'Enviar invitación por correo'}</button>
            <button onClick={() => setClaves(elegidos)} className="boton-fantasma min-h-[40px]">Asignar contraseña temporal</button>
            <p className="text-xs text-dagrd-navy/70">Si el correo no llega, usa la contraseña temporal y entrégala por WhatsApp, Teams o en persona.</p>
          </div>
        )}
        {claves && <ClavesTemporales key={claves.join()} correos={claves} alTerminar={() => { setElegidos([]); cargar() }} alCerrar={() => setClaves(null)} />}
        {resultado && <p role="status" className="mt-3 rounded-xl bg-[#efefed] p-3 text-sm">{resultado}</p>}

        {usuarios === null ? <p role="status" className="mt-4">Cargando…</p> : visibles.length === 0 ? (
          <p className="mt-4 text-sm text-dagrd-navy/70">No hay personas. Usa «Nueva persona» o «Importar desde Excel».</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-dagrd-navy/15 text-xs uppercase tracking-wide text-dagrd-navy/60">
                <tr>
                  <th className="w-10 py-2"><input type="checkbox" aria-label="Seleccionar todas" className="h-4 w-4 accent-[#00394b]"
                    checked={visibles.length > 0 && visibles.every((u) => elegidos.includes(u.correo))}
                    onChange={(e) => setElegidos(e.target.checked ? visibles.filter((u) => u.activo).map((u) => u.correo) : [])} /></th>
                  <th className="pr-3">Persona</th><th className="pr-3">Rol BEL</th><th className="pr-3">Estación · Compañía</th><th className="pr-3">Permisos</th><th className="pr-3">Estado</th><th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dagrd-navy/10">
                {visibles.map((u) => {
                  const est = ESTADO[estadoAcceso(u)]
                  return (
                    <tr key={u.correo}>
                      <td className="py-2.5"><input type="checkbox" aria-label={`Seleccionar a ${u.nombre}`} className="h-4 w-4 accent-[#00394b]" disabled={!u.activo}
                        checked={elegidos.includes(u.correo)} onChange={(e) => setElegidos(e.target.checked ? [...elegidos, u.correo] : elegidos.filter((x) => x !== u.correo))} /></td>
                      <td className="pr-3"><span className="font-bold">{u.nombre}</span>{u.grupo_elite && <span className="ml-2 rounded-pill bg-dagrd-amarillo px-2 py-0.5 text-[10px] font-black">ÉLITE</span>}
                        <span className="block text-xs text-dagrd-navy/60">{u.correo}</span></td>
                      <td className="pr-3">{nombreDe(cat?.roles, u.rol_bel_id)}{u.roles_bel_extra.length > 0 && <span className="block text-xs text-dagrd-navy/60">+ {u.roles_bel_extra.map((id) => nombreDe(cat?.roles, id)).join(' + ')}</span>}</td>
                      <td className="pr-3 text-dagrd-navy/80">{nombreDe(cat?.estaciones, u.estacion_id)} · {nombreDe(cat?.companias, u.compania_id)}</td>
                      <td className="pr-3 text-xs">{u.roles.map((r) => ROLES_PLATAFORMA.find((x) => x.id === r)?.nombre ?? r).join(', ')}</td>
                      <td className="pr-3"><span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${est.c}`}>{est.t}</span>
                        {u.clave_temporal && <span className="mt-1 block text-[11px] font-bold text-orange-700">Contraseña temporal sin cambiar</span>}
                        {u.invitado_en && !u.ultimo_ingreso && <span className="block text-[11px] text-dagrd-navy/60">Invitado el {new Date(u.invitado_en).toLocaleDateString('es-CO')}</span>}</td>
                      <td><button onClick={() => { setImportando(false); setEditando(u); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-sm font-bold text-dagrd-azul hover:underline">Editar</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
