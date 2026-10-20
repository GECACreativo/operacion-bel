-- Operación BEL · 0001 · Esquema base
-- Tablas, relaciones, índices y restricciones únicas.
-- Las reglas de seguridad (RLS) y las funciones de negocio están en 0002.

create extension if not exists pgcrypto;

-- ───────────── Catálogos ─────────────

create type rol_plataforma as enum (
  'participante', 'instructor', 'admin_formacion', 'coordinacion', 'promotor_elite', 'admin_tecnico'
);
create type modalidad as enum ('Presencial', 'Virtual', 'Híbrida');
create type tipo_evidencia as enum ('asistencia', 'reto', 'cuestionario', 'autonomia', 'integrador', 'refuerzo', 'ajuste');

create table unidades (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('estacion', 'compania')),
  nombre      text not null,
  activo      boolean not null default true,
  unique (tipo, nombre)
);

create table roles_bel (
  id       text primary key,
  nombre   text not null unique,
  familia  text not null,
  orden    int  not null
);

create table modulos (
  codigo      text primary key,                 -- M00…M11, RI
  nombre      text not null,
  mision      text not null,
  lema        text,
  ubicacion   text,
  modalidad   modalidad not null,
  duracion_h  numeric(4,1) not null,
  tipo        text not null check (tipo in ('Capacitación', 'Entrenamiento', 'Transferencia', 'Integrador')),
  insignia    text not null,
  objetivo    text,
  reto        text,
  victoria    text,
  reglas      text[] not null default '{}',
  orden       int  not null,                    -- orden de formación del plan
  activo      boolean not null default true
);

-- Matriz rol–misión (fuente: Mapa de Flujos BEL). validado=false hasta confirmar contra permisos reales.
create table rol_modulo (
  rol_bel_id     text not null references roles_bel(id) on delete cascade,
  modulo_codigo  text not null references modulos(codigo) on delete cascade,
  hace           text not null,
  participacion  text not null check (participacion ~ '^[EACK]+$'),
  obligatorio    boolean not null default true,
  validado       boolean not null default false,
  primary key (rol_bel_id, modulo_codigo)
);

-- Puntajes configurables. modulo_codigo null = regla general; con valor = excepción para ese módulo.
create table reglas_xp (
  id             uuid primary key default gen_random_uuid(),
  tipo           tipo_evidencia not null,
  modulo_codigo  text references modulos(codigo) on delete cascade,
  xp             int not null check (xp >= 0),
  activo         boolean not null default true
);
create unique index reglas_xp_unica on reglas_xp (tipo, coalesce(modulo_codigo, '*'));

-- Parámetros generales (umbral de cuestionario, etc.)
create table parametros (
  clave  text primary key,
  valor  jsonb not null,
  descripcion text
);

-- ───────────── Personas ─────────────

create table perfiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text not null,
  correo       text not null unique,
  rol_bel_id   text references roles_bel(id),
  estacion_id  uuid references unidades(id),
  compania_id  uuid references unidades(id),
  grupo_elite  boolean not null default false,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now()
);
create index on perfiles (rol_bel_id);
create index on perfiles (estacion_id);
create index on perfiles (compania_id);

create table perfil_roles (
  perfil_id  uuid not null references perfiles(id) on delete cascade,
  rol        rol_plataforma not null,
  primary key (perfil_id, rol)
);

-- Historial de cambios de rol BEL (la ruta se recalcula según el rol vigente)
create table historial_rol_bel (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references perfiles(id) on delete cascade,
  rol_anterior text references roles_bel(id),
  rol_nuevo    text references roles_bel(id),
  cambiado_por uuid references perfiles(id),
  motivo      text,
  fecha       timestamptz not null default now()
);

-- ───────────── Formación ─────────────

create table recursos (
  id             uuid primary key default gen_random_uuid(),
  modulo_codigo  text not null references modulos(codigo) on delete cascade,
  titulo         text not null,
  tipo           text not null check (tipo in ('manual', 'guia', 'video', 'enlace', 'documento')),
  url            text not null,
  orden          int not null default 0,
  activo         boolean not null default true
);

create table sesiones (
  id             uuid primary key default gen_random_uuid(),
  modulo_codigo  text not null references modulos(codigo),
  modalidad      modalidad not null,
  inicio         timestamptz not null,
  fin            timestamptz not null check (fin > inicio),
  lugar          text,
  enlace         text,
  instructor_id  uuid references perfiles(id),
  cupo           int,
  estado         text not null default 'programada' check (estado in ('programada', 'realizada', 'cancelada')),
  creado_en      timestamptz not null default now()
);
create index on sesiones (modulo_codigo, inicio);
create index on sesiones (instructor_id);

create table inscripciones (
  sesion_id  uuid not null references sesiones(id) on delete cascade,
  perfil_id  uuid not null references perfiles(id) on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (sesion_id, perfil_id)
);

-- Una asistencia por persona y sesión (evita duplicados)
create table asistencias (
  id              uuid primary key default gen_random_uuid(),
  sesion_id       uuid not null references sesiones(id) on delete cascade,
  perfil_id       uuid not null references perfiles(id) on delete cascade,
  presente        boolean not null,
  mecanismo       text not null default 'instructor' check (mecanismo in ('instructor', 'qr', 'virtual')),
  registrado_por  uuid references perfiles(id),
  registrado_en   timestamptz not null default now(),
  unique (sesion_id, perfil_id)
);

