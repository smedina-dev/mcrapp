import Link from "next/link";
import { notFound } from "next/navigation";
import { BicycleDetail } from "@/components/bicycle-management";
import { PriorityBadge } from "@/components/priority-badge";
import { canManageRestrictedStates, formatAmount, formatDate, workOrderStates } from "@/lib/presentation";
import { requireWorkshop } from "@/lib/workshop";

type BicycleDetailPageProps = {
  params: { id: string };
  searchParams: { error?: string; actualizado?: string; transferida?: string; q?: string };
};

export default async function BicycleDetailPage({ params, searchParams }: BicycleDetailPageProps) {
  const { supabase, workshop, accessRole } = await requireWorkshop();
  const { data: bicycleOrders } = await supabase.from("orden_trabajo")
    .select("id, numero_ot, estado, prioridad, presupuesto_total, fecha_ingreso, fecha_cierre")
    .eq("taller_id", workshop.id).eq("bicicleta_id", params.id)
    .or(canManageRestrictedStates(accessRole) ? "estado.not.is.null" : "estado.neq.listo")
    .order("created_at", { ascending: false }).limit(30);
  const [
    { data: bicycle, error: bicycleError },
    { data: customers, error: customersError },
    { data: ownershipHistory, error: historyError },
  ] = await Promise.all([
    supabase.from("bicicleta").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("cliente").select("id, nombre_completo, nombre, apellido, peso_kg")
      .eq("taller_id", workshop.id).order("nombre_completo"),
    supabase.from("bicicleta_historial_propietario")
      .select("id, bicicleta_id, cliente_anterior_id, cliente_nuevo_id, fecha_cambio")
      .eq("bicicleta_id", params.id).order("fecha_cambio", { ascending: false }),
  ]);
  if (bicycleError) throw new Error(`No se pudo cargar la bicicleta: ${bicycleError.message}`);
  if (customersError) throw new Error(`No se pudieron cargar los clientes: ${customersError.message}`);
  if (historyError) throw new Error(`No se pudo cargar el historial de propietarios: ${historyError.message}`);
  if (!bicycle || bicycle.taller_id !== workshop.id) notFound();

  const backHref = searchParams.q
    ? `/dashboard/bicicletas?q=${encodeURIComponent(searchParams.q)}`
    : "/dashboard/bicicletas";

  return (
    <>
      <Link href={backHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-forest hover:underline">← Volver a Bicicletas</Link>
      <header className="mb-6 mt-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Ficha de bicicleta</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{[bicycle.marca ?? bicycle.marca_modelo, bicycle.modelo].filter(Boolean).join(" ")}</h1>
        <p className="mt-2 text-base text-[#65716a]">{bicycle.cliente_id ? "Detalle, configuración y propietario." : "Bicicleta sin cliente asignado."}</p>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudieron guardar los cambios. Revisá los datos e intentá de nuevo.</p> : null}
      {searchParams.actualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Configuración de bicicleta actualizada.</p> : null}
      {searchParams.transferida ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Bicicleta transferida. Se reinició la configuración de suspensión para el nuevo propietario.</p> : null}
      <BicycleDetail bicycle={bicycle} customers={customers ?? []} ownershipHistory={ownershipHistory ?? []} />
            <section className="mt-6 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold text-ink">Historial de órdenes</h2>
              <ul className="mt-4 divide-y divide-[#edf0ec]">
                {(bicycleOrders ?? []).map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link href={`/dashboard/ordenes/${order.id}`} className="font-semibold text-ink hover:text-forest hover:underline">OT #{order.numero_ot} · {order.estado ? workOrderStates[order.estado] : "Sin estado"}</Link>
                      <p className="mt-1 text-sm text-[#65716a]">{formatDate(order.fecha_ingreso)}{order.fecha_cierre ? ` · Entregada ${formatDate(order.fecha_cierre)}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3"><PriorityBadge priority={order.prioridad} /><p className="text-sm font-bold text-forest">${formatAmount(order.presupuesto_total)}</p></div>
                  </li>
                ))}
              </ul>
              {!bicycleOrders?.length ? <p className="mt-3 text-sm text-[#65716a]">Esta bicicleta todavía no tiene órdenes.</p> : null}
            </section>    </>
  );
}
