alter table cliente
  add column if not exists peso_kg numeric(5,2),
  add constraint cliente_peso_kg_check
    check (peso_kg is null or peso_kg between 1 and 500);

alter table proceso_servicio
  add column if not exists descuento_servicio_pct numeric(5,2) not null default 0,
  add constraint proceso_servicio_descuento_check
    check (descuento_servicio_pct between 0 and 100);

alter table orden_trabajo
  add column if not exists recepcion_cerrada boolean not null default true;

update proceso_servicio
set importe_referencia = case lower(nombre)
  when 'mantenimiento completo bujes cuadro' then 15000
  when 'mantenimiento completo mazas - cambio rulemanes' then 20000
end
where importe_referencia is null
  and lower(nombre) in (
    'mantenimiento completo bujes cuadro',
    'mantenimiento completo mazas - cambio rulemanes'
  );

create table if not exists orden_trabajo_proceso (
  id uuid primary key default gen_random_uuid(),
  orden_trabajo_id uuid not null references orden_trabajo(id) on delete cascade,
  proceso_id uuid not null references proceso_servicio(id) on delete restrict,
  precio_lista numeric(12,2) not null check (precio_lista >= 0),
  descuento_porcentaje numeric(5,2) not null default 0 check (descuento_porcentaje between 0 and 100),
  precio_aplicado numeric(12,2) not null check (precio_aplicado >= 0),
  created_at timestamptz not null default now()
);

create index if not exists orden_trabajo_proceso_orden_idx
  on orden_trabajo_proceso(orden_trabajo_id);

alter table orden_trabajo_proceso enable row level security;

drop policy if exists "workshop members view work order processes" on orden_trabajo_proceso;
create policy "workshop members view work order processes" on orden_trabajo_proceso
  for select using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_proceso.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members add work order processes" on orden_trabajo_proceso;
create policy "workshop members add work order processes" on orden_trabajo_proceso
  for insert with check (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_proceso.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ) and exists (
    select 1 from proceso_servicio
    join orden_trabajo on orden_trabajo.taller_id = proceso_servicio.taller_id
    where proceso_servicio.id = orden_trabajo_proceso.proceso_id
      and orden_trabajo.id = orden_trabajo_proceso.orden_trabajo_id
  ));

grant select, insert on orden_trabajo_proceso to authenticated;

drop function if exists crear_orden_trabajo_con_items(uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[]);