-- ───────────── Cuestionarios ─────────────

create table cuestionarios (
  id             uuid primary key default gen_random_uuid(),
  modulo_codigo  text not null references modulos(codigo) on delete cascade,
  titulo         text not null,
  version        int not null default 1,
  umbral         numeric(4,3) not null default 0.8 check (umbral > 0 and umbral <= 1),
  max_intentos   int,                          -- null = sin límite
  activo         boolean not null default true
);

create table preguntas (
  id               uuid primary key default gen_random_uuid(),
  cuestionario_id  uuid not null references cuestionarios(id) on delete cascade,
  orden            int not null,
  enunciado        text not null,
  retroalimentacion text
);

create table opciones (
  id           uuid primary key default gen_random_uuid(),
  pregunta_id  uuid not null references preguntas(id) on delete cascade,
  orden        int not null,
  texto        text not null
);

-- Las respuestas correctas viven aparte y NUNCA se exponen al navegador (sin políticas de lectura).
create table opciones_correctas (
  pregunta_id  uuid not null references preguntas(id) on delete cascade,
  opcion_id    uuid not null references opciones(id) on delete cascade,
  primary key (pregunta_id, opcion_id)
);

create table intentos (
  id               uuid primary key default gen_random_uuid(),
  cuestionario_id  uuid not null references cuestionarios(id),
  version          int not null,
  perfil_id        uuid not null references perfiles(id) on delete cascade,
  enviado_en       timestamptz not null default now(),
  puntaje          numeric(4,3) not null,
  aprobado         boolean not null
);
create index on intentos (perfil_id, cuestionario_id);

create table respuestas (
  intento_id   uuid not null references intentos(id) on delete cascade,
  pregunta_id  uuid not null references preguntas(id),
  opcion_id    uuid references opciones(id),
  correcta     boolean not null,
  primary key (intento_id, pregunta_id)
);

-- ───────────── Retos prácticos ─────────────

create table criterios (
  id             uuid primary key default gen_random_uuid(),
  modulo_codigo  text not null references modulos(codigo) on delete cascade,
  rol_bel_id     text references roles_bel(id),   -- null = aplica a todos los roles del módulo
  descripcion    text not null,
  critico        boolean not null default false,
  orden          int not null default 0,
  activo         boolean not null default true
);

create table evaluaciones_reto (
  id             uuid primary key default gen_random_uuid(),
  modulo_codigo  text not null references modulos(codigo),
  perfil_id      uuid not null references perfiles(id) on delete cascade,
  evaluador_id   uuid not null references perfiles(id),
  autonomo       boolean not null default false,
  aprobado       boolean not null,
  observaciones  text,
  evidencia_url  text,
  fecha          timestamptz not null default now()
);
create index on evaluaciones_reto (perfil_id, modulo_codigo);

create table resultados_criterio (
  evaluacion_id  uuid not null references evaluaciones_reto(id) on delete cascade,
  criterio_id    uuid not null references criterios(id),
  cumple         boolean not null,
  primary key (evaluacion_id, criterio_id)
);

-- ───────────── Gamificación ─────────────

-- Bitácora de XP: nunca se borra. Las correcciones son eventos compensatorios (xp negativa).
create table eventos_xp (
  id                 uuid primary key default gen_random_uuid(),
  perfil_id          uuid not null references perfiles(id) on delete cascade,
  modulo_codigo      text references modulos(codigo),
  tipo               tipo_evidencia not null,
  xp                 int not null,
  clave_idempotencia text not null unique,      -- p. ej. asistencia:M01:<perfil>
  fuente_id          uuid,
  motivo             text,
  creado_por         uuid references perfiles(id),
  creado_en          timestamptz not null default now()
);
create index on eventos_xp (perfil_id);

create table misiones_aprobadas (
  perfil_id      uuid not null references perfiles(id) on delete cascade,
  modulo_codigo  text not null references modulos(codigo),
  via            text not null default 'evidencias' check (via in ('evidencias', 'convalidacion')),
  motivo         text,
  autorizado_por uuid references perfiles(id),
  fecha          timestamptz not null default now(),
  revocada_en    timestamptz,                 -- si se corrige una evidencia, la misión vuelve a refuerzo
  motivo_revocacion text,
  primary key (perfil_id, modulo_codigo)
);

-- ───────────── Grupo Élite ─────────────

create table acompanamientos (
  id               uuid primary key default gen_random_uuid(),
  promotor_id      uuid not null references perfiles(id),
  participante_id  uuid references perfiles(id),
  estacion_id      uuid references unidades(id),
  modulo_codigo    text references modulos(codigo),
  tipo             text not null check (tipo in ('acompanamiento', 'duda', 'barrera', 'mejora')),
  tema             text not null,
  resultado        text check (resultado in ('resuelto', 'pendiente', 'escalado')),
  escalado_a       text check (escalado_a in ('funcional', 'permisos', 'seguridad', 'tecnico')),
  detalle          text,
  fecha            timestamptz not null default now()
);
create index on acompanamientos (promotor_id);

-- ───────────── Auditoría ─────────────

create table auditoria (
  id        bigint generated always as identity primary key,
  actor     uuid,
  accion    text not null,
  tabla     text,
  registro  text,
  antes     jsonb,
  despues   jsonb,
  motivo    text,
  fecha     timestamptz not null default now()
);
create index on auditoria (fecha desc);
