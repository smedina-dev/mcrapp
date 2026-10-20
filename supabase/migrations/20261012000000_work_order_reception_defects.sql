create or replace function crear_orden_trabajo_con_items(
  p_taller_id uuid,
  p_cliente_id uuid,
  p_bicicleta_id uuid,
  p_es_express boolean,
  p_fecha_entrega_estimada timestamptz,
  p_servicio_ids uuid[],
  p_proceso_ids uuid[],
  p_observaciones_recepcion text,
  p_desperfectos jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  nueva_orden_id uuid;
begin
  if p_desperfectos is not null and jsonb_typeof(p_desperfectos) <> 'array' then
    raise exception 'Los desperfectos de recepción deben ser una lista'
      using errcode = '22023';
  end if;

  nueva_orden_id := crear_orden_trabajo_con_items(
    p_taller_id,
    p_cliente_id,
    p_bicicleta_id,
    p_es_express,
    p_fecha_entrega_estimada,
    p_servicio_ids,
    p_proceso_ids,
    p_observaciones_recepcion
  );

  update orden_trabajo
  set inspeccion_recepcion = jsonb_build_object(
    'observaciones', nullif(btrim(p_observaciones_recepcion), ''),
    'desperfectos', coalesce(p_desperfectos, '[]'::jsonb)
  )
  where id = nueva_orden_id;

  return nueva_orden_id;
end;
$$;

revoke all on function crear_orden_trabajo_con_items(uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[], text, jsonb) from public, anon;
grant execute on function crear_orden_trabajo_con_items(uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[], text, jsonb) to authenticated;
