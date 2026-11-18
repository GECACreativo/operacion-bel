-- 0025 · Reto integrador ajustado (18-nov-2026): turno de la Compañía B en CB1; cada bombero hace todo.
-- Cada persona: relevo, novedad de vehículo, de HEA y locativa (sembradas), novedad de personal,
-- al menos una anotación en la minuta e inscripción a la convocatoria. Por grupo: una emergencia y su regreso
-- en el equipo de guardia. El mando cierra y firma la bitácora. No cambia roles.

update modulos set
  ubicacion = 'CB1 Guayabal · turno de la Compañía B',
  reto = 'Relevo → novedades sembradas de vehículo, HEA y locativa → novedad de personal → anotación en la minuta → emergencia y regreso del grupo → inscripción a formación → cierre de la bitácora.',
  victoria = 'Cada bombero registra en BEL todas sus novedades sin acompañamiento, y la bitácora se cierra con firma sin emergencias pendientes.',
  reglas = array['Se ejecuta en BEL con el turno de la Compañía B en CB1.',
                 'La minuta solo abre en el equipo de guardia registrado, que tiene el formador.',
                 'Cada novedad se registra sobre una avería sembrada, con foto real.',
                 'Los puntos no compensan un error crítico.']
where codigo = 'RI';

-- Criterios de 0024 (roles de línea, Encargado Operativo y generales): se desactivan
update criterios set activo = false
 where modulo_codigo = 'RI' and activo
   and (rol_bel_id is null or rol_bel_id in ('bombero','bombero_maquinista','guardia_permanente','encargado_estacion','encargado_operativo'));

insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden)
select 'RI', r.rol, c.d, c.k, c.o
  from (values ('bombero'), ('bombero_maquinista'), ('guardia_permanente'), ('encargado_estacion')) r(rol),
       (values
        ('Participa en el relevo y verifica que está asignado al turno de la Compañía B en CB1.', false, 1),
        ('Registra la novedad sembrada de su vehículo con descripción, afectación a la operación y foto.', true, 2),
        ('Registra la novedad sembrada de HEA con tipo (avería, desgaste o faltante), descripción y foto.', true, 3),
        ('Registra su novedad locativa sembrada, con la instalación y el tipo que le corresponden, ubicación, descripción y foto.', true, 4),
        ('Registra su novedad de personal con tipo, fechas, observaciones y soporte coherentes.', true, 5),
        ('Registra al menos una anotación en la minuta con la plantilla correcta.', true, 6),
        ('Su grupo registra la emergencia en la minuta y la completa con «Emergencia: Regreso de Máquina».', false, 7),
        ('Se inscribe en la convocatoria de formación abierta.', true, 8)) c(d, k, o);

insert into criterios (modulo_codigo, rol_bel_id, descripcion, critico, orden) values
('RI', null, 'Sigue la secuencia del turno: relevo, novedades, minuta, emergencia, formación y cierre.', false, 90),
('RI', null, 'Explica qué área recibe cada novedad que registró y qué pasa después.', false, 91),
('RI', 'bombero_maquinista', 'Hace el chequeo vehicular de inicio de la máquina durante el relevo, marcando OK, Falla o N/A.', false, 9),
('RI', 'encargado_estacion', 'Verifica que no hay emergencias pendientes y cierra y firma la bitácora.', true, 9);

-- Cuestionario «Turno completo en CB1»: preguntas 3 y 6 (el bombero reporta vehículo y locativa desde el Dashboard)
do $$
declare v_c uuid; v_p uuid;
begin
  select id into v_c from cuestionarios where modulo_codigo = 'RI' and titulo = 'Turno completo en CB1';

  select id into v_p from preguntas where cuestionario_id = v_c and orden = 3;
  update preguntas set enunciado = 'Usted es bombero (no maquinista) y ve una llanta con desgaste en la máquina. ¿Cómo la reporta en BEL?',
         retroalimentacion = 'En el Dashboard, «Mis novedades reportadas» › «Reportar novedad» › «Vehículo». El chequeo vehicular completo lo hace el Bombero Maquinista.'
   where id = v_p;
  update opciones set texto = case orden
      when 1 then 'No puede: solo el Bombero Maquinista reporta vehículos'
      when 2 then 'En el Dashboard: «Reportar novedad» › «Vehículo», con descripción y foto'
      when 3 then 'La anota solo en la minuta'
      when 4 then 'Le avisa por WhatsApp a Mantenimiento Vehicular' end
   where pregunta_id = v_p;
  update opciones_correctas set opcion_id = (select id from opciones where pregunta_id = v_p and orden = 2) where pregunta_id = v_p;

  select id into v_p from preguntas where cuestionario_id = v_c and orden = 6;
  update preguntas set enunciado = 'En el recorrido encuentra una fuga en el baño. ¿Cómo la registra usted como bombero?',
         retroalimentacion = 'Desde el Dashboard, «Reportar novedad» › «Locativa», con ubicación y foto. La novedad le llega al Encargado de Mantenimiento Locativo.'
   where id = v_p;
  update opciones set texto = case orden
      when 1 then 'No puede: solo el Encargado de Estación registra locativas'
      when 2 then 'Solo la anota en la minuta'
      when 3 then 'En el Dashboard: «Reportar novedad» › «Locativa», con ubicación y foto'
      when 4 then 'Llama directamente a Mantenimiento Locativo' end
   where pregunta_id = v_p;
  update opciones_correctas set opcion_id = (select id from opciones where pregunta_id = v_p and orden = 3) where pregunta_id = v_p;
end $$;
