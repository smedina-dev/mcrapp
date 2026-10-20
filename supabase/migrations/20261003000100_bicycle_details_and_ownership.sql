alter type disciplina_bici_enum add value if not exists 'mtb_enduro';
alter type disciplina_bici_enum add value if not exists 'mtb_dh';

alter table bicicleta
  add column if not exists marca varchar(120),
  add column if not exists modelo varchar(160),
  add column if not exists talle varchar(30),
  add column if not exists color varchar(80),
  add column if not exists tubelizada boolean not null default false,
  add column if not exists liquido_tubeless varchar(120),
  add column if not exists presion_horquilla_psi numeric(5,1) not null default 0,
  add column if not exists rebote_horquilla_clicks smallint not null default 0,
  add column if not exists tiene_shock boolean not null default false,
  add column if not exists presion_shock_psi numeric(5,1),
  add column if not exists rebote_shock_baja_clicks smallint,
  add column if not exists rebote_shock_alta_clicks smallint;

alter table bicicleta
  add constraint bicicleta_tubeless_liquido_check
    check ((tubelizada and nullif(btrim(liquido_tubeless), '') is not null) or (not tubelizada and liquido_tubeless is null)),
  add constraint bicicleta_horquilla_presion_check check (presion_horquilla_psi between 0 and 400),
  add constraint bicicleta_horquilla_rebote_check check (rebote_horquilla_clicks between 0 and 100),
  add constraint bicicleta_shock_config_check check (
    (tiene_shock and presion_shock_psi between 0 and 400
      and rebote_shock_baja_clicks between 0 and 100
      and rebote_shock_alta_clicks between 0 and 100)
    or (not tiene_shock and presion_shock_psi is null
      and rebote_shock_baja_clicks is null and rebote_shock_alta_clicks is null)
  );

create table if not exists bicicleta_historial_propietario (
  id uuid primary key default gen_random_uuid(),
  bicicleta_id uuid not null references bicicleta(id) on delete cascade,
  cliente_anterior_id uuid references cliente(id) on delete set null,
  cliente_nuevo_id uuid references cliente(id) on delete set null,
  fecha_cambio timestamptz not null default now()
);

create index if not exists bicicleta_historial_bicicleta_fecha_idx
  on bicicleta_historial_propietario(bicicleta_id, fecha_cambio desc);

alter table bicicleta_historial_propietario enable row level security;

drop policy if exists "workshop users view bicycle ownership history" on bicicleta_historial_propietario;
create policy "workshop users view bicycle ownership history" on bicicleta_historial_propietario
  for select using (exists (
    select 1 from bicicleta
    join cliente on cliente.id = bicicleta.cliente_id
    join taller on taller.id = cliente.taller_id
    where bicicleta.id = bicicleta_historial_propietario.bicicleta_id
      and taller.user_id = (select auth.uid())
  ));

drop policy if exists "workshop users record bicycle ownership history" on bicicleta_historial_propietario;
create policy "workshop users record bicycle ownership history" on bicicleta_historial_propietario
  for insert with check (
    exists (
      select 1 from cliente join taller on taller.id = cliente.taller_id
      where cliente.id = bicicleta_historial_propietario.cliente_anterior_id
        and taller.user_id = (select auth.uid())
    )
    and exists (
      select 1 from cliente join taller on taller.id = cliente.taller_id
      where cliente.id = bicicleta_historial_propietario.cliente_nuevo_id
        and taller.user_id = (select auth.uid())
    )
  );

create or replace function registrar_cambio_propietario_bicicleta()
returns trigger
language plpgsql
as $$
begin
  if new.cliente_id is distinct from old.cliente_id then
    new.presion_horquilla_psi := 0;
    new.rebote_horquilla_clicks := 0;
    if new.tiene_shock then
      new.presion_shock_psi := 0;
      new.rebote_shock_baja_clicks := 0;
      new.rebote_shock_alta_clicks := 0;
    else
      new.presion_shock_psi := null;
      new.rebote_shock_baja_clicks := null;
      new.rebote_shock_alta_clicks := null;
    end if;
  end if;
  return new;
end;
$$;

create or replace function guardar_historial_propietario_bicicleta()
returns trigger
language plpgsql
as $$
begin
  if new.cliente_id is distinct from old.cliente_id then
    insert into bicicleta_historial_propietario (bicicleta_id, cliente_anterior_id, cliente_nuevo_id)
    values (new.id, old.cliente_id, new.cliente_id);
  end if;
  return new;
end;
$$;

drop trigger if exists bicicleta_resetear_configuracion_al_transferir on bicicleta;
create trigger bicicleta_resetear_configuracion_al_transferir
  before update of cliente_id on bicicleta
  for each row execute function registrar_cambio_propietario_bicicleta();

drop trigger if exists bicicleta_guardar_historial_propietario on bicicleta;
create trigger bicicleta_guardar_historial_propietario
  after update of cliente_id on bicicleta
  for each row execute function guardar_historial_propietario_bicicleta();
