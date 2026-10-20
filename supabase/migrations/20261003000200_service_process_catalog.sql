create table if not exists proceso_servicio (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references taller(id) on delete cascade,
  nombre varchar(255) not null,
  importe_referencia numeric(12,2),
  tiempo_estimado_min integer,
  created_at timestamptz not null default now(),
  constraint proceso_servicio_referencia_check check (importe_referencia is null or importe_referencia >= 0),
  constraint proceso_servicio_tiempo_check check (tiempo_estimado_min is null or tiempo_estimado_min > 0)
);

create unique index if not exists proceso_servicio_taller_nombre_unique_idx
  on proceso_servicio(taller_id, lower(nombre));
create index if not exists proceso_servicio_taller_id_idx
  on proceso_servicio(taller_id);

create table if not exists servicio_proceso (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicio(id) on delete cascade,
  proceso_id uuid not null references proceso_servicio(id) on delete restrict,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  constraint servicio_proceso_unique unique (servicio_id, proceso_id),
  constraint servicio_proceso_orden_unique unique (servicio_id, orden),
  constraint servicio_proceso_orden_check check (orden >= 0)
);

create index if not exists servicio_proceso_proceso_id_idx
  on servicio_proceso(proceso_id);

alter table proceso_servicio enable row level security;
alter table servicio_proceso enable row level security;

drop policy if exists "workshop users manage service processes" on proceso_servicio;
create policy "workshop users manage service processes" on proceso_servicio
  for all using (
    exists (select 1 from taller where taller.id = proceso_servicio.taller_id and taller.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from taller where taller.id = proceso_servicio.taller_id and taller.user_id = (select auth.uid()))
  );

drop policy if exists "workshop users view service process links" on servicio_proceso;
create policy "workshop users view service process links" on servicio_proceso
  for select using (
    exists (
      select 1 from servicio join taller on taller.id = servicio.taller_id
      where servicio.id = servicio_proceso.servicio_id and taller.user_id = (select auth.uid())
    )
  );

drop policy if exists "workshop users add service process links" on servicio_proceso;
create policy "workshop users add service process links" on servicio_proceso
  for insert with check (
    exists (
      select 1 from servicio join taller on taller.id = servicio.taller_id
      where servicio.id = servicio_proceso.servicio_id and taller.user_id = (select auth.uid())
    )
    and exists (
      select 1 from proceso_servicio
      where proceso_servicio.id = servicio_proceso.proceso_id
        and proceso_servicio.taller_id = (
          select servicio.taller_id from servicio where servicio.id = servicio_proceso.servicio_id
        )
    )
  );

drop policy if exists "workshop users remove service process links" on servicio_proceso;
create policy "workshop users remove service process links" on servicio_proceso
  for delete using (
    exists (
      select 1 from servicio join taller on taller.id = servicio.taller_id
      where servicio.id = servicio_proceso.servicio_id and taller.user_id = (select auth.uid())
    )
  );

create or replace function reemplazar_procesos_servicio(p_servicio_id uuid, p_proceso_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
declare
  taller_servicio_id uuid;
  total_procesos integer;
begin
  select servicio.taller_id into taller_servicio_id
  from servicio
  where servicio.id = p_servicio_id;

  if taller_servicio_id is null then
    raise exception 'Servicio no encontrado o sin permisos';
  end if;

  select count(distinct proceso_id) into total_procesos
  from unnest(coalesce(p_proceso_ids, array[]::uuid[])) as selected(proceso_id)
  join proceso_servicio on proceso_servicio.id = selected.proceso_id
    and proceso_servicio.taller_id = taller_servicio_id;

  if total_procesos <> coalesce(cardinality(p_proceso_ids), 0) then
    raise exception 'Uno o mas procesos no pertenecen al taller';
  end if;

  delete from servicio_proceso where servicio_id = p_servicio_id;

  insert into servicio_proceso (servicio_id, proceso_id, orden)
  select p_servicio_id, selected.proceso_id, selected.position::integer - 1
  from unnest(coalesce(p_proceso_ids, array[]::uuid[])) with ordinality as selected(proceso_id, position);
end;
$$;

grant execute on function reemplazar_procesos_servicio(uuid, uuid[]) to authenticated;

insert into proceso_servicio (taller_id, nombre, importe_referencia)
select taller.id, defaults.nombre, defaults.importe_referencia
from taller
cross join (values
  ('CONTROL TORQUES GENERALES', 12000::numeric),
  ('REGULACION CAMBIOS', 10500::numeric),
  ('NIVELACION LIQUIDO FRENOS', 7500::numeric),
  ('TORQUE JUEGO DE DIRECCION', 5500::numeric),
  ('TORQUE CAJA PEDALERA', 15000::numeric),
  ('TENSION DE RAYOS - CENTRADO', 15000::numeric),
  ('TORQUE PIÑON + DISCOS DE FRENO', 5500::numeric),
  ('LIMPIEZA GENERAL', 7500::numeric)
) as defaults(nombre, importe_referencia)
on conflict do nothing;

insert into proceso_servicio (taller_id, nombre, importe_referencia)
select distinct servicio.taller_id, item.value ->> 'item',
  case
    when jsonb_typeof(item.value -> 'importe_referencia') = 'number'
      then (item.value ->> 'importe_referencia')::numeric
    else null
  end
from servicio
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(servicio.checklist_plantilla) = 'array'
    then servicio.checklist_plantilla else '[]'::jsonb end
) as item(value)
where jsonb_typeof(item.value) = 'object'
  and nullif(btrim(item.value ->> 'item'), '') is not null
on conflict do nothing;

insert into servicio_proceso (servicio_id, proceso_id, orden)
select servicio.id, proceso_servicio.id,
  (item.ordinality - 1)::integer
from servicio
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(servicio.checklist_plantilla) = 'array'
    then servicio.checklist_plantilla else '[]'::jsonb end
) with ordinality as item(value, ordinality)
join proceso_servicio
  on proceso_servicio.taller_id = servicio.taller_id
  and lower(proceso_servicio.nombre) = lower(item.value ->> 'item')
where jsonb_typeof(item.value) = 'object'
  and nullif(btrim(item.value ->> 'item'), '') is not null
on conflict do nothing;
