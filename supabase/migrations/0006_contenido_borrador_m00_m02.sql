-- Operación BEL · 0006 · Contenido BORRADOR (por validar) de M00 y M02
-- Fuente: Mapa de Flujos BEL (flujos por rol y reglas del módulo). Redactado por Claude para revisión del equipo.

alter table criterios add column if not exists validado boolean not null default false;
alter table cuestionarios add column if not exists validado boolean not null default false;
alter table cuestionarios add column if not exists descripcion text;

-- ───────── M00 · Reto práctico ─────────
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden) values
('M00', null, 'Ingresa a BEL sin ayuda con su usuario, correo o cédula.', true, 1),
('M00', null, 'Recupera la contraseña con el enlace del correo (válido 1 hora) o explica el procedimiento.', false, 2),
('M00', null, 'Ubica las «Acciones Rápidas» y «Alertas Críticas» de su rol (o sus módulos en el menú, si su rol no tiene Dashboard).', false, 3),
('M00', null, 'Abre y revisa las notificaciones de la campana.', false, 4),
('M00', null, 'Revisa y actualiza «Mi Perfil».', false, 5),
('M00', null, 'Cierra la sesión al terminar.', false, 7);
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden)
select 'M00', r, 'Registra su firma digital en Administración › Firmas Digitales.', true, 6
from unnest(array['administrador','subcomandante','encargado_operativo','encargado_estacion','bombero','bombero_maquinista',
  'guardia_permanente','mant_heas','almacenista','bombero_cf','coord_sh','lider_compania','bombero_sh','secretaria']) r;

-- ───────── M02 · Reto práctico por perfil ─────────
-- Registran sus propias novedades
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden)
select 'M02', r, c.d, c.k, c.o from unnest(array['bombero','bombero_maquinista','guardia_permanente','mant_vehicular',
  'profesional_supervisor','bombero_cf','bombero_sh','secretaria']) r
cross join (values
  ('Descarga el formato de soporte en «Documentos de Referencia».', false, 1),
  ('Crea «Nueva Novedad» dejando vacío «Funcionario afectado» (novedad propia).', true, 2),
  ('Elige el «Tipo de Novedad», fechas y observaciones coherentes con el caso planteado.', true, 3),
  ('Si es compensatorio, verifica el saldo de horas antes de continuar.', false, 4),
  ('Adjunta los soportes y pulsa «Guardar Novedad».', true, 5),
  ('Busca la novedad, abre «Ver detalle» y descarga el comprobante PDF.', false, 6)
) as c(d, k, o);

-- Registra por su personal
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden) values
('M02', 'encargado_estacion', 'Crea «Nueva Novedad» eligiendo al funcionario afectado de su estación.', true, 1),
('M02', 'encargado_estacion', 'Registra tipo, fechas, observaciones y soportes coherentes con el caso.', true, 2),
('M02', 'encargado_estacion', 'Pulsa «Guardar Novedad» y verifica que quedó registrada.', true, 3),
('M02', 'encargado_estacion', 'Filtra por tipo, estado y fechas para hacer seguimiento.', false, 4),
('M02', 'encargado_estacion', 'Abre «Ver detalle» y descarga el comprobante PDF.', false, 5),
('M02', 'encargado_estacion', 'Exporta el listado a Excel.', false, 6);

-- Aprueban o rechazan
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden)
select 'M02', r, c.d, c.k, c.o from unnest(array['administrador','subcomandante','encargado_operativo']) r
cross join (values
  ('Filtra las novedades por estado y pulsa «Aplicar».', false, 1),
  ('Revisa los soportes en «Ver detalle» antes de decidir.', true, 2),
  ('Aprueba con «CAMBIAR ESTADO» y «Actualizar estado».', true, 3),
  ('Rechaza una novedad escribiendo el motivo.', true, 4),
  ('Exporta a Excel aplicando filtros.', false, 5)
) as c(d, k, o);
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden) values
('M02', 'subcomandante', 'Explica cuándo y cómo se corrige una novedad aprobada (incapacidad, luto o calamidad) con firma digital.', false, 6);

-- Consultan
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden)
select 'M02', r, c.d, c.k, c.o from unnest(array['mant_locativo','mant_heas','almacenista','coord_sh','lider_compania',
  'subdirector','lider_programa','lider_proyecto']) r
cross join (values
  ('Busca una novedad por código o nombre.', false, 1),
  ('Filtra por tipo, estado y fechas para encontrar la información pedida.', true, 2),
  ('Abre «Ver detalle» e interpreta el estado de la novedad.', true, 3),
  ('Descarga el comprobante PDF.', false, 4),
  ('Reconoce que su rol consulta, pero no registra ni aprueba novedades.', false, 5)
) as c(d, k, o);

-- ───────── Cuestionarios ─────────
create or replace function _cargar_pregunta(p_cuest uuid, p_orden int, p_enunciado text, p_retro text, p_opciones text[], p_correcta int)
returns void language plpgsql as $$
declare v_p uuid; v_o uuid; i int;
begin
  insert into preguntas (cuestionario_id, orden, enunciado, retroalimentacion) values (p_cuest, p_orden, p_enunciado, p_retro) returning id into v_p;
  for i in 1..array_length(p_opciones, 1) loop
    insert into opciones (pregunta_id, orden, texto) values (v_p, i, p_opciones[i]) returning id into v_o;
    if i = p_correcta then insert into opciones_correctas values (v_p, v_o); end if;
  end loop;
end $$;
revoke execute on function _cargar_pregunta from public, anon, authenticated;

