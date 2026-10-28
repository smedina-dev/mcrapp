import Link from "next/link";
import { ArrowUpRight, Bike, CalendarDays, ClipboardList, Wrench } from "lucide-react";
import { formatDate, workOrderStates } from "@/lib/presentation";
import { requireWorkshop } from "@/lib/workshop";

export default async function DashboardPage() {
  const { supabase, workshop, displayName } = await requireWorkshop();
  const now = new Date().toISOString();
  const [customers, appointments, openOrders, services, recentOrders] = await Promise.all([
    supabase.from("cliente").select("id", { count: "exact", head: true }).eq("taller_id", workshop.id),
    supabase.from("agenda_turno").select("id", { count: "exact", head: true })
      .eq("taller_id", workshop.id).gte("fecha_hora", now).neq("estado", "cancelado"),
    supabase.from("orden_trabajo").select("id", { count: "exact", head: true })
      .eq("taller_id", workshop.id).neq("estado", "entregado"),
    supabase.from("servicio").select("id", { count: "exact", head: true }).eq("taller_id", workshop.id),
    supabase.from("orden_trabajo")
      .select("id, numero_ot, estado, fecha_ingreso, es_express")
      .eq("taller_id", workshop.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const metrics = [
    { label: "Clientes", count: customers.count ?? 0, icon: Bike, href: "/dashboard/clientes", detail: "en tu cartera" },
    { label: "Turnos próximos", count: appointments.count ?? 0, icon: CalendarDays, href: "/dashboard/agenda", detail: "pendientes y confirmados" },
    { label: "Órdenes abiertas", count: openOrders.count ?? 0, icon: ClipboardList, href: "/dashboard/ordenes", detail: "sin entregar" },
    { label: "Servicios", count: services.count ?? 0, icon: Wrench, href: "/dashboard/servicios", detail: "en el catálogo" },
  ];

  return (
    <>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#111111] p-6 text-white sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c8c8c8]">Resumen del taller</p>
          <h1 className="mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl">Buen día, {displayName}</h1>
          <p className="mt-2 text-sm text-[#d4dfd8]">Este es el estado de tu operación.</p>
        </div>
        <Link href="/dashboard/recepcion" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#f2f2f2] px-5 py-3 text-sm font-bold text-[#111111] hover:bg-[#e5e5e5]">
          Nueva recepción <ArrowUpRight size={18} />
        </Link>
      </header>
      <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, count, icon: Icon, href, detail }) => (
          <Link key={label} href={href} className="group rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
            <div className="flex items-center justify-between text-[#65716a]"><span className="text-sm font-semibold">{label}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4eb]"><Icon size={20} className="text-forest" /></span></div>
            <p className="mt-4 text-4xl font-bold text-ink">{count}</p>
            <p className="mt-1 text-sm text-[#748079]">{detail}</p>
          </Link>
        ))}
      </section>
      <section className="mt-8 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-bold text-ink">Órdenes recientes</h2><p className="mt-1 text-sm text-[#748079]">Últimos ingresos registrados</p></div>
          <Link href="/dashboard/ordenes" className="text-sm font-semibold text-forest hover:underline">Ver todas</Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#e5e9e4] bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line bg-[#f0f3ed] text-xs uppercase tracking-wide text-[#65716a]"><tr><th className="px-4 py-3">Orden</th><th className="px-4 py-3">Ingreso</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Tipo</th></tr></thead>
            <tbody className="divide-y divide-line">
              {(recentOrders.data ?? []).map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-semibold text-ink">OT-{order.numero_ot}</td>
                  <td className="px-4 py-3 text-[#56635c]">{formatDate(order.fecha_ingreso)}</td>
                  <td className="px-4 py-3 text-[#56635c]">{order.estado ? workOrderStates[order.estado] : "Recepción"}</td>
                  <td className="px-4 py-3 text-[#56635c]">{order.es_express ? "Express" : "Estándar"}</td>
                </tr>
              ))}
              {recentOrders.data?.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[#748079]">Todavía no hay órdenes de trabajo.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}