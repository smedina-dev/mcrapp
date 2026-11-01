alter table orden_trabajo
  add column if not exists prioridad varchar(20) not null default 'normal'
  check (prioridad in ('baja', 'normal', 'alta', 'pre_carrera', 'express'));

update orden_trabajo set prioridad = 'express' where es_express = true and prioridad = 'normal';

notify pgrst, 'reload schema';
