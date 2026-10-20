alter table orden_trabajo
  add column if not exists recepcion_cerrada boolean not null default true;

create or replace function crear_orden_trabajo_con_items(
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

revoke all on function crear_orden_trabajo_con_items(
  uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[], text
) from public, anon;
grant execute on function crear_orden_trabajo_con_items(
  uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[], text
) to authenticated;

notify pgrst, 'reload schema';
