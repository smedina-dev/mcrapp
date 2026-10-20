alter table cliente
  add column if not exists dni varchar(20);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cliente_dni_format_check'
      and conrelid = 'public.cliente'::regclass
  ) then
    alter table cliente
      add constraint cliente_dni_format_check
      check (dni is null or dni ~ '^[0-9]{7,9}$');
  end if;
end;
$$;

create unique index if not exists cliente_taller_dni_unique_idx
  on cliente(taller_id, dni)
  where dni is not null;