do $$
declare c uuid;
begin
  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M00', 'Activación: acceso listo', 'Borrador por validar. 7 preguntas sobre el ingreso, la cuenta y la firma.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Cuánto tiempo sin actividad pasa antes de que BEL cierre la sesión?',
    'BEL cierra la sesión tras 5 minutos sin actividad y avisa 1 minuto antes.',
    array['1 minuto', '5 minutos', '15 minutos', '30 minutos'], 2);
  perform _cargar_pregunta(c, 2, '¿Qué requisitos debe cumplir la contraseña de BEL?',
    'Debe tener de 8 a 15 caracteres e incluir mayúscula, minúscula, número y símbolo.',
    array['Mínimo 6 caracteres, cualquiera', 'De 8 a 15 caracteres con mayúscula, minúscula, número y símbolo', 'Solo números', 'La misma cédula'], 2);
  perform _cargar_pregunta(c, 3, 'Olvidaste tu contraseña. ¿Qué haces?',
    'Usa «Recuperar contraseña»: llega un enlace al correo que vale 1 hora. Nunca compartas tu contraseña.',
    array['Se la pido a un compañero', 'Uso la recuperación: llega un enlace al correo válido por 1 hora', 'Creo una cuenta nueva', 'Espero 24 horas y vuelvo a intentar'], 2);
  perform _cargar_pregunta(c, 4, 'Te cambiaron de rol. ¿Qué debes hacer para ver tu nuevo menú?',
    'Después de un cambio de rol hay que cerrar sesión y volver a entrar.',
    array['Nada, cambia solo', 'Cerrar sesión y volver a entrar', 'Borrar el historial del navegador', 'Cambiar la contraseña'], 2);
  perform _cargar_pregunta(c, 5, '¿Qué pasa si no tienes registrada tu firma digital?',
    'Sin firma no se puede cerrar la bitácora, cerrar el consolidado ni descargar informes firmados.',
    array['Nada, es opcional', 'No puedes cerrar bitácora, cerrar el consolidado ni descargar informes firmados', 'No puedes ingresar a BEL', 'Se bloquea tu cuenta'], 2);
  perform _cargar_pregunta(c, 6, 'Un usuario recién creado no logra entrar. ¿Cuál es la causa más probable?',
    'Los usuarios nuevos quedan «pendientes» y no entran hasta que un administrador los activa.',
    array['Está «pendiente» hasta que un administrador lo active', 'Escribió la contraseña muy larga', 'Debe esperar al siguiente turno', 'Su estación no tiene internet'], 1);
  perform _cargar_pregunta(c, 7, '¿Quién puede cambiar tu rol, estación o compañías en BEL?',
    'Solo un administrador cambia rol, estación y compañías.',
    array['Tú, desde «Mi Perfil»', 'Solo un administrador', 'Cualquier mando de tu estación', 'El Grupo Élite'], 2);

  insert into cuestionarios (modulo_codigo, titulo, descripcion) values
  ('M02', 'Cada dato cuenta', 'Borrador por validar. 8 preguntas sobre el registro, la aprobación y los efectos de las novedades.') returning id into c;
  perform _cargar_pregunta(c, 1, '¿Dónde está el módulo de novedades de personal en BEL?',
    'Está en Menú › Gestión de Novedades › Personal.',
    array['Administración › Usuarios', 'Gestión de Novedades › Personal', 'Minuta Digital › Bitácora', 'Centro de Formación'], 2);
  perform _cargar_pregunta(c, 2, 'Vas a registrar una novedad tuya. ¿Qué haces con el campo «Funcionario afectado»?',
    'Si la novedad es propia, ese campo se deja vacío. Solo los mandos eligen a otra persona.',
    array['Lo dejo vacío', 'Escribo el nombre de mi jefe', 'Escribo el nombre de un compañero', 'Pongo mi cédula'], 1);
  perform _cargar_pregunta(c, 3, '¿Quiénes pueden registrar una novedad a nombre de otra persona?',
    'Solo los mandos: Administrador, Subcomandante, Encargado Operativo y Encargado de Estación.',
    array['Cualquier bombero', 'Los mandos: Administrador, Subcomandante, Encargado Operativo y Encargado de Estación', 'Solo la Secretaria', 'El Grupo Élite'], 2);
  perform _cargar_pregunta(c, 4, '¿Cómo se registran la incapacidad, la calamidad doméstica y la muerte?',
    'Siempre como turno completo de 24 horas.',
    array['Por horas', 'Siempre como turno completo de 24 horas', 'Como medio turno', 'Como compensatorio'], 2);
  perform _cargar_pregunta(c, 5, '¿Qué se necesita para registrar un compensatorio?',
    'Un compensatorio exige saldo de horas suficiente.',
    array['Autorización verbal', 'Saldo de horas suficiente', 'Que sea fin de semana', 'Nada adicional'], 2);
  perform _cargar_pregunta(c, 6, '¿Qué exige el sistema al rechazar una novedad?',
    'El rechazo exige escribir el motivo.',
    array['Escribir el motivo', 'Firmar con la firma digital', 'Adjuntar un PDF', 'Nada'], 1);
  perform _cargar_pregunta(c, 7, '¿Qué efecto tiene una novedad aprobada en los demás procesos?',
    'Bloquea a la persona en turnos, formación y Seguridad Humana ese día, y aparece en el cronograma.',
    array['Ninguno', 'Bloquea a la persona en turnos, formación y Seguridad Humana ese día', 'Solo cambia la nómina', 'Borra los turnos del mes'], 2);
  perform _cargar_pregunta(c, 8, '¿Quién puede corregir una novedad ya aprobada de incapacidad, luto o calamidad?',
    'Solo el Subcomandante, y con firma digital.',
    array['Quien la registró', 'El Encargado de Estación', 'Solo el Subcomandante, con firma digital', 'Nadie puede corregirla'], 3);
end $$;

-- La función auxiliar se conserva (sin permisos para usuarios) para cargar más contenido desde SQL.
