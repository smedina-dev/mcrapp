alter table cliente
  add column if not exists nombre varchar(255),
  add column if not exists apellido varchar(255),
  add column if not exists fecha_nacimiento date,
  add column if not exists altura_cm smallint check (altura_cm between 50 and 260);
