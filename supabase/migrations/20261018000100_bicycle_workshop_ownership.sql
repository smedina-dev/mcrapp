alter table bicicleta
  add column if not exists taller_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'bicicleta'::regclass
      and conname = 'bicicleta_taller_id_fkey'
  ) then
    alter table bicicleta
      add constraint bicicleta_taller_id_fkey
      foreign key (taller_id) references taller(id) on delete cascade;
  end if;
end;
$$;

update bicicleta
set taller_id = cliente.taller_id
from cliente
where cliente.id = bicicleta.cliente_id
  and bicicleta.taller_id is null;

do $$
declare
  target_workshop_id uuid;
  matching_workshops integer;
begin
  if exists (select 1 from bicicleta where taller_id is null) then
    select count(*) into matching_workshops
    from taller
    where nombre = 'Marcovecchio';

    if matching_workshops <> 1 then
      raise exception 'Se esperaba un único taller llamado Marcovecchio para asociar las bicicletas sin taller; se encontraron %.', matching_workshops;
    end if;

    select id into target_workshop_id
    from taller
    where nombre = 'Marcovecchio';

    update bicicleta
    set taller_id = target_workshop_id
    where taller_id is null;
  end if;
end;
$$;

alter table bicicleta
  alter column taller_id set not null,
  alter column cliente_id drop not null;

create index if not exists bicicleta_taller_id_idx on bicicleta(taller_id);

drop policy if exists "workshop users manage bicycles" on bicicleta;
drop policy if exists "workshop members manage bicycles" on bicicleta;
create policy "workshop members manage bicycles" on bicicleta
  for all using (
    usuario_pertenece_taller(taller_id)
    and (
      cliente_id is null
      or exists (
        select 1 from cliente
        where cliente.id = bicicleta.cliente_id
          and cliente.taller_id = bicicleta.taller_id
      )
    )
  )
  with check (
    usuario_pertenece_taller(taller_id)
    and (
      cliente_id is null
      or exists (
        select 1 from cliente
        where cliente.id = bicicleta.cliente_id
          and cliente.taller_id = bicicleta.taller_id
      )
    )
  );

drop policy if exists "workshop members view bicycle ownership history" on bicicleta_historial_propietario;
create policy "workshop members view bicycle ownership history" on bicicleta_historial_propietario
  for select using (exists (
    select 1 from bicicleta
    where bicicleta.id = bicicleta_historial_propietario.bicicleta_id
      and usuario_pertenece_taller(bicicleta.taller_id)
  ));

drop policy if exists "workshop members record bicycle ownership history" on bicicleta_historial_propietario;
create policy "workshop members record bicycle ownership history" on bicicleta_historial_propietario
  for insert with check (exists (
    select 1 from bicicleta
    where bicicleta.id = bicicleta_historial_propietario.bicicleta_id
      and usuario_pertenece_taller(bicicleta.taller_id)
      and (
        bicicleta_historial_propietario.cliente_anterior_id is null
        or exists (
          select 1 from cliente
          where cliente.id = bicicleta_historial_propietario.cliente_anterior_id
            and cliente.taller_id = bicicleta.taller_id
        )
      )
      and (
        bicicleta_historial_propietario.cliente_nuevo_id is null
        or exists (
          select 1 from cliente
          where cliente.id = bicicleta_historial_propietario.cliente_nuevo_id
            and cliente.taller_id = bicicleta.taller_id
        )
      )
  ));
