# Gestión de taller de bicicletas

Aplicación SaaS multitenant para administrar talleres de bicicletas. Está construida con Next.js 14 App Router, TypeScript estricto, Tailwind CSS y Supabase SSR.

## Estado del proyecto

El MVP incluye autenticación y alta del taller, dashboard, clientes, bicicletas, catálogo de servicios y procesos, agenda, recepción, órdenes de trabajo y administración del equipo. La recepción tiene una página propia para seleccionar la bicicleta, registrar su estado, servicios y procesos, y cargar fotos obligatorias antes de crear la orden. La página de órdenes queda separada para consultar y actualizar órdenes ya creadas. Los repuestos se integrarán con el sistema externo de la empresa en una etapa posterior; la aplicación no mantiene inventario propio.

El proyecto está en etapa de pruebas funcionales e integración con Supabase. Antes de considerar una puesta en producción, hay que validar los flujos con usuarios de prueba, completar las variables de entorno del despliegue y ejecutar las comprobaciones indicadas abajo.

## Requisitos

- Node.js 20 o superior.
- Proyecto Supabase con Auth habilitado.

## Configuración local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env.local` y completar:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Para invitar empleados también se necesita `SUPABASE_SERVICE_ROLE_KEY` (la clave `service_role` del proyecto Supabase). Es una clave privada que debe permanecer solo en `.env.local` o en el gestor de secretos del servidor. No usar el prefijo `NEXT_PUBLIC_`, no compartirla y no incluirla en el repositorio. Después de cambiar variables, reiniciar el servidor.

3. En Supabase → Authentication → URL Configuration, configurar el Site URL con el mismo origen de `NEXT_PUBLIC_SITE_URL` y agregar ese origen más `/auth/callback` a las URL de redirección permitidas. En local, por ejemplo, permitir `http://localhost:3000/auth/callback`; en producción, `https://tu-dominio/auth/callback`.
4. En Authentication → Email Templates → **Invite user**, usar un enlace directo a la aplicación que envíe el token hash al callback SSR (reemplazar el enlace de confirmación genérico de la plantilla):

   ```html
   <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/accept-invite">Aceptar invitación</a>
   ```

   El callback valida el `token_hash` y crea la sesión del empleado. El formato genérico que lleva primero a `/auth/v1/verify` puede devolver credenciales en el fragmento (`#...`) de la URL; el servidor no recibe ese fragmento y no puede crear la sesión SSR.
5. En Authentication → Providers, verificar que Email esté habilitado. El SMTP predeterminado de Supabase puede tener límites y restricciones para destinatarios de prueba; para invitar a otros correos, configurar un proveedor SMTP propio en Authentication → SMTP Settings.

## Base de datos y Storage

La base existente debe tener aplicadas **todas** las migraciones, en orden cronológico, desde el SQL Editor de Supabase:

1. `supabase/migrations/20261001000000_initial_schema.sql`
2. `supabase/migrations/20261003000000_customer_profile_fields.sql`
3. `supabase/migrations/20261003000100_bicycle_details_and_ownership.sql`
4. `supabase/migrations/20261003000200_service_process_catalog.sql`
5. `supabase/migrations/20261003000300_seed_service_process_catalog.sql`
6. `supabase/migrations/20261003000400_workshop_employees_and_roles.sql`
7. `supabase/migrations/20261005000000_customer_weight_and_order_pricing.sql`
8. `supabase/migrations/20261006000000_process_component_categories.sql`
9. `supabase/migrations/20261007000000_customer_dni.sql`
10. `supabase/migrations/20261012000000_work_order_reception_defects.sql`
11. `supabase/migrations/20261012000100_work_order_bike_inspection.sql`
12. `supabase/migrations/20261012000200_restore_work_order_creation_rpc.sql`
13. `supabase/migrations/20261015000000_create_work_order_photo_bucket.sql`
14. `supabase/migrations/20261015000100_restore_work_order_reception_finalize_rpc.sql`

