import Image from "next/image";
import { updateWorkOrderStateAction } from "@/app/actions";
import { WorkOrderIntakeForm } from "@/components/work-order-intake-form";
import { formatAmount, formatDate, workOrderStates } from "@/lib/presentation";
import { requireWorkshop } from "@/lib/workshop";

type WorkOrdersPageProps = { searchParams: { error?: string; creado?: string; actualizado?: string; cliente_id?: string; bicicleta_id?: string } };
type OwnedBicycle = { id: string; cliente_id: string; marca_modelo: string; tiene_shock: boolean };

export default async function WorkOrdersPage({ searchParams }: WorkOrdersPageProps) {
  const { supabase, workshop } = await requireWorkshop();
  const [
    { data: orders },
    { data: services },
    { data: processes },
    { data: serviceProcesses },
    { data: orderServices },
    { data: orderProcesses },
  ] = await Promise.all([
    supabase.from("orden_trabajo").select("id, numero_ot, cliente_id, bicicleta_id, estado, es_express, presupuesto_total, inspeccion_recepcion, fotos, recepcion_cerrada, fecha_ingreso, fecha_entrega_estimada")
      .eq("taller_id", workshop.id).eq("recepcion_cerrada", true).order("created_at", { ascending: false }),
    supabase.from("servicio").select("id, nombre, categoria, precio_base")
      .eq("taller_id", workshop.id).order("nombre"),
    supabase.from("proceso_servicio").select("id, nombre, categoria_componente, importe_referencia, descuento_servicio_pct")
      .eq("taller_id", workshop.id).order("nombre"),
    supabase.from("servicio_proceso").select("servicio_id, proceso_id").order("orden"),
    supabase.from("orden_trabajo_servicio").select("orden_trabajo_id, servicio_id, precio_aplicado"),
    supabase.from("orden_trabajo_proceso").select("orden_trabajo_id, proceso_id, precio_lista, descuento_porcentaje, precio_aplicado"),
  ]);

  const customerIds = Array.from(new Set([
    ...(orders ?? []).map((order) => order.cliente_id),
    searchParams.cliente_id,
  ].filter((id): id is string => Boolean(id))));
  const orderBicycleIds = Array.from(new Set((orders ?? []).map((order) => order.bicicleta_id)));
  const [{ data: customers }, { data: orderBicycles }, { data: intakeBicycles }] = await Promise.all([
    customerIds.length
      ? supabase.from("cliente").select("id, nombre_completo, peso_kg").eq("taller_id", workshop.id).in("id", customerIds)
      : Promise.resolve({ data: [] }),
    orderBicycleIds.length
      ? supabase.from("bicicleta").select("id, cliente_id, marca_modelo, tiene_shock").in("id", orderBicycleIds)
      : Promise.resolve({ data: [] }),
    searchParams.cliente_id
      ? supabase.from("bicicleta").select("id, cliente_id, marca_modelo, tiene_shock")
        .eq("cliente_id", searchParams.cliente_id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const bicycles = Array.from(new Map(
    [...(orderBicycles ?? []), ...(intakeBicycles ?? [])].map((bicycle) => [bicycle.id, bicycle]),
  ).values()).filter((bicycle): bicycle is OwnedBicycle => bicycle.cliente_id !== null);

  const photoPaths = Array.from(new Set((orders ?? []).flatMap((order) =>
    Array.isArray(order.fotos) ? order.fotos.filter((path): path is string => typeof path === "string") : [],
  )));
  const { data: signedPhotos, error: signedPhotosError } = photoPaths.length
    ? await supabase.storage.from("ordenes-trabajo").createSignedUrls(photoPaths, 3600)
    : { data: [], error: null };
  if (signedPhotosError) throw new Error(`No se pudieron cargar las fotos de recepción: ${signedPhotosError.message}`);
  const unavailablePhoto = signedPhotos?.find((photo) => photo.error);
  if (unavailablePhoto?.error) throw new Error(`No se pudo acceder a una foto de recepción: ${unavailablePhoto.error}`);
  const signedPhotoMap = new Map((signedPhotos ?? []).map((photo) => [photo.path, photo.signedUrl]));

  const processMap = new Map((processes ?? []).map((process) => [process.id, process]));
  const serviceProcessesMap = new Map<string, { id: string; nombre: string }[]>();
  for (const link of serviceProcesses ?? []) {
    const process = processMap.get(link.proceso_id);
    if (process) {
      const items = serviceProcessesMap.get(link.servicio_id) ?? [];
      items.push({ id: process.id, nombre: process.nombre });
      serviceProcessesMap.set(link.servicio_id, items);
    }
  }
  const serviceMap = new Map((services ?? []).map((service) => [service.id, service]));
  const orderServiceMap = new Map<string, typeof orderServices>();
  for (const item of orderServices ?? []) {
    orderServiceMap.set(item.orden_trabajo_id, [...(orderServiceMap.get(item.orden_trabajo_id) ?? []), item]);
  }
  const orderProcessMap = new Map<string, typeof orderProcesses>();
  for (const item of orderProcesses ?? []) {
    orderProcessMap.set(item.orden_trabajo_id, [...(orderProcessMap.get(item.orden_trabajo_id) ?? []), item]);
  }
  const serviceCards = (services ?? []).map((service) => ({
    ...service,
    processes: serviceProcessesMap.get(service.id) ?? [],
  }));
  const initialCustomerId = customers?.some((customer) => customer.id === searchParams.cliente_id) ? searchParams.cliente_id : "";
  const initialBicycleId = bicycles.some((bicycle) => bicycle.id === searchParams.bicicleta_id && bicycle.cliente_id === initialCustomerId) ? searchParams.bicicleta_id : "";

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Taller</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Órdenes de trabajo</h1>
        <p className="mt-2 text-base text-[#65716a]">Recepción, seguimiento y entrega de bicicletas.</p>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{searchParams.error === "seleccion" ? "La combinación seleccionada no es válida. Revisá servicios, procesos y precios." : searchParams.error === "bucket" ? "No existe el bucket ordenes-trabajo en el proyecto Supabase conectado. Ejecutá la migración 20261015000000_create_work_order_photo_bucket.sql en ese proyecto y verificá que NEXT_PUBLIC_SUPABASE_URL apunte al mismo proyecto." : searchParams.error === "fotos" ? "No se pudo subir una o más fotos. Revisá que sean JPG, PNG o WebP de hasta 4 MB, y que el bucket ordenes-trabajo permita la carga; la recepción no se cerró." : searchParams.error === "migracion-cierre" ? "Supabase no encuentra la función que cierra la recepción. Ejecutá la migración 20261015000100_restore_work_order_reception_finalize_rpc.sql en el proyecto conectado y esperá unos segundos a que PostgREST recargue el esquema antes de reintentar." : searchParams.error === "cierre" ? "No se pudo cerrar la recepción. La orden incompleta se descartó; consultá el registro del servidor para ver el detalle." : searchParams.error === "migracion-esquema" ? "Falta una columna de la base de datos para gestionar el cierre de la recepción. Volvé a ejecutar la versión actualizada de 20261012000200_restore_work_order_creation_rpc.sql en el proyecto conectado y luego reintentá." : searchParams.error === "migracion-base" ? "Falta la función base que crea órdenes. Ejecutá en el proyecto conectado la migración 20261012000200_restore_work_order_creation_rpc.sql y volvé a intentar." : searchParams.error === "migracion" ? "Supabase no encuentra la función crear_orden_trabajo_con_inspeccion. Volvé a ejecutar la versión actualizada de 20261012000100_work_order_bike_inspection.sql en el proyecto conectado a la app y esperá unos segundos a que PostgREST recargue el esquema." : "No se pudo completar la operación. Revisá los datos de la orden y consultá el registro del servidor para ver el detalle."}</p> : null}
      {searchParams.creado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Recepción cerrada; la orden quedó completa para el mecánico.</p> : null}
      {searchParams.actualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Orden actualizada.</p> : null}
      <section id="recepcion" className="mb-7 scroll-mt-4 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest">Recepción</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Ingresar bicicleta al taller</h2>
        <WorkOrderIntakeForm
          customers={customers ?? []}
          bicycles={bicycles}
          defaultCustomerId={initialCustomerId}
          defaultBicycleId={initialBicycleId}
          services={serviceCards}
          processes={(processes ?? []).map((process) => ({
            id: process.id,
            nombre: process.nombre,
            categoria_componente: process.categoria_componente,
            importe_referencia: process.importe_referencia,
            descuento_servicio_pct: process.descuento_servicio_pct,
          }))}
        />
      </section>

      <section aria-label="Órdenes registradas" className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div><h2 className="text-xl font-bold text-ink">Órdenes activas</h2><p className="mt-1 text-sm text-[#748079]">{orders?.length ?? 0} en total</p></div>
        </div>
        {(orders ?? []).map((order) => {
          const selectedServices = orderServiceMap.get(order.id) ?? [];
          const selectedProcesses = orderProcessMap.get(order.id) ?? [];
          const orderPhotoPaths = Array.isArray(order.fotos)
            ? order.fotos.filter((path): path is string => typeof path === "string")
            : [];
          const receptionInspection = order.inspeccion_recepcion
            && typeof order.inspeccion_recepcion === "object"
            && !Array.isArray(order.inspeccion_recepcion)
            ? order.inspeccion_recepcion
            : null;
          const receptionNotes = typeof receptionInspection?.observaciones === "string"
            ? receptionInspection.observaciones
            : "";
          const receptionDefectSelections = Array.isArray(receptionInspection?.desperfectos)
            ? receptionInspection.desperfectos.filter((selection): selection is { categoria: string; opciones: string[] } =>
              typeof selection === "object" && selection !== null && !Array.isArray(selection)
              && typeof selection.categoria === "string" && Array.isArray(selection.opciones)
              && selection.opciones.every((option) => typeof option === "string"),
            )
            : [];
          const inspectionRevision = Array.isArray(receptionInspection?.revision)
            ? receptionInspection.revision.flatMap((category) => {
              if (typeof category !== "object" || category === null || Array.isArray(category)
                || typeof category.categoria !== "string" || !Array.isArray(category.puntos)) return [];
              const points = category.puntos.filter((point): point is { componente: string; resultado: string; comentario?: string | null } =>
                typeof point === "object" && point !== null && !Array.isArray(point)
                && typeof point.componente === "string" && typeof point.resultado === "string"
                && (!("comentario" in point) || typeof point.comentario === "string" || point.comentario === null),
              );
              return [{ categoria: category.categoria, puntos: points }];
            })
            : [];
          const maintenance = receptionInspection?.mantenimiento
            && typeof receptionInspection.mantenimiento === "object"
            && !Array.isArray(receptionInspection.mantenimiento)
            ? receptionInspection.mantenimiento
            : null;
          const maintenanceText = (value: unknown) => {
            if (!value || typeof value !== "object" || Array.isArray(value)) return "Sin dato";
            const record = value as { meses?: unknown; kilometros?: unknown };
            const details = [
              typeof record.meses === "number" ? `${record.meses} ${record.meses === 1 ? "mes" : "meses"}` : null,
              typeof record.kilometros === "number" ? `${record.kilometros} km` : null,
            ].filter((detail): detail is string => detail !== null);
            return details.length ? details.join(" · ") : "Sin dato";
          };
          return (
            <article key={order.id} className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-forest">Orden de trabajo</p>
                  <h3 className="mt-1 text-xl font-bold text-ink">OT-{order.numero_ot}</h3>
                </div>
                <div className="text-right">
                  {order.es_express ? <span className="rounded-full bg-[#fff3d8] px-3 py-1.5 text-xs font-bold text-[#855a0b]">Express</span> : <span className="rounded-full bg-[#f0f3ef] px-3 py-1.5 text-xs font-semibold text-[#59665e]">Estándar</span>}
                  <p className="mt-2 text-lg font-bold text-ink">${formatAmount(order.presupuesto_total)}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-[#edf0ec] pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Cliente</p><p className="mt-1 font-semibold text-ink">{customers?.find((customer) => customer.id === order.cliente_id)?.nombre_completo ?? "Cliente"}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Bicicleta</p><p className="mt-1 font-semibold text-ink">{bicycles?.find((bicycle) => bicycle.id === order.bicicleta_id)?.marca_modelo ?? "Bicicleta"}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Ingreso</p><p className="mt-1 text-sm text-[#414e47]">{formatDate(order.fecha_ingreso)}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Entrega estimada</p><p className="mt-1 text-sm text-[#414e47]">{formatDate(order.fecha_entrega_estimada)}</p></div>
              </div>
              <section className="mt-4 space-y-3 border-t border-[#edf0ec] pt-4" aria-label={`Estado de ingreso de OT-${order.numero_ot}`}>
                <div>
                  <h4 className="text-sm font-bold text-ink">Estado al recibir</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#59665e]">{receptionNotes || "Sin observaciones adicionales."}</p>
                  {receptionDefectSelections.length ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      {receptionDefectSelections.map((selection) => (
                        <li key={selection.categoria}>
                          <strong>{selection.categoria}:</strong> {selection.opciones.join(", ")}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {inspectionRevision.length ? (
                    <details className="group mt-4 overflow-hidden rounded-xl border border-[#e2e7e1]">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <span className="font-bold text-ink">Checklist de recepción</span>
                        <span className="flex shrink-0 items-center gap-3 text-sm font-semibold text-[#65716a]">
                          {inspectionRevision.reduce((total, category) => total + category.puntos.length, 0)} puntos
                          <span aria-hidden="true" className="text-lg text-forest transition-transform group-open:rotate-45">+</span>
                        </span>
                      </summary>
                      <div className="space-y-4 border-t border-[#edf0ec] p-4">
                        {inspectionRevision.map((category) => (
                          <div key={category.categoria}>
                            <h6 className="text-xs font-bold uppercase tracking-wide text-[#65716a]">{category.categoria}</h6>
                            <ul className="mt-1 space-y-1 text-sm text-[#414e47]">
                              {category.puntos.map((point) => {
                                const statusLabel: Record<string, string> = {
                                  bueno: "Bueno",
                                  regular: "Regular",
                                  malo: "Malo",
                                  si: "Sí",
                                  no: "No",
                                  no_revisado: "No revisado",
                                  no_aplica: "No aplica",
                                };
                                return (
                                  <li key={point.componente}>
                                    <div>{point.componente}: <strong>{statusLabel[point.resultado] ?? point.resultado}</strong></div>
                                    {point.comentario ? <p className="mt-0.5 whitespace-pre-wrap pl-2 text-xs text-[#65716a]">Comentario: {point.comentario}</p> : null}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  {maintenance ? (
                    <div className="mt-4">
                      <h5 className="text-sm font-bold text-ink">Tiempo desde el último service</h5>
                      <ul className="mt-1 space-y-1 text-sm text-[#414e47]">
                        <li>Bicicleta completa: {maintenanceText(maintenance.ultimo_service)}</li>
                        <li>Horquilla: {maintenanceText(maintenance.horquilla)}</li>
                        {maintenance.shock ? <li>Shock: {maintenanceText(maintenance.shock)}</li> : null}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {orderPhotoPaths.map((path, index) => {
                    const signedUrl = signedPhotoMap.get(path);
                    return signedUrl ? (
                      <a key={path} href={signedUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-[#e2e7e1] focus:outline-none focus:ring-2 focus:ring-forest">
                        <Image src={signedUrl} alt={`Foto ${index + 1} del estado de ingreso de OT-${order.numero_ot}`} width={112} height={84} unoptimized className="h-[84px] w-28 object-cover" />
                      </a>
                    ) : null;
                  })}
                </div>
              </section>
              {(selectedServices.length > 0 || selectedProcesses.length > 0) ? (
                <ul className="mt-4 space-y-2 border-t border-[#edf0ec] pt-4 text-sm">
                  {selectedServices.map((item) => <li key={item.servicio_id} className="flex justify-between gap-4"><span>{serviceMap.get(item.servicio_id)?.nombre ?? "Servicio"}</span><span className="shrink-0 font-semibold">${formatAmount(item.precio_aplicado)}</span></li>)}
                  {selectedProcesses.map((item) => <li key={item.proceso_id} className="flex justify-between gap-4"><span>{processMap.get(item.proceso_id)?.nombre ?? "Proceso"}{item.descuento_porcentaje > 0 ? <span className="ml-2 text-xs text-forest">−{item.descuento_porcentaje}%</span> : null}</span><span className="shrink-0 font-semibold">{item.descuento_porcentaje > 0 ? <span className="mr-2 text-xs text-[#87928b] line-through">${formatAmount(item.precio_lista)}</span> : null}${formatAmount(item.precio_aplicado)}</span></li>)}
                </ul>
              ) : null}
              <form action={updateWorkOrderStateAction} className="mt-4 flex flex-col gap-3 border-t border-[#edf0ec] pt-4 sm:flex-row sm:items-end">
                <input type="hidden" name="id" value={order.id} />
                <label className="block flex-1 text-sm font-semibold text-[#414e47]">Estado de la orden
                  <select name="estado" aria-label={`Estado de OT-${order.numero_ot}`} defaultValue={order.estado ?? "recepcion"} className="form-input">{Object.entries(workOrderStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </label>
                <button type="submit" className="min-h-14 rounded-xl border border-[#cddbcf] px-6 text-base font-bold text-forest hover:bg-[#f2f7f1]">Guardar estado</button>
              </form>
            </article>
          );
        })}
        {orders?.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cdd6ce] bg-white px-5 py-10 text-center text-sm text-[#65716a]">No hay órdenes registradas.</div> : null}
      </section>
    </>
  );
}
