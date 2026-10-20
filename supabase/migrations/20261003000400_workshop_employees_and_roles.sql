  alter table taller
    add column if not exists user_id uuid references auth.users(id) on delete cascade;

  create unique index if not exists taller_user_id_unique_idx
    on taller(user_id)
    where user_id is not null;

  create table if not exists empleado (
    id uuid primary key default gen_random_uuid(),
    taller_id uuid not null references taller(id) on delete cascade,
    auth_user_id uuid not null unique references auth.users(id) on delete cascade,
    email varchar(255) not null,
    nombre varchar(255),
    apellido varchar(255),
    fecha_nacimiento date,
    fecha_ingreso date,
    rango varchar(40) check (rango in (
      'ayudante_mecanico',
      'embalador',
      'mecanico',
      'mecanico_especializado',
      'jefe_mecanicos'
    )),
    fecha_inicio_rango date,
    rol_acceso varchar(30) not null default 'empleado'
      check (rol_acceso in ('admin', 'jefe_taller', 'empleado')),
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint empleado_nombre_completo_check check (
      (nombre is null and apellido is null) or (nombre is not null and apellido is not null)
    ),
    constraint empleado_rango_fecha_check check (
      (rango is null and fecha_inicio_rango is null)
      or (rango is not null and fecha_inicio_rango is not null)
    )
  );

  create index if not exists empleado_taller_activo_idx on empleado(taller_id, activo);
  create index if not exists empleado_taller_rango_idx on empleado(taller_id, rango);

  create table if not exists empleado_historial_rango (
    id uuid primary key default gen_random_uuid(),
    empleado_id uuid not null references empleado(id) on delete cascade,
    rango_anterior varchar(40),
    rango_nuevo varchar(40) not null,
    fecha_cambio timestamptz not null default now(),
    cambiado_por uuid references auth.users(id) on delete set null
  );

  create index if not exists empleado_historial_rango_empleado_fecha_idx
    on empleado_historial_rango(empleado_id, fecha_cambio desc);

  insert into empleado (taller_id, auth_user_id, email, rol_acceso)
  select taller.id, taller.user_id, auth.users.email, 'admin'
  from taller
  join auth.users on auth.users.id = taller.user_id
  where taller.user_id is not null
    and auth.users.email is not null
  on conflict (auth_user_id) do update
  set taller_id = excluded.taller_id,
      email = excluded.email,
      rol_acceso = 'admin',
      activo = true;

  create or replace function usuario_pertenece_taller(p_taller_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from taller
      where taller.id = p_taller_id and taller.user_id = (select auth.uid())
    ) or exists (
      select 1 from empleado
      where empleado.taller_id = p_taller_id
        and empleado.auth_user_id = (select auth.uid())
        and empleado.activo
    );
  $$;

  create or replace function usuario_es_admin_taller(p_taller_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from taller
      where taller.id = p_taller_id and taller.user_id = (select auth.uid())
    ) or exists (
      select 1 from empleado
      where empleado.taller_id = p_taller_id
        and empleado.auth_user_id = (select auth.uid())
        and empleado.activo
        and empleado.rol_acceso = 'admin'
    );
  $$;

  create or replace function usuario_puede_gestionar_catalogo_taller(p_taller_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select usuario_es_admin_taller(p_taller_id) or exists (
      select 1 from empleado
      where empleado.taller_id = p_taller_id
        and empleado.auth_user_id = (select auth.uid())
        and empleado.activo
        and empleado.rol_acceso = 'jefe_taller'
    );
  $$;

  revoke all on function usuario_pertenece_taller(uuid) from public, anon;
  revoke all on function usuario_es_admin_taller(uuid) from public, anon;
  revoke all on function usuario_puede_gestionar_catalogo_taller(uuid) from public, anon;
  grant execute on function usuario_pertenece_taller(uuid) to authenticated;
  grant execute on function usuario_es_admin_taller(uuid) to authenticated;
  grant execute on function usuario_puede_gestionar_catalogo_taller(uuid) to authenticated;

  create or replace function registrar_cambio_rango_empleado()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if new.rango is distinct from old.rango then
      if new.rango is null then
        new.fecha_inicio_rango := null;
      else
        new.fecha_inicio_rango := current_date;
        insert into empleado_historial_rango (
          empleado_id, rango_anterior, rango_nuevo, cambiado_por
        ) values (
          new.id, old.rango, new.rango, auth.uid()
        );
      end if;
    end if;
    new.updated_at := now();
    return new;
  end;
  $$;

  drop trigger if exists empleado_registrar_cambio_rango on empleado;
  create trigger empleado_registrar_cambio_rango
  before update on empleado
  for each row execute function registrar_cambio_rango_empleado();

  create or replace function registrar_rango_inicial_empleado()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if new.rango is not null then
      insert into empleado_historial_rango (
        empleado_id, rango_anterior, rango_nuevo, fecha_cambio, cambiado_por
      ) values (
        new.id, null, new.rango, coalesce(new.fecha_inicio_rango, current_date)::timestamptz, auth.uid()
      );
    end if;
    return new;
  end;
  $$;

  drop trigger if exists empleado_registrar_rango_inicial on empleado;
  create trigger empleado_registrar_rango_inicial
  after insert on empleado
  for each row execute function registrar_rango_inicial_empleado();

  alter table empleado enable row level security;
  alter table empleado_historial_rango enable row level security;

  drop policy if exists "employees can read workshop directory" on empleado;
  create policy "employees can read workshop directory" on empleado
    for select using (
      auth_user_id = (select auth.uid()) or usuario_es_admin_taller(taller_id)
    );

  drop policy if exists "admins manage workshop employees" on empleado;
  create policy "admins manage workshop employees" on empleado
    for all using (usuario_es_admin_taller(taller_id))
    with check (usuario_es_admin_taller(taller_id));

  drop policy if exists "employees can read rank history" on empleado_historial_rango;
  create policy "employees can read rank history" on empleado_historial_rango
    for select using (exists (
      select 1 from empleado
      where empleado.id = empleado_historial_rango.empleado_id
        and (
          empleado.auth_user_id = (select auth.uid())
          or usuario_es_admin_taller(empleado.taller_id)
        )
    ));

  drop policy if exists "admins manage rank history" on empleado_historial_rango;
  create policy "admins manage rank history" on empleado_historial_rango
    for all using (exists (
      select 1 from empleado
      where empleado.id = empleado_historial_rango.empleado_id
        and usuario_es_admin_taller(empleado.taller_id)
    ))
    with check (exists (
      select 1 from empleado
      where empleado.id = empleado_historial_rango.empleado_id
        and usuario_es_admin_taller(empleado.taller_id)
    ));

  drop policy if exists "users manage their workshop" on taller;
  drop policy if exists "workshop members view their workshop" on taller;
  create policy "workshop members view their workshop" on taller
    for select using (usuario_pertenece_taller(id));
  drop policy if exists "workshop admins update their workshop" on taller;
  create policy "workshop admins update their workshop" on taller
    for update using (usuario_es_admin_taller(id))
    with check (usuario_es_admin_taller(id));
  drop policy if exists "workshop owners create their workshop" on taller;
  create policy "workshop owners create their workshop" on taller
    for insert with check (user_id = (select auth.uid()));

  drop policy if exists "workshop users manage clients" on cliente;
  create policy "workshop members manage clients" on cliente
    for all using (usuario_pertenece_taller(taller_id))
    with check (usuario_pertenece_taller(taller_id));

  drop policy if exists "workshop users manage bicycles" on bicicleta;
  create policy "workshop members manage bicycles" on bicicleta
    for all using (exists (
      select 1 from cliente
      where cliente.id = bicicleta.cliente_id and usuario_pertenece_taller(cliente.taller_id)
    ))
    with check (exists (
      select 1 from cliente
      where cliente.id = bicicleta.cliente_id and usuario_pertenece_taller(cliente.taller_id)
    ));

  drop policy if exists "workshop users manage services" on servicio;
  drop policy if exists "workshop members read services" on servicio;
  create policy "workshop members read services" on servicio
    for select using (usuario_pertenece_taller(taller_id));
  drop policy if exists "catalog managers create services" on servicio;
  create policy "catalog managers create services" on servicio
    for insert with check (usuario_puede_gestionar_catalogo_taller(taller_id));
  drop policy if exists "catalog managers update services" on servicio;
  create policy "catalog managers update services" on servicio
    for update using (usuario_puede_gestionar_catalogo_taller(taller_id))
    with check (usuario_puede_gestionar_catalogo_taller(taller_id));
  drop policy if exists "catalog managers delete services" on servicio;
  create policy "catalog managers delete services" on servicio
    for delete using (usuario_puede_gestionar_catalogo_taller(taller_id));

  drop policy if exists "workshop users manage appointments" on agenda_turno;
  create policy "workshop members manage appointments" on agenda_turno
    for all using (usuario_pertenece_taller(taller_id))
    with check (
      usuario_pertenece_taller(taller_id)
      and exists (select 1 from cliente where cliente.id = agenda_turno.cliente_id and cliente.taller_id = agenda_turno.taller_id)
      and exists (select 1 from bicicleta where bicicleta.id = agenda_turno.bicicleta_id and bicicleta.cliente_id = agenda_turno.cliente_id)
    );

  drop policy if exists "workshop users manage work orders" on orden_trabajo;
  create policy "workshop members manage work orders" on orden_trabajo
    for all using (usuario_pertenece_taller(taller_id))
    with check (
      usuario_pertenece_taller(taller_id)
      and exists (select 1 from cliente where cliente.id = orden_trabajo.cliente_id and cliente.taller_id = orden_trabajo.taller_id)
      and exists (select 1 from bicicleta where bicicleta.id = orden_trabajo.bicicleta_id and bicicleta.cliente_id = orden_trabajo.cliente_id)
    );

  drop policy if exists "workshop users manage work order services" on orden_trabajo_servicio;
  create policy "workshop members manage work order services" on orden_trabajo_servicio
    for all using (exists (
      select 1 from orden_trabajo
      where orden_trabajo.id = orden_trabajo_servicio.orden_trabajo_id
        and usuario_pertenece_taller(orden_trabajo.taller_id)
    ))
    with check (
      exists (
        select 1 from orden_trabajo
        where orden_trabajo.id = orden_trabajo_servicio.orden_trabajo_id
          and usuario_pertenece_taller(orden_trabajo.taller_id)
      )
      and exists (
        select 1 from orden_trabajo
        join servicio on servicio.taller_id = orden_trabajo.taller_id
        where orden_trabajo.id = orden_trabajo_servicio.orden_trabajo_id
          and servicio.id = orden_trabajo_servicio.servicio_id
      )
    );

  drop policy if exists "workshop users view bicycle ownership history" on bicicleta_historial_propietario;
  create policy "workshop members view bicycle ownership history" on bicicleta_historial_propietario
    for select using (exists (
      select 1 from bicicleta
      join cliente on cliente.id = bicicleta.cliente_id
      where bicicleta.id = bicicleta_historial_propietario.bicicleta_id
        and usuario_pertenece_taller(cliente.taller_id)
    ));

  drop policy if exists "workshop users record bicycle ownership history" on bicicleta_historial_propietario;
  create policy "workshop members record bicycle ownership history" on bicicleta_historial_propietario
    for insert with check (
      exists (
        select 1 from cliente
        where cliente.id = bicicleta_historial_propietario.cliente_anterior_id
          and usuario_pertenece_taller(cliente.taller_id)
      )
      and exists (
        select 1 from cliente
        where cliente.id = bicicleta_historial_propietario.cliente_nuevo_id
          and usuario_pertenece_taller(cliente.taller_id)
      )
    );

  drop policy if exists "workshop users manage service processes" on proceso_servicio;
  drop policy if exists "catalog managers manage service processes" on proceso_servicio;
  create policy "catalog managers manage service processes" on proceso_servicio
    for all using (usuario_puede_gestionar_catalogo_taller(taller_id))
    with check (usuario_puede_gestionar_catalogo_taller(taller_id));
  drop policy if exists "workshop members read service processes" on proceso_servicio;
  create policy "workshop members read service processes" on proceso_servicio
    for select using (usuario_pertenece_taller(taller_id));

  drop policy if exists "workshop users view service process links" on servicio_proceso;
  drop policy if exists "workshop users add service process links" on servicio_proceso;
  drop policy if exists "workshop users remove service process links" on servicio_proceso;
  drop policy if exists "catalog managers view service process links" on servicio_proceso;
  create policy "catalog managers view service process links" on servicio_proceso
    for select using (exists (
      select 1 from servicio where servicio.id = servicio_proceso.servicio_id
        and usuario_pertenece_taller(servicio.taller_id)
    ));
  drop policy if exists "workshop members read service process links" on servicio_proceso;
  create policy "workshop members read service process links" on servicio_proceso
    for select using (exists (
      select 1 from servicio where servicio.id = servicio_proceso.servicio_id
        and usuario_pertenece_taller(servicio.taller_id)
    ));
  drop policy if exists "catalog managers add service process links" on servicio_proceso;
  create policy "catalog managers add service process links" on servicio_proceso
    for insert with check (
      exists (
        select 1 from servicio where servicio.id = servicio_proceso.servicio_id
          and usuario_puede_gestionar_catalogo_taller(servicio.taller_id)
      )
      and exists (
        select 1 from proceso_servicio
        join servicio on servicio.taller_id = proceso_servicio.taller_id
        where proceso_servicio.id = servicio_proceso.proceso_id
          and servicio.id = servicio_proceso.servicio_id
      )
    );
  drop policy if exists "catalog managers remove service process links" on servicio_proceso;
  create policy "catalog managers remove service process links" on servicio_proceso
    for delete using (exists (
      select 1 from servicio where servicio.id = servicio_proceso.servicio_id
        and usuario_puede_gestionar_catalogo_taller(servicio.taller_id)
    ));

  drop policy if exists "workshop owners read order photos" on storage.objects;
  drop policy if exists "workshop owners upload order photos" on storage.objects;
  drop policy if exists "workshop owners delete order photos" on storage.objects;
  drop policy if exists "workshop members read order photos" on storage.objects;
  create policy "workshop members read order photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ordenes-trabajo'
    and array_length(storage.foldername(name), 1) >= 2
    and exists (
      select 1 from orden_trabajo
      where orden_trabajo.id::text = (storage.foldername(name))[2]
        and orden_trabajo.taller_id::text = (storage.foldername(name))[1]
        and usuario_pertenece_taller(orden_trabajo.taller_id)
    )
  );
  drop policy if exists "workshop members upload order photos" on storage.objects;
  create policy "workshop members upload order photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ordenes-trabajo'
    and array_length(storage.foldername(name), 1) >= 2
    and exists (
      select 1 from orden_trabajo
      where orden_trabajo.id::text = (storage.foldername(name))[2]
        and orden_trabajo.taller_id::text = (storage.foldername(name))[1]
        and usuario_pertenece_taller(orden_trabajo.taller_id)
    )
  );
  drop policy if exists "workshop members delete order photos" on storage.objects;
  create policy "workshop members delete order photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'ordenes-trabajo'
    and array_length(storage.foldername(name), 1) >= 2
    and exists (
      select 1 from orden_trabajo
      where orden_trabajo.id::text = (storage.foldername(name))[2]
        and orden_trabajo.taller_id::text = (storage.foldername(name))[1]
        and usuario_pertenece_taller(orden_trabajo.taller_id)
    )
  );

  create or replace function crear_servicio_con_procesos(
    p_taller_id uuid,
    p_nombre text,
    p_categoria categoria_servicio_enum,
    p_precio_base numeric,
    p_tiempo_estimado_min integer,
    p_proceso_ids uuid[]
  )
  returns uuid
  language plpgsql
  set search_path = public
  as $$
  declare
    nuevo_servicio_id uuid;
    total_procesos integer;
  begin
    if not usuario_puede_gestionar_catalogo_taller(p_taller_id) then
      raise exception 'No tenes permisos para administrar el catalogo del taller'
        using errcode = '42501';
    end if;

    select count(distinct selected.proceso_id) into total_procesos
    from unnest(coalesce(p_proceso_ids, array[]::uuid[])) as selected(proceso_id)
    join proceso_servicio on proceso_servicio.id = selected.proceso_id
      and proceso_servicio.taller_id = p_taller_id;

    if total_procesos <> coalesce(cardinality(p_proceso_ids), 0) then
      raise exception 'Uno o mas procesos no pertenecen al taller';
    end if;

    insert into servicio (taller_id, nombre, categoria, precio_base, tiempo_estimado_min, checklist_plantilla)
    values (p_taller_id, p_nombre, p_categoria, p_precio_base, p_tiempo_estimado_min, '[]'::jsonb)
    returning id into nuevo_servicio_id;

    insert into servicio_proceso (servicio_id, proceso_id, orden)
    select nuevo_servicio_id, selected.proceso_id, selected.position::integer - 1
    from unnest(coalesce(p_proceso_ids, array[]::uuid[])) with ordinality as selected(proceso_id, position);

    return nuevo_servicio_id;
  end;
  $$;

  revoke all on function crear_servicio_con_procesos(uuid, text, categoria_servicio_enum, numeric, integer, uuid[]) from public, anon;
  grant execute on function crear_servicio_con_procesos(uuid, text, categoria_servicio_enum, numeric, integer, uuid[]) to authenticated;
