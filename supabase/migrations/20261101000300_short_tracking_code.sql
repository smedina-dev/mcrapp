alter table orden_trabajo
  add column if not exists codigo_corto text not null
    default substr(md5(random()::text || clock_timestamp()::text || gen_random_uuid()::text), 1, 12);

create unique index if not exists orden_trabajo_codigo_corto_idx
  on orden_trabajo(codigo_corto);

notify pgrst, 'reload schema';
