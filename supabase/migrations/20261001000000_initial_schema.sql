create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_servicio_enum') then
    create type categoria_servicio_enum as enum ('basico', 'intermedio', 'avanzado', 'primer_service', 'agregado', 'express');
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_turno_enum') then
    create type estado_turno_enum as enum ('pendiente', 'confirmado', 'cancelado', 'en_taller');
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_ot_enum') then
    create type estado_ot_enum as enum ('recepcion', 'en_proceso', 'espera_repuesto', 'listo', 'entregado');
  end if;

  if not exists (select 1 from pg_type where typname = 'disciplina_bici_enum') then
    create type disciplina_bici_enum as enum ('mtb_xc', 'mtb_enduro_dh', 'ruta', 'gravel', 'urbana', 'ebike', 'otra');
  end if;
end $$;

create table if not exists taller (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  nombre varchar(255) not null,
  cuit_rut varchar(50),
  telefono varchar(50),
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists cliente (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references taller(id) on delete cascade,
  nombre_completo varchar(255) not null,
  telefono varchar(50) not null,
  email varchar(255),
  direccion text,
  created_at timestamptz default now()
);

create table if not exists bicicleta (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references cliente(id) on delete cascade,
  marca_modelo varchar(255) not null,
  numero_serie varchar(100),
  horquilla varchar(100),
  shock varchar(100),
  disciplina disciplina_bici_enum default 'mtb_xc',
  primer_service_disponible boolean default true,
  created_at timestamptz default now()
);

create table if not exists servicio (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references taller(id) on delete cascade,
  nombre varchar(255) not null,
  categoria categoria_servicio_enum not null,
  precio_base numeric(12,2) not null default 0.00,
  tiempo_estimado_min int not null default 60,
  checklist_plantilla jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists agenda_turno (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references taller(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  bicicleta_id uuid not null references bicicleta(id) on delete cascade,
  fecha_hora timestamptz not null,
  estado estado_turno_enum default 'pendiente',
  observaciones text,
  created_at timestamptz default now()
);

create table if not exists orden_trabajo (
  id uuid primary key default gen_random_uuid(),
  numero_ot bigserial not null,
  taller_id uuid not null references taller(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  bicicleta_id uuid not null references bicicleta(id) on delete cascade,
  ot_garantia_id uuid references orden_trabajo(id) on delete set null,
  estado estado_ot_enum default 'recepcion',
  es_express boolean default false,
  inspeccion_recepcion jsonb default '{}'::jsonb,
  recomendaciones jsonb default '[]'::jsonb,
  fotos jsonb default '[]'::jsonb,
  bitacora_comunicaciones jsonb default '[]'::jsonb,
  presupuesto_total numeric(12,2) not null default 0.00,
  fecha_ingreso timestamptz default now(),
  fecha_entrega_estimada timestamptz,
  fecha_cierre timestamptz,
  created_at timestamptz default now()
);

create table if not exists orden_trabajo_servicio (
  id uuid primary key default gen_random_uuid(),
  orden_trabajo_id uuid not null references orden_trabajo(id) on delete cascade,
  servicio_id uuid not null references servicio(id) on delete restrict,
  precio_aplicado numeric(12,2) not null,
  observaciones text
);

create index if not exists cliente_taller_id_idx on cliente(taller_id);
create index if not exists servicio_taller_id_idx on servicio(taller_id);
create index if not exists agenda_turno_taller_fecha_idx on agenda_turno(taller_id, fecha_hora);
create index if not exists orden_trabajo_taller_estado_idx on orden_trabajo(taller_id, estado);
create index if not exists bicicleta_cliente_id_idx on bicicleta(cliente_id);
create index if not exists orden_trabajo_servicio_orden_idx on orden_trabajo_servicio(orden_trabajo_id);

alter table taller enable row level security;
alter table cliente enable row level security;
alter table bicicleta enable row level security;
alter table servicio enable row level security;
alter table agenda_turno enable row level security;
alter table orden_trabajo enable row level security;
alter table orden_trabajo_servicio enable row level security;

drop policy if exists "users manage their workshop" on taller;
create policy "users manage their workshop" on taller
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "workshop users manage clients" on cliente;
create policy "workshop users manage clients" on cliente
  for all using (exists (select 1 from taller where taller.id = cliente.taller_id and taller.user_id = (select auth.uid())))
  with check (exists (select 1 from taller where taller.id = cliente.taller_id and taller.user_id = (select auth.uid())));

drop policy if exists "workshop users manage bicycles" on bicicleta;
create policy "workshop users manage bicycles" on bicicleta
  for all using (exists (
    select 1 from cliente join taller on taller.id = cliente.taller_id
    where cliente.id = bicicleta.cliente_id and taller.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from cliente join taller on taller.id = cliente.taller_id
    where cliente.id = bicicleta.cliente_id and taller.user_id = (select auth.uid())
  ));

drop policy if exists "workshop users manage services" on servicio;
create policy "workshop users manage services" on servicio
  for all using (exists (select 1 from taller where taller.id = servicio.taller_id and taller.user_id = (select auth.uid())))
  with check (exists (select 1 from taller where taller.id = servicio.taller_id and taller.user_id = (select auth.uid())));

drop policy if exists "workshop users manage appointments" on agenda_turno;
create policy "workshop users manage appointments" on agenda_turno
  for all using (exists (select 1 from taller where taller.id = agenda_turno.taller_id and taller.user_id = (select auth.uid())))
  with check (
    exists (select 1 from taller where taller.id = agenda_turno.taller_id and taller.user_id = (select auth.uid()))
    and exists (select 1 from cliente where cliente.id = agenda_turno.cliente_id and cliente.taller_id = agenda_turno.taller_id)
    and exists (select 1 from bicicleta where bicicleta.id = agenda_turno.bicicleta_id and bicicleta.cliente_id = agenda_turno.cliente_id)
  );

drop policy if exists "workshop users manage work orders" on orden_trabajo;
create policy "workshop users manage work orders" on orden_trabajo
  for all using (exists (select 1 from taller where taller.id = orden_trabajo.taller_id and taller.user_id = (select auth.uid())))
  with check (
    exists (select 1 from taller where taller.id = orden_trabajo.taller_id and taller.user_id = (select auth.uid()))
    and exists (select 1 from cliente where cliente.id = orden_trabajo.cliente_id and cliente.taller_id = orden_trabajo.taller_id)
    and exists (select 1 from bicicleta where bicicleta.id = orden_trabajo.bicicleta_id and bicicleta.cliente_id = orden_trabajo.cliente_id)
  );

drop policy if exists "workshop users manage work order services" on orden_trabajo_servicio;
create policy "workshop users manage work order services" on orden_trabajo_servicio
  for all using (exists (
    select 1 from orden_trabajo join taller on taller.id = orden_trabajo.taller_id
    where orden_trabajo.id = orden_trabajo_servicio.orden_trabajo_id and taller.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from orden_trabajo join taller on taller.id = orden_trabajo.taller_id
      where orden_trabajo.id = orden_trabajo_servicio.orden_trabajo_id and taller.user_id = (select auth.uid())
    )
    and exists (
      select 1 from servicio
      where servicio.id = orden_trabajo_servicio.servicio_id
        and servicio.taller_id = (select taller.id from orden_trabajo join taller on taller.id = orden_trabajo.taller_id where orden_trabajo.id = orden_trabajo_servicio.orden_trabajo_id)
    )
  );