create function crear_orden_trabajo_con_items(
  p_taller_id uuid,
  p_cliente_id uuid,
  p_bicicleta_id uuid,
  p_es_express boolean,
  p_fecha_entrega_estimada timestamptz,
  p_servicio_ids uuid[],
  p_proceso_ids uuid[],
  p_observaciones_recepcion text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  nueva_orden_id uuid;
  cantidad_servicios integer;
  cantidad_procesos integer;
  total_servicios integer;
  total_procesos integer;
  total_orden numeric(12,2);
begin
  if not usuario_pertenece_taller(p_taller_id) then
    raise exception 'No tenes permisos para crear ordenes en este taller'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from cliente
    where cliente.id = p_cliente_id and cliente.taller_id = p_taller_id
  ) or not exists (
    select 1 from bicicleta
    where bicicleta.id = p_bicicleta_id and bicicleta.cliente_id = p_cliente_id
  ) then
    raise exception 'El cliente y la bicicleta no pertenecen al taller'
      using errcode = '23514';
  end if;

  cantidad_servicios := coalesce(cardinality(p_servicio_ids), 0);
  cantidad_procesos := coalesce(cardinality(p_proceso_ids), 0);

  if cantidad_servicios = 0 and cantidad_procesos = 0 then
    raise exception 'Selecciona al menos un servicio o proceso'
      using errcode = '23514';
  end if;

  select count(distinct servicio.id) into total_servicios
  from unnest(coalesce(p_servicio_ids, array[]::uuid[])) as selected(servicio_id)
  join servicio on servicio.id = selected.servicio_id
    and servicio.taller_id = p_taller_id;

  if total_servicios <> cantidad_servicios then
    raise exception 'Uno o mas servicios no pertenecen al taller o estan duplicados'
      using errcode = '23514';
  end if;

  select count(distinct proceso_servicio.id) into total_procesos
  from unnest(coalesce(p_proceso_ids, array[]::uuid[])) as selected(proceso_id)
  join proceso_servicio on proceso_servicio.id = selected.proceso_id
    and proceso_servicio.taller_id = p_taller_id
    and proceso_servicio.importe_referencia is not null;

  if total_procesos <> cantidad_procesos then
    raise exception 'Uno o mas procesos no tienen precio o no pertenecen al taller'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_proceso_ids, array[]::uuid[])) as selected(proceso_id)
    join servicio_proceso on servicio_proceso.proceso_id = selected.proceso_id
    where servicio_proceso.servicio_id = any(coalesce(p_servicio_ids, array[]::uuid[]))
  ) then
    raise exception 'Un proceso incluido en un servicio no puede cobrarse otra vez como adicional'
      using errcode = '23514';
  end if;

  insert into orden_trabajo (
    taller_id, cliente_id, bicicleta_id, es_express, fecha_entrega_estimada,
    inspeccion_recepcion, recepcion_cerrada
  ) values (
    p_taller_id, p_cliente_id, p_bicicleta_id, p_es_express, p_fecha_entrega_estimada,
    jsonb_build_object('observaciones', nullif(btrim(p_observaciones_recepcion), '')),
    false
  ) returning id into nueva_orden_id;

  insert into orden_trabajo_servicio (orden_trabajo_id, servicio_id, precio_aplicado)
  select nueva_orden_id, servicio.id, servicio.precio_base
  from unnest(coalesce(p_servicio_ids, array[]::uuid[])) as selected(servicio_id)
  join servicio on servicio.id = selected.servicio_id
    and servicio.taller_id = p_taller_id;

  insert into orden_trabajo_proceso (
    orden_trabajo_id, proceso_id, precio_lista, descuento_porcentaje, precio_aplicado
  )
  select
    nueva_orden_id,
    proceso_servicio.id,
    proceso_servicio.importe_referencia,
    case when cantidad_servicios > 0 then proceso_servicio.descuento_servicio_pct else 0 end,
    round(
      proceso_servicio.importe_referencia
      * (100 - case when cantidad_servicios > 0 then proceso_servicio.descuento_servicio_pct else 0 end)
      / 100,
      2
    )
  from unnest(coalesce(p_proceso_ids, array[]::uuid[])) as selected(proceso_id)
  join proceso_servicio on proceso_servicio.id = selected.proceso_id
    and proceso_servicio.taller_id = p_taller_id;

  select
    coalesce((select sum(precio_aplicado) from orden_trabajo_servicio where orden_trabajo_id = nueva_orden_id), 0)
    + coalesce((select sum(precio_aplicado) from orden_trabajo_proceso where orden_trabajo_id = nueva_orden_id), 0)
  into total_orden;

  update orden_trabajo
  set presupuesto_total = total_orden
  where id = nueva_orden_id;

  return nueva_orden_id;
end;
$$;

revoke all on function crear_orden_trabajo_con_items(uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[], text) from public, anon;
grant execute on function crear_orden_trabajo_con_items(uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[], text) to authenticated;

create or replace function finalizar_recepcion_orden_trabajo(
  p_orden_trabajo_id uuid,
  p_fotos text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  orden_taller_id uuid;
begin
  select taller_id into orden_taller_id
  from orden_trabajo
  where id = p_orden_trabajo_id
    and not recepcion_cerrada;

  if orden_taller_id is null or not usuario_pertenece_taller(orden_taller_id) then
    raise exception 'La orden no existe, ya fue cerrada o no pertenece al taller'
      using errcode = '42501';
  end if;

  if coalesce(cardinality(p_fotos), 0) < 1 then
    raise exception 'Debe cargarse al menos una foto para cerrar la recepción'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(p_fotos) as selected(path)
    where selected.path !~ (
      '^' || orden_taller_id::text || '/' || p_orden_trabajo_id::text || '/[^/]+$'
    )
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'ordenes-trabajo'
        and name = selected.path
    )
  ) then
    raise exception 'Una o mas fotos no pertenecen a esta orden o no se cargaron correctamente'
      using errcode = '23514';
  end if;

  update orden_trabajo
  set fotos = to_jsonb(p_fotos),
      recepcion_cerrada = true
  where id = p_orden_trabajo_id
    and taller_id = orden_taller_id
    and not recepcion_cerrada;
end;
$$;

revoke all on function finalizar_recepcion_orden_trabajo(uuid, text[]) from public, anon;
grant execute on function finalizar_recepcion_orden_trabajo(uuid, text[]) to authenticated;
