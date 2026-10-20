-- Auditoria de solo lectura del esquema esperado por la aplicacion.
-- No ejecuta UPDATE, DELETE ni modifica tablas persistentes.
-- La tabla temporal de conteos existe solo durante esta sesion del SQL Editor.

with expected_columns(table_name, column_name) as (
  values
    ('taller', 'id'),
    ('taller', 'user_id'),
    ('taller', 'nombre'),
    ('taller', 'cuit_rut'),
    ('taller', 'telefono'),
    ('taller', 'logo_url'),
    ('taller', 'created_at'),
    ('cliente', 'id'),
    ('cliente', 'taller_id'),
    ('cliente', 'nombre_completo'),
    ('cliente', 'nombre'),
    ('cliente', 'apellido'),
    ('cliente', 'dni'),
    ('cliente', 'fecha_nacimiento'),
    ('cliente', 'altura_cm'),
    ('cliente', 'peso_kg'),
    ('cliente', 'telefono'),
    ('cliente', 'email'),
    ('cliente', 'direccion'),
    ('cliente', 'created_at'),
    ('bicicleta', 'id'),
    ('bicicleta', 'cliente_id'),
    ('bicicleta', 'marca_modelo'),
    ('bicicleta', 'marca'),
    ('bicicleta', 'modelo'),
    ('bicicleta', 'talle'),
    ('bicicleta', 'color'),
    ('bicicleta', 'tubelizada'),
    ('bicicleta', 'liquido_tubeless'),
    ('bicicleta', 'presion_horquilla_psi'),
    ('bicicleta', 'rebote_horquilla_clicks'),
    ('bicicleta', 'tiene_shock'),
    ('bicicleta', 'presion_shock_psi'),
    ('bicicleta', 'rebote_shock_baja_clicks'),
    ('bicicleta', 'rebote_shock_alta_clicks'),
    ('bicicleta', 'numero_serie'),
    ('bicicleta', 'horquilla'),
    ('bicicleta', 'shock'),
    ('bicicleta', 'disciplina'),
    ('bicicleta', 'primer_service_disponible'),
    ('bicicleta', 'created_at'),
    ('bicicleta_historial_propietario', 'id'),
    ('bicicleta_historial_propietario', 'bicicleta_id'),
    ('bicicleta_historial_propietario', 'cliente_anterior_id'),
    ('bicicleta_historial_propietario', 'cliente_nuevo_id'),
    ('bicicleta_historial_propietario', 'fecha_cambio'),
    ('servicio', 'id'),
    ('servicio', 'taller_id'),
    ('servicio', 'nombre'),
    ('servicio', 'categoria'),
    ('servicio', 'precio_base'),
    ('servicio', 'tiempo_estimado_min'),
    ('servicio', 'checklist_plantilla'),
    ('servicio', 'created_at'),
    ('proceso_servicio', 'id'),
    ('proceso_servicio', 'taller_id'),
    ('proceso_servicio', 'nombre'),
    ('proceso_servicio', 'categoria_componente'),
    ('proceso_servicio', 'importe_referencia'),
    ('proceso_servicio', 'descuento_servicio_pct'),
    ('proceso_servicio', 'tiempo_estimado_min'),
    ('proceso_servicio', 'created_at'),
    ('empleado', 'id'),
    ('empleado', 'taller_id'),
    ('empleado', 'auth_user_id'),
    ('empleado', 'email'),
    ('empleado', 'nombre'),
    ('empleado', 'apellido'),
    ('empleado', 'fecha_nacimiento'),
    ('empleado', 'fecha_ingreso'),
    ('empleado', 'rango'),
    ('empleado', 'fecha_inicio_rango'),
    ('empleado', 'rol_acceso'),
    ('empleado', 'activo'),
    ('empleado', 'created_at'),
    ('empleado', 'updated_at'),
    ('empleado_historial_rango', 'id'),
    ('empleado_historial_rango', 'empleado_id'),
    ('empleado_historial_rango', 'rango_anterior'),
    ('empleado_historial_rango', 'rango_nuevo'),
    ('empleado_historial_rango', 'fecha_cambio'),
    ('empleado_historial_rango', 'cambiado_por'),
    ('servicio_proceso', 'id'),
    ('servicio_proceso', 'servicio_id'),
    ('servicio_proceso', 'proceso_id'),
    ('servicio_proceso', 'orden'),
    ('servicio_proceso', 'created_at'),
    ('agenda_turno', 'id'),
    ('agenda_turno', 'taller_id'),
    ('agenda_turno', 'cliente_id'),
    ('agenda_turno', 'bicicleta_id'),
    ('agenda_turno', 'fecha_hora'),
    ('agenda_turno', 'estado'),
    ('agenda_turno', 'observaciones'),
    ('agenda_turno', 'created_at'),
    ('orden_trabajo', 'id'),
    ('orden_trabajo', 'numero_ot'),
    ('orden_trabajo', 'taller_id'),
    ('orden_trabajo', 'cliente_id'),
    ('orden_trabajo', 'bicicleta_id'),
    ('orden_trabajo', 'ot_garantia_id'),
    ('orden_trabajo', 'estado'),
    ('orden_trabajo', 'es_express'),
    ('orden_trabajo', 'inspeccion_recepcion'),
    ('orden_trabajo', 'recomendaciones'),
    ('orden_trabajo', 'fotos'),
    ('orden_trabajo', 'bitacora_comunicaciones'),
    ('orden_trabajo', 'presupuesto_total'),
    ('orden_trabajo', 'fecha_ingreso'),
    ('orden_trabajo', 'fecha_entrega_estimada'),
    ('orden_trabajo', 'fecha_cierre'),
    ('orden_trabajo', 'recepcion_cerrada'),
    ('orden_trabajo', 'created_at'),
    ('orden_trabajo_servicio', 'id'),
    ('orden_trabajo_servicio', 'orden_trabajo_id'),
    ('orden_trabajo_servicio', 'servicio_id'),
    ('orden_trabajo_servicio', 'precio_aplicado'),
    ('orden_trabajo_servicio', 'observaciones'),
    ('orden_trabajo_proceso', 'id'),
    ('orden_trabajo_proceso', 'orden_trabajo_id'),
    ('orden_trabajo_proceso', 'proceso_id'),
    ('orden_trabajo_proceso', 'precio_lista'),
    ('orden_trabajo_proceso', 'descuento_porcentaje'),
    ('orden_trabajo_proceso', 'precio_aplicado'),
    ('orden_trabajo_proceso', 'created_at')
)
select
  expected_columns.table_name,
  expected_columns.column_name,
  case when actual.column_name is null then 'FALTA' else 'OK' end as resultado,
  actual.data_type
