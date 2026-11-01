import Image from "next/image";
import Link from "next/link";
import { updateWorkOrderStateAction } from "@/app/actions";
import { assignableOrderStates, canManageRestrictedStates, comparePriority, formatAmount, formatDate, workOrderPriorities, workOrderPriorityOrder, workOrderStates, type WorkOrderState } from "@/lib/presentation";
import { PriorityBadge } from "@/components/priority-badge";
import { WorkOrderListItem } from "@/components/work-order-list-item";
import { requireWorkshop } from "@/lib/workshop";

type WorkOrdersPageProps = { searchParams: { error?: string; actualizado?: string; creado?: string; estado?: string; prioridad?: string } };

export default async function WorkOrdersPage({ searchParams }: WorkOrdersPageProps) {
  const { supabase, workshop, accessRole } = await requireWorkshop();
  const isManager = canManageRestrictedStates(accessRole);
  const visibleStates = (Object.keys(workOrderStates) as WorkOrderState[]).filter((state) => state !== "entregado" && (isManager || state !== "listo"));
  const stateFilter = visibleStates.find((state) => state === searchParams.estado);
  const priorityFilter = workOrderPriorityOrder.find((priority) => priority === searchParams.prioridad);
  const filterHref = (estado: string | undefined, prioridad: string | undefined) => {
    const query = new URLSearchParams();
    if (estado) query.set("estado", estado);
    if (prioridad) query.set("prioridad", prioridad);
    const text = query.toString();
    return `/dashboard/ordenes${text ? `?${text}` : ""}`;
  };
  const [
    { data: rawOrders },
    { data: services },
    { data: processes },
    { data: orderServices },
    { data: orderProcesses },
  ] = await Promise.all([
    supabase.from("orden_trabajo").select("id, numero_ot, cliente_id, bicicleta_id, estado, es_express, prioridad, presupuesto_total, mecanico_id, inspeccion_recepcion, fotos, recepcion_cerrada, fecha_ingreso, fecha_entrega_estimada")
      .eq("taller_id", workshop.id).eq("recepcion_cerrada", true)
      .neq("estado", "entregado")
      .neq("estado", isManager ? "entregado" : "listo")
      .order("created_at", { ascending: false }),
    supabase.from("servicio").select("id, nombre").eq("taller_id", workshop.id),
    supabase.from("proceso_servicio").select("id, nombre").eq("taller_id", workshop.id),
    supabase.from("orden_trabajo_servicio").select("orden_trabajo_id, servicio_id, precio_aplicado"),
    supabase.from("orden_trabajo_proceso").select("orden_trabajo_id, proceso_id, precio_lista, descuento_porcentaje, precio_aplicado"),
  ]);

  const orders = (rawOrders ?? [])
    .filter((order) => !priorityFilter || order.prioridad === priorityFilter)
    .filter((order) => !stateFilter || order.estado === stateFilter)
    .sort((a, b) => comparePriority(a.prioridad, b.prioridad));
  const customerIds = Array.from(new Set((orders ?? []).map((order) => order.cliente_id)));
  const orderBicycleIds = Array.from(new Set((orders ?? []).map((order) => order.bicicleta_id)));
  const [{ data: customers }, { data: bicycles }, { data: employees }] = await Promise.all([
    customerIds.length
      ? supabase.from("cliente").select("id, nombre_completo, peso_kg").eq("taller_id", workshop.id).in("id", customerIds)
      : Promise.resolve({ data: [] }),
    orderBicycleIds.length
      ? supabase.from("bicicleta").select("id, cliente_id, marca_modelo, tiene_shock").in("id", orderBicycleIds)
      : Promise.resolve({ data: [] }),
    supabase.from("empleado").select("id, nombre, apellido, email").eq("taller_id", workshop.id),
  ]);
  const mechanicLabel = (id: string | null) => {
    const employee = employees?.find((candidate) => candidate.id === id);
    return employee ? [employee.nombre, employee.apellido].filter(Boolean).join(" ") || employee.email : null;
  };

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

  const serviceMap = new Map((services ?? []).map((service) => [service.id, service]));
  const processMap = new Map((processes ?? []).map((process) => [process.id, process]));
  const orderServiceMap = new Map<string, typeof orderServices>();
  for (const item of orderServices ?? []) {
    orderServiceMap.set(item.orden_trabajo_id, [...(orderServiceMap.get(item.orden_trabajo_id) ?? []), item]);
  }
  const orderProcessMap = new Map<string, typeof orderProcesses>();
  for (const item of orderProcesses ?? []) {
    orderProcessMap.set(item.orden_trabajo_id, [...(orderProcessMap.get(item.orden_trabajo_id) ?? []), item]);
  }
  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Taller</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Órdenes de trabajo</h1>
        <p className="mt-2 text-base text-[#65716a]">Seguimiento y entrega de bicicletas recibidas.</p>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{searchParams.error === "permisos" ? "Solo el administrador o el jefe de taller pueden usar los estados Listo y Entregado." : searchParams.error === "estado" ? "No se pudo actualizar el estado de la orden. Revisá los datos e intentá nuevamente." : "No se pudieron validar los datos de la orden. Revisá los campos e intentá nuevamente."}</p> : null}
      {searchParams.actualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Orden actualizada.</p> : null}
      {searchParams.creado ? (
        <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">
          {searchParams.creado === "express"
            ? "Orden EXPRESS creada y destacada para dar prioridad al mecánico."
            : "Recepción cerrada; la orden quedó completa para el mecánico."}
        </p>
      ) : null}

      <section aria-label="Órdenes registradas" className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div><h2 className="text-xl font-bold text-ink">Órdenes registradas</h2><p className="mt-1 text-sm text-[#748079]">{orders.length} en total</p></div>
          <Link href="/dashboard/recepcion" className="inline-flex min-h-11 items-center rounded-xl bg-forest px-4 text-sm font-bold text-white hover:bg-[#125840]">Nueva recepción</Link>
        </div>
        <div className="space-y-2 rounded-2xl border border-[#e2e7e1] bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
            <span className="w-20 text-xs font-bold uppercase tracking-wide text-[#87928b]">Estado</span>
            <Link href={filterHref(undefined, priorityFilter)} aria-current={!stateFilter ? "true" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${!stateFilter ? "border-forest bg-forest text-white" : "border-[#cddbcf] text-forest hover:bg-[#f2f7f1]"}`}>Todos</Link>
            {visibleStates.map((state) => (
              <Link key={state} href={filterHref(state, priorityFilter)} aria-current={stateFilter === state ? "true" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${stateFilter === state ? "border-forest bg-forest text-white" : "border-[#cddbcf] text-forest hover:bg-[#f2f7f1]"}`}>{workOrderStates[state]}</Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por prioridad">
            <span className="w-20 text-xs font-bold uppercase tracking-wide text-[#87928b]">Prioridad</span>
            <Link href={filterHref(stateFilter, undefined)} aria-current={!priorityFilter ? "true" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${!priorityFilter ? "border-forest bg-forest text-white" : "border-[#cddbcf] text-forest hover:bg-[#f2f7f1]"}`}>Todas</Link>
            {workOrderPriorityOrder.map((priority) => (
              <Link key={priority} href={filterHref(stateFilter, priority)} aria-current={priorityFilter === priority ? "true" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-bold ${priorityFilter === priority ? workOrderPriorities[priority].selected : "border-[#e2e7e1] text-[#56635c] hover:bg-[#fafbf9]"}`}><span aria-hidden="true" className={`h-3 w-3 rounded-full ${workOrderPriorities[priority].dot}`} />{workOrderPriorities[priority].label}</Link>
            ))}
          </div>
        </div>
        {!orders.length ? (
          <p className="rounded-2xl border border-dashed border-[#cdd6ce] bg-white p-6 text-sm text-[#65716a]">
            {stateFilter || priorityFilter ? "No hay órdenes con ese filtro." : "Todavía no hay órdenes activas."} Las órdenes entregadas están en el historial del cliente o de la bicicleta.
          </p>
        ) : null}
        {orders.map((order) => {
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
          const customServiceRecord = receptionInspection?.servicio_personalizado
            && typeof receptionInspection.servicio_personalizado === "object"
            && !Array.isArray(receptionInspection.servicio_personalizado)
            ? receptionInspection.servicio_personalizado as { nombre?: unknown; precio?: unknown }
            : null;
          const customServiceName = typeof customServiceRecord?.nombre === "string"
            ? customServiceRecord.nombre
            : null;
          const customServicePrice = typeof customServiceRecord?.precio === "number"
            ? customServiceRecord.precio
            : null;
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
            <WorkOrderListItem
              key={order.id}
              orderId={order.id}
              orderLabel={`OT-${order.numero_ot}`}
              summary={(
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="min-w-[7rem]">
                    <h3 className="text-lg font-bold text-ink">OT-{order.numero_ot}</h3>
                    {order.prioridad && order.prioridad !== "normal" ? <PriorityBadge priority={order.prioridad} className="mt-1" /> : null}
                  </div>
                  <div className="min-w-[9rem]"><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Cliente</p><p className="font-semibold text-ink">{customers?.find((customer) => customer.id === order.cliente_id)?.nombre_completo ?? "Cliente"}</p></div>
                  <div className="min-w-[9rem]"><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Bicicleta</p><p className="font-semibold text-ink">{bicycles?.find((bicycle) => bicycle.id === order.bicicleta_id)?.marca_modelo ?? "Bicicleta"}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Mecánico</p><p className={`text-sm font-semibold ${order.mecanico_id ? "text-ink" : "text-[#87928b]"}`}>{mechanicLabel(order.mecanico_id) ?? "Sin asignar"}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Estado</p><p className="text-sm font-semibold text-forest">{workOrderStates[order.estado ?? "recepcion"]}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Entrega est.</p><p className="text-sm text-[#414e47]">{formatDate(order.fecha_entrega_estimada)}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Total</p><p className="text-sm font-bold text-ink">${formatAmount(order.presupuesto_total)}</p></div>
                </div>
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2">
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
              {(selectedServices.length > 0 || selectedProcesses.length > 0 || customServiceName) ? (
                <ul className="mt-4 space-y-2 border-t border-[#edf0ec] pt-4 text-sm">
                  {selectedServices.map((item) => <li key={item.servicio_id} className="flex justify-between gap-4"><span>{serviceMap.get(item.servicio_id)?.nombre ?? "Servicio"}</span><span className="shrink-0 font-semibold">${formatAmount(item.precio_aplicado)}</span></li>)}
                  {selectedProcesses.map((item) => <li key={item.proceso_id} className="flex justify-between gap-4"><span>{processMap.get(item.proceso_id)?.nombre ?? "Proceso"}{item.descuento_porcentaje > 0 ? <span className="ml-2 text-xs text-forest">−{item.descuento_porcentaje}%</span> : null}</span><span className="shrink-0 font-semibold">{item.descuento_porcentaje > 0 ? <span className="mr-2 text-xs text-[#87928b] line-through">${formatAmount(item.precio_lista)}</span> : null}${formatAmount(item.precio_aplicado)}</span></li>)}
                  {customServiceName ? <li className="flex justify-between gap-4"><span>{customServiceName} <span className="text-xs font-bold text-[#805f22]">PERSONALIZADO</span></span><span className="shrink-0 font-semibold">${formatAmount(customServicePrice ?? 0)}</span></li> : null}
                </ul>
              ) : null}
              <form action={updateWorkOrderStateAction} className="mt-4 flex flex-col gap-3 border-t border-[#edf0ec] pt-4 sm:flex-row sm:items-end">
                <input type="hidden" name="id" value={order.id} />
                <label className="block flex-1 text-sm font-semibold text-[#414e47]">Estado de la orden
                  <select name="estado" aria-label={`Estado de OT-${order.numero_ot}`} defaultValue={order.estado ?? "recepcion"} className="form-input">{assignableOrderStates(accessRole).map((value) => <option key={value} value={value}>{workOrderStates[value]}</option>)}</select>
                </label>
                <button type="submit" className="min-h-14 rounded-xl border border-[#cddbcf] px-6 text-base font-bold text-forest hover:bg-[#f2f7f1]">Guardar estado</button>
              </form>
            </WorkOrderListItem>
          );
        })}
      </section>
    </>
  );
}
