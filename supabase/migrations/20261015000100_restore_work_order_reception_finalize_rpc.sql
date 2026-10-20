drop function if exists finalizar_recepcion_orden_trabajo(uuid, text[]);

create function finalizar_recepcion_orden_trabajo(
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

notify pgrst, 'reload schema';
