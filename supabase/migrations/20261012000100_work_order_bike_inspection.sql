create or replace function crear_orden_trabajo_con_inspeccion(
  p_taller_id uuid,
  p_cliente_id uuid,
  p_bicicleta_id uuid,
  p_es_express boolean,
  p_fecha_entrega_estimada timestamptz,
  p_servicio_ids uuid[],
  p_proceso_ids uuid[],
  p_inspeccion_recepcion jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  nueva_orden_id uuid;
begin
  if p_inspeccion_recepcion is not null
    and jsonb_typeof(p_inspeccion_recepcion) <> 'object' then
    raise exception 'La inspección de recepción debe ser un objeto'
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
    coalesce(p_inspeccion_recepcion->>'observaciones', '')
  );

  update orden_trabajo
  set inspeccion_recepcion = coalesce(p_inspeccion_recepcion, '{}'::jsonb)
  where id = nueva_orden_id;

  return nueva_orden_id;
end;
$$;

revoke all on function crear_orden_trabajo_con_inspeccion(
  uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[], jsonb
) from public, anon;
grant execute on function crear_orden_trabajo_con_inspeccion(
  uuid, uuid, uuid, boolean, timestamptz, uuid[], uuid[], jsonb
) to authenticated;

notify pgrst, 'reload schema';
