alter table proceso_servicio
  add column if not exists categoria_componente text not null default 'general';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'proceso_servicio_categoria_componente_check'
      and conrelid = 'public.proceso_servicio'::regclass
  ) then
    alter table proceso_servicio
      add constraint proceso_servicio_categoria_componente_check
      check (categoria_componente in (
        'ruedas',
        'frenos',
        'caja_pedalera',
        'horquilla',
        'asiento',
        'transmision',
        'shock',
        'cuadro',
        'general'
      ));
  end if;
end;
$$;

update proceso_servicio
set categoria_componente = case
  when lower(nombre) like '%buje%cuadro%' or lower(nombre) like '%cuadro%'
    or lower(nombre) like '%fusible%' or lower(nombre) like '%direccion%'
    then 'cuadro'
  when lower(nombre) like '%horquilla%' then 'horquilla'
  when lower(nombre) like '%shock%' then 'shock'
  when lower(nombre) like '%dropper%' or lower(nombre) like '%portasilla%'
    or lower(nombre) like '%asiento%' then 'asiento'
  when lower(nombre) like '%pedalera%' then 'caja_pedalera'
  when lower(nombre) like '%freno%' or lower(nombre) like '%pastilla%'
    or lower(nombre) like '%disco%' or lower(nombre) like '%liquido%'
    then 'frenos'
  when lower(nombre) like '%cambio%' or lower(nombre) like '%plato%'
    or lower(nombre) like '%cadena%' then 'transmision'
  when lower(nombre) like '%rueda%' or lower(nombre) like '%cubierta%'
    or lower(nombre) like '%camara%' or lower(nombre) like '%tubeless%'
    or lower(nombre) like '%tubeliz%' or lower(nombre) like '%maza%'
    or lower(nombre) like '%buje%' or lower(nombre) like '%rayo%'
    then 'ruedas'
  else 'general'
end
where categoria_componente = 'general';

create index if not exists proceso_servicio_taller_categoria_idx
  on proceso_servicio(taller_id, categoria_componente);
