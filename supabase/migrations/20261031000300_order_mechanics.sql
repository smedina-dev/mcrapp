alter table orden_trabajo
  add column if not exists mecanico_id uuid references empleado(id) on delete set null;

alter table orden_trabajo_checklist
  add column if not exists mecanico_id uuid references empleado(id) on delete set null;

create index if not exists orden_trabajo_mecanico_idx on orden_trabajo(mecanico_id);
create index if not exists orden_trabajo_checklist_mecanico_idx on orden_trabajo_checklist(mecanico_id);

notify pgrst, 'reload schema';
