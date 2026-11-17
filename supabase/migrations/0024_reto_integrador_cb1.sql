-- 0024 · Reto integrador: turno completo en CB1 como una sola compañía (16-nov-2026)
-- Ruta: relevo y apertura de minuta → chequeo vehicular → chequeo HEAs → locativas → novedades de personal
--       → novedad en minuta → emergencia → regreso → inscripción a formación (→ cierre de minuta).
-- No cambia roles. Desactiva (no borra) criterios anteriores de los roles de línea y crea los nuevos.
-- Crea un cuestionario para los roles de línea; el cuestionario anterior queda para roles administrativos y de mando.

update modulos set
  ubicacion = 'CB1 Guayabal · turno completo como una sola compañía',
  duracion_h = 4,
  objetivo = 'Ejecutar en BEL, con máquinas, contenedores e instalaciones reales de CB1, la ruta completa de un turno con las acciones de tu rol.',
  reto = 'Relevo y apertura de minuta → chequeo vehicular → chequeo de HEAs → novedad locativa → novedad de personal → novedad en minuta → emergencia → regreso → inscripción a formación.',
  victoria = 'Todas las acciones críticas de tu rol registradas en BEL sin acompañamiento y la minuta del turno cerrada sin emergencias pendientes.',
  reglas = array['Se ejecuta en BEL con el turno de CB1 programado para el ejercicio, como una sola compañía.',
                 'La minuta solo abre en el equipo de guardia registrado de CB1.',
                 'Cada novedad se registra con evidencia real: fotos de la máquina, el contenedor o la instalación.',
                 'Los puntos no compensan un error crítico.']
where codigo = 'RI';

-- Criterios anteriores de roles de línea y generales: se desactivan
update criterios set activo = false
 where modulo_codigo = 'RI'
   and (rol_bel_id is null or rol_bel_id in ('bombero','bombero_maquinista','guardia_permanente','encargado_estacion',
                                             'encargado_operativo','bombero_sh','bombero_cf'));

insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden) values
-- Generales (todos los roles con la misión)
('RI', null, 'Sigue la secuencia del turno: relevo, chequeos, novedades, minuta, emergencia y formación.', false, 90),
('RI', null, 'Explica qué área recibe cada novedad que registró y qué pasa después.', false, 91),
-- Bombero
('RI','bombero','Registra en la minuta su anotación del relevo («Relevo de Compañías» o «Recibo Turno de Guardia»).', true, 1),
('RI','bombero','Hace el chequeo de inicio de HEAs del contenedor asignado y reporta la novedad encontrada con descripción y fotos.', true, 2),
('RI','bombero','Identifica un daño locativo en el recorrido y lo reporta al Encargado de Estación con ubicación y foto.', false, 3),
('RI','bombero','Registra su novedad de personal con tipo, fechas, observaciones y soporte coherentes.', true, 4),
('RI','bombero','Registra en la minuta la novedad del turno con la plantilla correcta.', true, 5),
('RI','bombero','Registra la emergencia en la minuta («Emergencia» o «Emergencia: Despacho desde Estación»).', true, 6),
('RI','bombero','Completa la emergencia pendiente con «Emergencia: Regreso de Máquina» y queda «Completado».', true, 7),
('RI','bombero','Se inscribe en la convocatoria de formación abierta.', false, 8),
-- Bombero Maquinista
('RI','bombero_maquinista','Registra en la minuta su anotación del relevo («Relevo de Compañías» o «Recibo Turno de Guardia»).', true, 1),
('RI','bombero_maquinista','Selecciona los vehículos de CB1 y hace el chequeo de inicio marcando OK, Falla o N/A en cada punto.', true, 2),
('RI','bombero_maquinista','Reporta la falla encontrada con descripción, afectación a la operación y fotos.', true, 3),
('RI','bombero_maquinista','Registra su novedad de personal con tipo, fechas, observaciones y soporte coherentes.', true, 4),
('RI','bombero_maquinista','Registra en la minuta la novedad del turno con la plantilla correcta.', true, 5),
('RI','bombero_maquinista','Registra la emergencia en la minuta («Emergencia» o «Emergencia: Despacho desde Estación»).', true, 6),
('RI','bombero_maquinista','Completa la emergencia pendiente con «Emergencia: Regreso de Máquina» y queda «Completado».', true, 7),
('RI','bombero_maquinista','Se inscribe en la convocatoria de formación abierta.', false, 8),
-- Guardia Permanente
('RI','guardia_permanente','Registra en la minuta su anotación del relevo («Relevo de Compañías» o «Recibo Turno de Guardia»).', true, 1),
('RI','guardia_permanente','Registra el ingreso de personal externo con la plantilla «Ingreso Personal Externo / Empresa».', false, 2),
('RI','guardia_permanente','Registra su novedad de personal con tipo, fechas, observaciones y soporte coherentes.', true, 3),
('RI','guardia_permanente','Registra en la minuta la novedad del turno con la plantilla correcta.', true, 4),
('RI','guardia_permanente','Registra la emergencia en la minuta («Emergencia» o «Emergencia: Despacho desde Estación»).', true, 5),
('RI','guardia_permanente','Completa la emergencia pendiente con «Emergencia: Regreso de Máquina» y queda «Completado».', true, 6),
('RI','guardia_permanente','Se inscribe en la convocatoria de formación abierta.', false, 7),
-- Encargado de Estación
('RI','encargado_estacion','Abre la bitácora de guardia en el equipo de guardia y diligencia el reporte de inicio de turno.', true, 1),
('RI','encargado_estacion','Escala o rechaza con motivo las novedades de HEAs del chequeo.', true, 2),
('RI','encargado_estacion','Registra la novedad locativa con instalación, tipo, ubicación, fecha y hora de detección y fotos.', true, 3),
('RI','encargado_estacion','Registra una novedad de personal a nombre de un integrante de la guardia.', false, 4),
('RI','encargado_estacion','Registra la emergencia en la minuta («Emergencia» o «Emergencia: Despacho desde Estación»).', true, 5),
('RI','encargado_estacion','Completa la emergencia pendiente con «Emergencia: Regreso de Máquina» y queda «Completado».', true, 6),
('RI','encargado_estacion','Cierra y firma la bitácora sin emergencias pendientes.', true, 7),
-- Encargado Operativo (mando dentro del ejercicio)
('RI','encargado_operativo','Escala una novedad de HEA del chequeo con destino y prioridad.', false, 1),
('RI','encargado_operativo','Aprueba o rechaza con motivo la novedad de personal de un compañero.', false, 2);

-- Cuestionario para los roles de línea (el anterior queda para roles administrativos y de mando)
update cuestionarios set descripcion = 'Para roles administrativos y de mando. Cómo se conectan los flujos del turno.'
 where modulo_codigo = 'RI' and roles_bel is null;

