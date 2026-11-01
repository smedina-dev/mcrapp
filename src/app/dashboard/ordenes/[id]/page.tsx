import Link from "next/link";
import { notFound } from "next/navigation";
import { assignMechanicAction, updateWorkOrderStateAction } from "@/app/actions";
import { ChecklistToggle } from "@/components/checklist-toggle";
import { ProcessMechanicSelect } from "@/components/process-mechanic-select";
import QRCode from "qrcode";
import { OrderTrackingPanel } from "@/components/order-tracking-panel";
import { trackingUrl } from "@/lib/tracking";
import { PriorityBadge } from "@/components/priority-badge";
import { assignableOrderStates, canManageRestrictedStates, formatAmount, formatDate, isOrderStateRestricted, workOrderStates } from "@/lib/presentation";
import { requireWorkshop } from "@/lib/workshop";

export default async function WorkOrderDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; seguimiento?: string; consulta?: string; extra?: string; margen?: string } }) {
  const { supabase, workshop, accessRole } = await requireWorkshop();
  const { data: order } = await supabase.from("orden_trabajo")
    .select("id, numero_ot, cliente_id, bicicleta_id, estado, es_express, prioridad, presupuesto_total, fotos, mecanico_id, margen_extra, codigo_corto, seguimiento_enviado_at, fecha_ingreso, fecha_entrega_estimada")
    .eq("id", params.id).eq("taller_id", workshop.id).maybeSingle();
  if (!order) notFound();
  const isManager = canManageRestrictedStates(accessRole);
  if (!isManager && order.estado === "listo") notFound();
  const canEditState = isManager || !isOrderStateRestricted(order.estado);

  const [{ data: customer }, { data: bicycle }, { data: orderServices }, { data: orderProcesses }] = await Promise.all([
    supabase.from("cliente").select("nombre_completo, email, telefono").eq("id", order.cliente_id).eq("taller_id", workshop.id).maybeSingle(),
    supabase.from("bicicleta").select("marca_modelo").eq("id", order.bicicleta_id).maybeSingle(),
    supabase.from("orden_trabajo_servicio").select("servicio_id, precio_aplicado").eq("orden_trabajo_id", order.id),
    supabase.from("orden_trabajo_proceso").select("proceso_id, precio_aplicado").eq("orden_trabajo_id", order.id),
  ]);
  const serviceIds = (orderServices ?? []).map((item) => item.servicio_id);
  const processIds = (orderProcesses ?? []).map((item) => item.proceso_id);
  const [{ data: serviceLinks }, { data: checklistRows }] = await Promise.all([
    serviceIds.length ? supabase.from("servicio_proceso").select("servicio_id, proceso_id").in("servicio_id", serviceIds) : Promise.resolve({ data: [] }),
    supabase.from("orden_trabajo_checklist").select("proceso_id, completado, completado_at, mecanico_id").eq("orden_trabajo_id", order.id),
  ]);
  const checklistProcessIds = Array.from(new Set([...processIds, ...(serviceLinks ?? []).map((link) => link.proceso_id)]));
  const [{ data: services }, { data: processes }] = await Promise.all([
    serviceIds.length ? supabase.from("servicio").select("id, nombre, guia_proceso").in("id", serviceIds) : Promise.resolve({ data: [] }),
    checklistProcessIds.length ? supabase.from("proceso_servicio").select("id, nombre, guia_proceso").in("id", checklistProcessIds) : Promise.resolve({ data: [] }),
  ]);
  const checklist = checklistProcessIds
    .map((processId) => {
      const row = (checklistRows ?? []).find((candidate) => candidate.proceso_id === processId);
      return {
        id: processId,
        nombre: processes?.find((candidate) => candidate.id === processId)?.nombre ?? "Proceso",
        guia: processes?.find((candidate) => candidate.id === processId)?.guia_proceso ?? null,
        completado: row?.completado ?? false,
        completado_at: row?.completado_at ?? null,
        mecanico_id: row?.mecanico_id ?? "",
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const completedCount = checklist.filter((item) => item.completado).length;
  const serviceNames = (orderServices ?? [])
    .map((item) => services?.find((candidate) => candidate.id === item.servicio_id)?.nombre)
    .filter((name): name is string => Boolean(name));
  const [{ data: extras }, { data: queries }] = await Promise.all([
    supabase.from("orden_trabajo_extra").select("id, descripcion, monto").eq("orden_trabajo_id", order.id).order("created_at"),
    supabase.from("orden_trabajo_consulta").select("id, mensaje, monto, estado, comentario_cliente, created_at, respondida_at").eq("orden_trabajo_id", order.id).order("created_at", { ascending: false }),
  ]);
  const qrDataUrl = await QRCode.toDataURL(trackingUrl(order.codigo_corto), { width: 440, margin: 2 });
  const { count: photoCount } = await supabase.from("orden_trabajo_foto")
    .select("id", { count: "exact", head: true }).eq("orden_trabajo_id", order.id);
  const intakePhotoCount = Array.isArray(order.fotos) ? order.fotos.length : 0;
  const { data: employees } = await supabase.from("empleado")
    .select("id, nombre, apellido, email, rango")
    .eq("taller_id", workshop.id).eq("activo", true).order("nombre");
  const mechanicOptions = (employees ?? []).map((employee) => ({
    id: employee.id,
    label: [employee.nombre, employee.apellido].filter(Boolean).join(" ") || employee.email,
    rango: employee.rango,
  }));
  const mechanicName = (id: string | null) => mechanicOptions.find((option) => option.id === id)?.label ?? "Sin asignar";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/dashboard/ordenes" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#cddbcf] bg-white px-5 text-base font-bold text-forest shadow-sm transition hover:bg-[#f2f7f1]"><span aria-hidden="true">←</span> Volver a órdenes</Link>
        {order.prioridad && order.prioridad !== "normal" ? <PriorityBadge priority={order.prioridad} className="px-3 py-1 text-xs" /> : null}
      </div>

      <section className="mt-3 rounded-2xl border border-[#e2e7e1] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-ink">OT-{order.numero_ot} <span className="font-normal text-[#65716a]">· {customer?.nombre_completo ?? "Cliente"} · {bicycle?.marca_modelo ?? "Bicicleta"}</span></h1>
          </div>
          {canEditState ? <form action={updateWorkOrderStateAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="volver" value="detalle" />
            <label className="sr-only" htmlFor="order-state">Estado de la orden</label>
            <select id="order-state" name="estado" defaultValue={order.estado ?? "recepcion"} className="min-h-12 rounded-xl border border-[#cddbcf] bg-white px-3 text-base font-semibold text-forest">{assignableOrderStates(accessRole).map((value) => <option key={value} value={value}>{workOrderStates[value]}</option>)}</select>
            <button type="submit" className="min-h-12 rounded-xl bg-forest px-5 text-base font-bold text-white hover:bg-[#125840]">Guardar</button>
          </form> : <p className="rounded-xl bg-[#f2f7f1] px-4 py-3 text-sm font-bold text-forest">{workOrderStates[order.estado ?? "recepcion"]} · solo lectura</p>}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#edf0ec] pt-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Ingreso</dt><dd className="text-[#414e47]">{formatDate(order.fecha_ingreso)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Entrega</dt><dd className="text-[#414e47]">{formatDate(order.fecha_entrega_estimada)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Total</dt><dd className="font-bold text-ink">${formatAmount(order.presupuesto_total)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Mecánico</dt><dd className="text-[#414e47]">{mechanicName(order.mecanico_id)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Avance</dt><dd className="font-semibold text-forest">{completedCount} de {checklist.length}</dd></div>
        </dl>
        {serviceNames.length ? (
          <p className="mt-3 border-t border-[#edf0ec] pt-3 text-sm"><span className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Servicios</span> <span className="font-semibold text-ink">{serviceNames.join(" · ")}</span></p>
        ) : null}
      </section>

      <section className="mt-5 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-ink">Mecánico responsable</h2>
        {searchParams.error === "mecanico" ? <p role="alert" className="mt-3 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo asignar el mecánico. Verificá que la migración 20261031000300_order_mechanics.sql esté aplicada en Supabase.</p> : null}
        <form action={assignMechanicAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="orden_id" value={order.id} />
          <input type="hidden" name="proceso_id" value="" />
          <label className="block flex-1 text-sm font-semibold text-[#414e47]">Asignado a
            <select name="mecanico_id" defaultValue={order.mecanico_id ?? ""} className="form-input">
              <option value="">Sin asignar</option>
              {mechanicOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <button type="submit" className="min-h-14 rounded-xl border border-[#cddbcf] px-6 text-base font-bold text-forest hover:bg-[#f2f7f1]">Guardar mecánico</button>
        </form>
      </section>

      <section className="mt-5 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">Checklist de procesos</h2>
          <p className="text-sm font-semibold text-[#65716a]">{completedCount} de {checklist.length} realizados</p>
        </div>
        {searchParams.error === "checklist" ? <p role="alert" className="mt-3 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo guardar el avance. Verificá que la migración del checklist esté aplicada en Supabase.</p> : null}
        {checklist.length ? (
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="rounded-xl border border-[#e2e7e1] p-2">
                <ChecklistToggle orderId={order.id} processId={item.id} name={item.nombre} initialDone={item.completado} initialDoneAt={item.completado_at} />
                <ProcessMechanicSelect orderId={order.id} processId={item.id} processName={item.nombre} currentId={item.mecanico_id} emptyLabel={`Mismo de la orden (${mechanicName(order.mecanico_id)})`} options={mechanicOptions} />
                {item.guia ? (
                  <details className="group mx-3 mb-2 mt-1 rounded-xl border border-[#e2e7e1] bg-[#fafbf9]">
                    <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-sm font-bold text-forest [&::-webkit-details-marker]:hidden">
                      Guía del proceso
                      <span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="whitespace-pre-wrap border-t border-[#edf0ec] px-4 py-3 text-sm text-[#414e47]">{item.guia}</p>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-[#65716a]">Esta orden no tiene procesos para marcar.</p>}
      </section>

      <OrderTrackingPanel
        order={order}
        customer={customer}
        workshopName={workshop.nombre}
        qrDataUrl={qrDataUrl}
        extras={extras ?? []}
        queries={queries ?? []}
        flash={searchParams}
      />

      <section className="mt-5 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-ink">Fotos</h2>
        <p className="mt-1 text-sm text-[#65716a]">{intakePhotoCount} de ingreso · {photoCount ?? 0} de procesos</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Link href={`/dashboard/ordenes/${order.id}/fotos`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#cddbcf] px-5 text-base font-bold text-forest hover:bg-[#f2f7f1]">Registro de fotos</Link>
          <Link href={`/dashboard/ordenes/${order.id}/fotos/nueva`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-5 text-base font-bold text-white hover:bg-[#125840]">+ Agregar foto del proceso</Link>
        </div>
      </section>
    </>
  );
}
