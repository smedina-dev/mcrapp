alter table orden_trabajo
  add column if not exists margen_extra numeric(12,2) not null default 0 check (margen_extra >= 0),
  add column if not exists token_seguimiento text not null
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  add column if not exists seguimiento_enviado_at timestamptz;

create unique index if not exists orden_trabajo_token_seguimiento_idx
  on orden_trabajo(token_seguimiento);

alter table orden_trabajo_foto
  add column if not exists compartida boolean not null default false;

drop policy if exists "workshop members update order photos" on orden_trabajo_foto;
create policy "workshop members update order photos" on orden_trabajo_foto
  for update using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_foto.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  )) with check (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_foto.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

grant update on orden_trabajo_foto to authenticated;

create table if not exists orden_trabajo_consulta (
  id uuid primary key default gen_random_uuid(),
  orden_trabajo_id uuid not null references orden_trabajo(id) on delete cascade,
  mensaje text not null check (char_length(mensaje) between 1 and 1000),
  monto numeric(12,2) check (monto is null or monto >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'autorizada', 'rechazada')),
  comentario_cliente text check (comentario_cliente is null or char_length(comentario_cliente) <= 1000),
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  respondida_at timestamptz
);

create index if not exists orden_trabajo_consulta_orden_idx
  on orden_trabajo_consulta(orden_trabajo_id, created_at desc);

create table if not exists orden_trabajo_extra (
  id uuid primary key default gen_random_uuid(),
  orden_trabajo_id uuid not null references orden_trabajo(id) on delete cascade,
  descripcion text not null check (char_length(descripcion) between 1 and 300),
  monto numeric(12,2) not null check (monto >= 0),
  consulta_id uuid references orden_trabajo_consulta(id) on delete set null,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists orden_trabajo_extra_orden_idx
  on orden_trabajo_extra(orden_trabajo_id, created_at);

alter table orden_trabajo_consulta enable row level security;
alter table orden_trabajo_extra enable row level security;

drop policy if exists "workshop members view order queries" on orden_trabajo_consulta;
create policy "workshop members view order queries" on orden_trabajo_consulta
  for select using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_consulta.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members add order queries" on orden_trabajo_consulta;
create policy "workshop members add order queries" on orden_trabajo_consulta
  for insert with check (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_consulta.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members view order extras" on orden_trabajo_extra;
create policy "workshop members view order extras" on orden_trabajo_extra
  for select using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_extra.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members add order extras" on orden_trabajo_extra;
create policy "workshop members add order extras" on orden_trabajo_extra
  for insert with check (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_extra.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members delete order extras" on orden_trabajo_extra;
create policy "workshop members delete order extras" on orden_trabajo_extra
  for delete using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_extra.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

grant select, insert on orden_trabajo_consulta to authenticated;
grant select, insert, delete on orden_trabajo_extra to authenticated;

notify pgrst, 'reload schema';