do $$
declare
  v_c uuid; v_p uuid; v_o uuid; i int; j int;
  q jsonb := '[
   {"e":"¿Desde dónde se puede abrir la minuta (Bitácora Diaria) del turno?",
    "o":["Desde cualquier tablet o celular con usuario de BEL","Desde el equipo de guardia de la estación, con una cuenta de Windows registrada en Gestionar Hardware","Desde cualquier computador conectado a la red de la estación","Solo desde el computador del Subcomandante"],"c":2,
    "r":"La minuta solo abre en el equipo de guardia de su estación y compañía, con una cuenta de Windows registrada en Administración › Gestionar Hardware."},
   {"e":"¿Desde qué momento se puede abrir la bitácora para el relevo?",
    "o":["A las 08:00 en punto","Desde una hora antes del inicio del turno","Desde 10 minutos antes del inicio del turno","En cualquier momento del día"],"c":3,
    "r":"La bitácora se puede abrir desde 10 minutos antes del inicio del turno, para el relevo. Además hay que estar asignado al turno."},
   {"e":"¿Quién registra el chequeo vehicular en BEL?",
    "o":["Cualquier bombero del turno","El Encargado de Estación","El Bombero Maquinista","El Encargado de Mantenimiento Vehicular"],"c":3,
    "r":"El chequeo vehicular lo hace el Bombero Maquinista (o el Administrador). La tripulación acompaña la revisión en la máquina."},
   {"e":"En el chequeo vehicular, ¿qué pasa cuando marca «Falla» en un punto y guarda?",
    "o":["Se crea automáticamente una novedad del vehículo en estado «Novedad Reportada»","El vehículo queda fuera de servicio sin crear novedad","Hay que llamar a Mantenimiento para que la registre","Nada, hasta que se cierre el turno"],"c":1,
    "r":"Cada falla del chequeo crea automáticamente una novedad del vehículo, que llega a Mantenimiento Vehicular."},
   {"e":"En el chequeo de HEAs todos los ítems empiezan en «OK». ¿Qué debe hacer?",
    "o":["Revisar y marcar OK uno por uno","Marcar «Avería», «Desgaste» o «Faltante» solo en los ítems con novedad, describir la falla y agregar fotos","Reportar las fallas por WhatsApp al Encargado","Registrar solo los faltantes"],"c":2,
    "r":"Solo se marcan los ítems con novedad, con descripción y fotos. Si el ítem ya tiene una novedad abierta, la falla se suma a esa misma novedad."},
   {"e":"En el recorrido encuentra una gotera en el alojamiento. ¿Cómo queda registrada en BEL?",
    "o":["Usted la registra en Locativas desde su tablet","Solo se anota en la minuta","La informa al Encargado de Estación, que registra la novedad locativa con ubicación, fecha y hora de detección y fotos","Se llama directamente a Mantenimiento Locativo"],"c":3,
    "r":"La novedad locativa la registra el Encargado de Estación; le llega al Encargado de Mantenimiento Locativo. Use la fecha y hora en que se detectó el daño."},
   {"e":"¿Cómo se registra una incapacidad médica en Novedades de Personal?",
    "o":["Por horas, desde la hora en que salió","Siempre como turno completo de 24 horas","Con la hora que indique el médico","No se registra; la registra Nómina"],"c":2,
    "r":"Incapacidad Médica, Calamidad Doméstica y Fallecimiento se registran siempre como turno completo de 24 horas."},
   {"e":"Una anotación ya guardada en la minuta tiene un error. ¿Qué pasa?",
    "o":["Se puede editar hasta el cierre de la bitácora","La corrige el Encargado de Estación","No se puede editar: queda a su nombre y con la hora del sistema; se aclara con una nueva anotación","Se borra y se escribe de nuevo"],"c":3,
    "r":"La anotación se registra a su nombre y con la hora del sistema y no se puede editar después."},
   {"e":"Al pulsar «Emergencia» en la minuta y confirmar, ¿qué hace BEL?",
    "o":["Envía el despacho a la central","Deja una anotación de emergencia «Pendiente» y cierra su sesión para que salga a atender el servicio","Cierra la bitácora del turno","Avisa al Subcomandante y no registra nada"],"c":2,
    "r":"Queda una anotación pendiente y se cierra la sesión. Para dejar el despacho escrito sin cerrar la sesión se usa la plantilla «Emergencia: Despacho desde Estación»."},
   {"e":"¿Quién completa la emergencia pendiente con la plantilla «Emergencia: Regreso de Máquina»?",
    "o":["Cualquier persona del turno","El Encargado de Estación","Solo quien registró la emergencia","El sistema la completa solo al cierre"],"c":3,
    "r":"Solo quien registró la emergencia puede completarla. Al guardar, la anotación queda «Completado»."},
   {"e":"¿Cómo se inscribe en una convocatoria del Centro de Formación?",
    "o":["Pestaña «Convocatorias» › «Inscribirse» › revisa requisitos y adjunta la evidencia si la piden › «Confirmar inscripción»","Le escribe al coordinador del curso","Acepta la asignación en la franja «Confirma tu asistencia»","Se registra en la bitácora del Centro"],"c":1,
    "r":"Tras confirmar, el botón queda «Inscrito» hasta que el coordinador del curso apruebe o rechace la inscripción."},
   {"e":"¿Qué se necesita para cerrar y firmar la bitácora?",
    "o":["Nada; se cierra sola al terminar el turno y no se puede firmar antes","Conexión a internet y firma registrada en Firmas Digitales; el cierre es irreversible","Que el Subcomandante la apruebe primero","Que todos los del turno firmen"],"c":2,
    "r":"Requiere internet y firma registrada. Antes de cerrar, verifique que no haya emergencias pendientes: una bitácora cerrada no se reabre."}
  ]';