La migración `20261015000000` crea o configura el bucket privado `ordenes-trabajo` con límite de 4 MB y los formatos de imagen admitidos. La migración de roles configura las políticas de acceso a los objetos de órdenes para los miembros del taller.
La migración `20261015000100` restaura la función RPC que valida las fotos cargadas y cierra la recepción, y recarga el esquema de PostgREST.

La migración `20261005000000` agrega el peso opcional del cliente, descuentos porcentuales por proceso, el detalle de precios aplicados y el cierre de recepción de cada orden. También carga precios de referencia iniciales de $15.000 para mantenimiento completo de bujes de cuadro y $20.000 para mantenimiento completo de mazas/cambio de rulemanes. Los precios y porcentajes pueden ajustarse en Catálogo → Procesos. Los importes de las órdenes se guardan como valores históricos para conservar la cotización aunque luego cambie el catálogo.

El flujo de recepción filtra las bicicletas por cliente. En el modo estándar requiere completar el checklist de ingreso y permite elegir paquetes y procesos; el modo EXPRESS omite el checklist y los paquetes, y permite elegir procesos independientes con el precio del catálogo o registrar un servicio fuera del listado con precio manual. Las órdenes EXPRESS se muestran primero en Órdenes de trabajo y llevan una marca visible de prioridad. Ambos modos registran observaciones y requieren entre 1 y 5 fotos JPG/PNG/WebP (máximo 4 MB por foto). El botón principal abre una vista de cámara en vivo mediante el permiso del navegador (en tabletas intenta usar la cámara trasera); requiere HTTPS o localhost. Hay una opción secundaria para adjuntar fotos desde archivos. Se pueden combinar ambos orígenes, revisar las miniaturas y quitar fotos antes de enviar. Solo después de subirlas se cierra la recepción y queda la orden visible para el mecánico en estado Recepción. El mecánico cambia a En proceso al comenzar. Las recepciones incompletas no se envían al mecánico. El bucket `ordenes-trabajo` debe permitir la carga según las políticas de la migración de roles.

El catálogo/stock de repuestos pertenece a un sistema externo y todavía no está conectado. La integración del catálogo y del carrito de compras se definirá con la empresa según las opciones de autenticación/API y el flujo de compra disponibles; no se descuenta stock desde esta aplicación.

En la recepción, los procesos adicionales se organizan por componente en botones táctiles: Ruedas, Frenos, Caja pedalera, Horquilla, Asiento, Transmisión, Shock, Cuadro y General / otros. La categoría se asigna en Catálogo → Procesos.

La sección Clientes muestra primero el formulario y busca registros bajo demanda por nombre, DNI, teléfono o correo; no descarga ni presenta todos los clientes al abrir la página. Los resultados se limitan a 20 por búsqueda y enlazan a la ficha individual, donde se ven los datos personales, bicicletas, órdenes recientes y turnos, y se pueden editar los datos. El DNI se normaliza a dígitos, es obligatorio para nuevos clientes y único dentro de cada taller; los registros anteriores pueden conservar el DNI vacío hasta completar su ficha. El teléfono y la dirección permanecen editables.

En la recepción de órdenes, los clientes se buscan por prefijo de nombre y solo se cargan las bicicletas del cliente elegido. Se puede crear un cliente o agregar una bicicleta y volver a la recepción con la selección aplicada. En el modo estándar, la inspección guiada requiere clasificar cada punto como Bueno, Regular, Malo o No revisado; la cadena se mide en 0,5%, 0,75% o 1%, y el shock puede marcarse No aplica. También se pueden registrar meses y kilómetros desde los últimos mantenimientos de la bicicleta, horquilla y shock. Los datos se guardan en la inspección de la orden mediante la función RPC `crear_orden_trabajo_con_inspeccion`. Aplicar en Supabase las migraciones `20261012000000` y `20261012000100` en ese orden. La migración `20261012000200` restaura la función base de creación de órdenes que necesita la función de inspección y agrega `recepcion_cerrada` si falta; también recarga el esquema de PostgREST. Si la aplicación todavía no encuentra la función tras ejecutarlas, correr `NOTIFY pgrst, 'reload schema';` en SQL Editor y esperar unos segundos. Los botones de servicio muestran Básico, Intermedio, Primer service, Express (paquete) y Detallado (este último usa la categoría Avanzado del catálogo); Agregado no se ofrece como paquete. Los agregados por componente aparecen luego de elegir un servicio. Cambiar la categoría de servicios no quita selecciones ya hechas.

