create table if not exists orden_trabajo_checklist (
  id uuid primary key default gen_random_uuid(),
  orden_trabajo_id uuid not null references orden_trabajo(id) on delete cascade,
  proceso_id uuid not null references proceso_servicio(id) on delete restrict,
  completado boolean not null default false,
  completado_at timestamptz,
  completado_por uuid references auth.users(id) on delete set null,
  unique (orden_trabajo_id, proceso_id)
);

create index if not exists orden_trabajo_checklist_orden_idx
  on orden_trabajo_checklist(orden_trabajo_id);

alter table orden_trabajo_checklist enable row level security;

drop policy if exists "workshop members view order checklist" on orden_trabajo_checklist;
create policy "workshop members view order checklist" on orden_trabajo_checklist
  for select using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_checklist.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members add order checklist" on orden_trabajo_checklist;
create policy "workshop members add order checklist" on orden_trabajo_checklist
  for insert with check (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_checklist.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members update order checklist" on orden_trabajo_checklist;
create policy "workshop members update order checklist" on orden_trabajo_checklist
  for update using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_checklist.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  )) with check (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_checklist.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

grant select, insert, update on orden_trabajo_checklist to authenticated;

create table if not exists orden_trabajo_foto (
  id uuid primary key default gen_random_uuid(),
  orden_trabajo_id uuid not null references orden_trabajo(id) on delete cascade,
  proceso_id uuid references proceso_servicio(id) on delete set null,
  ruta text not null,
  descripcion text not null check (char_length(descripcion) <= 500),
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists orden_trabajo_foto_orden_idx
  on orden_trabajo_foto(orden_trabajo_id, created_at desc);

alter table orden_trabajo_foto enable row level security;

drop policy if exists "workshop members view order photos" on orden_trabajo_foto;
create policy "workshop members view order photos" on orden_trabajo_foto
  for select using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_foto.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members add order photos" on orden_trabajo_foto;
create policy "workshop members add order photos" on orden_trabajo_foto
  for insert with check (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_foto.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

drop policy if exists "workshop members delete order photos" on orden_trabajo_foto;
create policy "workshop members delete order photos" on orden_trabajo_foto
  for delete using (exists (
    select 1 from orden_trabajo
    where orden_trabajo.id = orden_trabajo_foto.orden_trabajo_id
      and usuario_pertenece_taller(orden_trabajo.taller_id)
  ));

grant select, insert, delete on orden_trabajo_foto to authenticated;

notify pgrst, 'reload schema';