from expected_columns
left join information_schema.columns actual
  on actual.table_schema = 'public'
  and actual.table_name = expected_columns.table_name
  and actual.column_name = expected_columns.column_name
order by expected_columns.table_name, expected_columns.column_name;

create temporary table if not exists audit_table_counts (
  table_name text primary key,
  row_count bigint not null
) on commit preserve rows;

truncate table pg_temp.audit_table_counts;

do $audit$
declare
  target_table text;
begin
  foreach target_table in array array[
    'taller',
    'cliente',
    'bicicleta',
    'bicicleta_historial_propietario',
    'servicio',
    'proceso_servicio',
    'servicio_proceso',
    'empleado',
    'empleado_historial_rango',
    'agenda_turno',
    'orden_trabajo',
    'orden_trabajo_servicio',
    'orden_trabajo_proceso'
  ] loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format(
        'insert into pg_temp.audit_table_counts (table_name, row_count) select %L, count(*) from public.%I',
        target_table,
        target_table
      );
    end if;
  end loop;
end
$audit$;

select table_name, row_count
from pg_temp.audit_table_counts
order by table_name;

select
  r.relname as table_name,
  r.relrowsecurity as rls_habilitado
from pg_class as r
where r.oid in (
  select to_regclass(format('public.%I', table_name))
  from unnest(array[
    'taller',
    'cliente',
    'bicicleta',
    'bicicleta_historial_propietario',
    'servicio',
    'proceso_servicio',
    'servicio_proceso',
    'empleado',
    'empleado_historial_rango',
    'agenda_turno',
    'orden_trabajo',
    'orden_trabajo_servicio',
    'orden_trabajo_proceso'
  ]) as tables(table_name)
)
order by r.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in (
  'taller',
  'cliente',
  'bicicleta',
  'bicicleta_historial_propietario',
  'servicio',
  'proceso_servicio',
  'servicio_proceso',
  'empleado',
  'empleado_historial_rango',
  'agenda_turno',
  'orden_trabajo',
  'orden_trabajo_servicio',
  'orden_trabajo_proceso'
)) or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select name, public, file_size_limit, allowed_mime_types
from storage.buckets
where name = 'ordenes-trabajo';

select
  enum_type.typname as enum_name,
  enum_value.enumlabel as value,
  enum_value.enumsortorder as position
from pg_type enum_type
join pg_enum enum_value on enum_value.enumtypid = enum_type.oid
where enum_type.typname in (
  'categoria_servicio_enum',
  'estado_turno_enum',
  'estado_ot_enum',
  'disciplina_bici_enum'
)
order by enum_name, position;