begin
  insert into cuestionarios (modulo_codigo, titulo, version, umbral, descripcion, roles_bel)
  values ('RI', 'Turno completo en CB1', 1, 0.8,
          'Borrador por validar. 12 preguntas sobre la ruta del turno: relevo, chequeos, novedades, minuta, emergencia y formación.',
          array['bombero','bombero_maquinista','guardia_permanente','encargado_estacion','encargado_operativo','bombero_sh','bombero_cf','ruta_elite'])
  returning id into v_c;
  for i in 0 .. jsonb_array_length(q) - 1 loop
    insert into preguntas (cuestionario_id, orden, enunciado, retroalimentacion)
    values (v_c, i + 1, q->i->>'e', q->i->>'r') returning id into v_p;
    for j in 0 .. jsonb_array_length(q->i->'o') - 1 loop
      insert into opciones (pregunta_id, orden, texto) values (v_p, j + 1, q->i->'o'->>j) returning id into v_o;
      if j + 1 = (q->i->>'c')::int then
        insert into opciones_correctas (pregunta_id, opcion_id) values (v_p, v_o);
      end if;
    end loop;
  end loop;
end $$;

-- Ajustes (16-nov): la minuta abre en un solo equipo de guardia, así que el relevo no se registra por persona;
-- el chequeo de HEAs acepta el chequeo de inicio o «Reportar novedad»; el Encargado de Estación separa relevo y reporte de inicio.
update criterios set descripcion='Verifica que está asignado al turno de CB1 y participa en el relevo de su tripulación.', critico=false
 where modulo_codigo='RI' and activo and descripcion='Registra en la minuta su anotación del relevo («Relevo de Compañías» o «Recibo Turno de Guardia»).' and rol_bel_id in ('bombero','bombero_maquinista');
update criterios set descripcion='Registra en la minuta el recibo de la guardia con «Recibo Turno de Guardia».'
 where modulo_codigo='RI' and activo and rol_bel_id='guardia_permanente' and descripcion like 'Registra en la minuta su anotación del relevo%';
update criterios set descripcion='Hace el chequeo de HEAs del contenedor asignado (chequeo de inicio o «Reportar novedad») y reporta la novedad encontrada con descripción y fotos.'
 where modulo_codigo='RI' and activo and rol_bel_id='bombero' and descripcion like 'Hace el chequeo de inicio de HEAs%';
update criterios set descripcion='Abre la bitácora de guardia y registra la anotación «Relevo de Compañías».'
 where modulo_codigo='RI' and activo and rol_bel_id='encargado_estacion' and orden=1;
insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden) values
('RI','encargado_estacion','Diligencia el reporte de inicio de turno de su estación.', true, 2);
update criterios set orden = orden + 1 where modulo_codigo='RI' and activo and rol_bel_id='encargado_estacion' and orden>=2 and descripcion <> 'Diligencia el reporte de inicio de turno de su estación.';