El checklist separa la revisión de rueda delantera y trasera para rayos, cubiertas, bujes, pastillas/zapatas y discos o pistas de frenado. La contaminación de las pastillas delanteras y traseras se registra de forma independiente con opciones Sí, No o No revisado. Cada punto permite un comentario opcional de hasta 500 caracteres, visible en el detalle de la orden; al completar todos los puntos de una categoría, el formulario avanza a la siguiente categoría pendiente. La fecha estimada de entrega es obligatoria.

La interfaz incluye una barra superior persistente optimizada para pantallas táctiles, con el logo del taller, saludo y nombre del empleado activo, y un selector de tema claro/oscuro. Si el logo no carga, se muestra el texto alternativo Marcovecchio Bikes. La preferencia del tema se guarda localmente en el navegador.

Para revisar una instancia ya configurada, ejecutar `supabase/diagnostics/20261003_read_only_database_audit.sql` en el SQL Editor. Es una consulta de diagnóstico de solo lectura (salvo una tabla temporal de sesión); comparar sus resultados de columnas, conteos, RLS, políticas, bucket y enums con lo esperado.

Para permitir bicicletas sin cliente asignado, aplicar `supabase/migrations/20261018000100_bicycle_workshop_ownership.sql` en Supabase. La migración guarda el taller en las bicicletas asociadas a clientes y asigna las bicicletas que quedaron sin taller al taller Marcovecchio, conservando el aislamiento por RLS. Después de aplicarla, las bicicletas sin cliente se pueden buscar desde Bicicletas y vincular a un cliente desde su ficha; no aparecen en turnos ni en la recepción de órdenes hasta que se les asigne uno.

## Ejecutar la aplicación

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). El servidor de desarrollo se detiene con `Ctrl+C`.

## Pruebas funcionales sugeridas

1. Crear o iniciar sesión con un usuario de prueba y completar el alta del taller.
2. Crear un cliente con DNI, peso y datos de contacto; verificar que no se pueda repetir el DNI en el taller. Confirmar que Clientes no cargue registros hasta buscar, que la búsqueda encuentre al cliente y abra su ficha detallada, y que editar teléfono/dirección se refleje allí. Asociarle una bicicleta y verificar que el peso aparezca durante la recepción y al consultar la bicicleta. En la recepción, comprobar que al cambiar de cliente se reinicia la bicicleta y el menú muestra solo las asociadas a ese cliente.
3. Crear un turno y actualizar su estado.
4. En Catálogo → Procesos, definir un precio de referencia y un descuento porcentual para un proceso.
5. Crear una recepción estándar y una EXPRESS con registros ficticios. En la estándar, completar el checklist, seleccionar paquetes/procesos y revisar el total; en la EXPRESS, verificar que no aparezca el checklist ni los paquetes, que el precio de los procesos venga del catálogo y que un servicio personalizado requiera descripción y precio. En ambos modos, verificar que no se pueda enviar sin una selección válida o sin foto, que las órdenes queden cerradas en estado Recepción y que las EXPRESS aparezcan primero con la marca de prioridad. Confirmar que los importes se conserven aunque luego cambie el catálogo.
6. Seguir los estados de la orden de trabajo.
7. Probar invitaciones y permisos del equipo si `SUPABASE_SERVICE_ROLE_KEY` está configurada.
8. Repetir las lecturas y escrituras con otro usuario para comprobar el aislamiento entre talleres.

Al reportar un problema, incluir la ruta/pantalla, los pasos para reproducirlo, el resultado esperado y el resultado observado. No compartir contraseñas, claves de Supabase ni datos personales reales; usar registros ficticios.

## Verificaciones de código

```bash
npm run typecheck
npm run lint
npm run build
```

Las lecturas de datos se realizan desde Server Components y las escrituras usan Server Actions con validación Zod. Row Level Security (RLS) en Supabase es la frontera final de aislamiento por taller.
