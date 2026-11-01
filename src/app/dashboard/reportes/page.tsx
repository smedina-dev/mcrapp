import Link from "next/link";
import { requireCatalogManager } from "@/lib/workshop";
import { formatAmount } from "@/lib/presentation";

const AR_OFFSET = "-03:00";
const dateTime = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

function isDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default async function MechanicReportPage({ searchParams }: { searchParams: { desde?: string; hasta?: string; mecanico?: string; filtro?: string } }) {
  const { supabase, workshop } = await requireCatalogManager();

  const todayAr = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const from = isDate(searchParams.desde) ? searchParams.desde : `${todayAr.slice(0, 8)}01`;
  const to = isDate(searchParams.hasta) ? searchParams.hasta : todayAr;
  const fromIso = new Date(`${from}T00:00:00${AR_OFFSET}`).toISOString();
  const toIso = new Date(new Date(`${to}T00:00:00${AR_OFFSET}`).getTime() + 24 * 3600 * 1000).toISOString();

  const [{ data: employees }, { data: orders }] = await Promise.all([
    supabase.from("empleado").select("id, nombre, apellido, email, rango, activo").eq("taller_id", workshop.id).order("nombre"),
    supabase.from("orden_trabajo").select("id, numero_ot, mecanico_id, estado, presupuesto_total, fecha_ingreso, fecha_cierre")
      .eq("taller_id", workshop.id).eq("recepcion_cerrada", true),
  ]);
  const orderIds = (orders ?? []).map((order) => order.id);
  const { data: doneItems } = orderIds.length
    ? await supabase.from("orden_trabajo_checklist")
      .select("orden_trabajo_id, proceso_id, mecanico_id, completado_at")
      .in("orden_trabajo_id", orderIds).eq("completado", true)
      .gte("completado_at", fromIso).lt("completado_at", toIso)
      .order("completado_at", { ascending: false })
    : { data: [] };
  const processIds = Array.from(new Set((doneItems ?? []).map((item) => item.proceso_id)));
  const { data: processes } = processIds.length
    ? await supabase.from("proceso_servicio").select("id, nombre").in("id", processIds)
    : { data: [] };

  const label = (employee: NonNullable<typeof employees>[number]) => [employee.nombre, employee.apellido].filter(Boolean).join(" ") || employee.email;
  const rows = [
    ...(employees ?? []).map((employee) => ({ id: employee.id as string | null, name: label(employee), rango: employee.rango, activo: employee.activo })),
    { id: null as string | null, name: "Sin mecánico asignado", rango: null, activo: true },
  ].map((row) => {
    const owned = (orders ?? []).filter((order) => (order.mecanico_id ?? null) === row.id && order.fecha_ingreso && order.fecha_ingreso >= fromIso && order.fecha_ingreso < toIso);
    const billedOrders = (orders ?? []).filter((order) => (order.mecanico_id ?? null) === row.id && order.estado === "entregado" && order.fecha_cierre && order.fecha_cierre >= fromIso && order.fecha_cierre < toIso);
    const billed = billedOrders.reduce((sum, order) => sum + Number(order.presupuesto_total ?? 0), 0);
    const done = (doneItems ?? []).filter((item) => {
      const order = orders?.find((candidate) => candidate.id === item.orden_trabajo_id);
      return (item.mecanico_id ?? order?.mecanico_id ?? null) === row.id;
    });
    return { ...row, owned, done, billed, billedCount: billedOrders.length };
  }).filter((row) => row.owned.length || row.done.length || row.billedCount);

  const selected = searchParams.mecanico;
  const filterId = searchParams.filtro ?? "";
  const filterOptions = rows.map((row) => ({ key: row.id ?? "sin", name: row.name }));
  const grandBilled = rows.reduce((sum, row) => sum + row.billed, 0);
  const grandBilledCount = rows.reduce((sum, row) => sum + row.billedCount, 0);
  const visibleRows = filterId ? rows.filter((row) => (row.id ?? "sin") === filterId) : rows;
  const filteredBilled = visibleRows.reduce((sum, row) => sum + row.billed, 0);
  const rangoLabels: Record<string, string> = { ayudante_mecanico: "Ayudante", embalador: "Embalador", mecanico: "Mecánico", mecanico_especializado: "Especializado", jefe_mecanicos: "Jefe de mecánicos" };

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Reporte por mecánico</h1>
        <p className="mt-1 text-sm text-[#65716a]">Órdenes asignadas y procesos realizados en el período. Un proceso cuenta para su mecánico propio o, si no tiene, para el de la orden.</p>
      </header>

      <form method="get" className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#e2e7e1] bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm font-semibold text-[#414e47]" htmlFor="rep-desde">Desde
          <input id="rep-desde" type="date" name="desde" defaultValue={from} className="form-input" />
        </label>
        <label className="block flex-1 text-sm font-semibold text-[#414e47]" htmlFor="rep-hasta">Hasta
          <input id="rep-hasta" type="date" name="hasta" defaultValue={to} className="form-input" />
        </label>
        <label className="block flex-1 text-sm font-semibold text-[#414e47]" htmlFor="rep-filtro">Mecánico
          <select id="rep-filtro" name="filtro" defaultValue={filterId} className="form-input">
            <option value="">Todos</option>
            {filterOptions.map((option) => <option key={option.key} value={option.key}>{option.name}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-14 rounded-xl bg-forest px-6 text-base font-bold text-white hover:bg-[#125840]">Ver reporte</button>
      </form>

      <section aria-label="Totales facturados" className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#e2e7e1] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Facturado por todos los mecánicos</p>
          <p className="mt-1 text-2xl font-bold text-forest">${formatAmount(grandBilled)}</p>
          <p className="text-xs text-[#748079]">{grandBilledCount} {grandBilledCount === 1 ? "orden entregada" : "órdenes entregadas"} en el período</p>
        </div>
        {filterId ? (
          <div className="rounded-2xl border border-[#cddbcf] bg-[#f2f7f1] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Facturado por {visibleRows[0]?.name ?? "el mecánico elegido"}</p>
            <p className="mt-1 text-2xl font-bold text-forest">${formatAmount(filteredBilled)}</p>
            <p className="text-xs text-[#748079]">{grandBilled > 0 ? `${Math.round((filteredBilled / grandBilled) * 100)}% del total` : "Sin facturación en el período"}</p>
          </div>
        ) : null}
      </section>
      <p className="-mt-2 mb-5 text-xs text-[#748079]">Facturado = órdenes entregadas con fecha de cierre dentro del período, atribuidas al mecánico responsable de la orden.</p>

      {visibleRows.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cdd6ce] bg-white px-5 py-10 text-center text-sm text-[#65716a]">No hay actividad registrada en este período.</div> : null}

      <div className="space-y-3">
        {visibleRows.map((row) => {
          const key = row.id ?? "sin";
          const open = selected === key;
          return (
            <section key={key} className="rounded-2xl border border-[#e2e7e1] bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                <div className="min-w-[12rem] flex-1">
                  <h2 className="text-lg font-bold text-ink">{row.name}</h2>
                  {row.rango ? <p className="text-xs text-[#748079]">{rangoLabels[row.rango] ?? row.rango}{row.activo ? "" : " · inactivo"}</p> : null}
                </div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Órdenes</p><p className="text-base font-bold text-ink">{row.owned.length}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Procesos hechos</p><p className="text-base font-bold text-forest">{row.done.length}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Facturado</p><p className="text-base font-bold text-forest">${formatAmount(row.billed)}</p></div>
                <Link scroll={false} href={`/dashboard/reportes?desde=${from}&hasta=${to}${filterId ? `&filtro=${filterId}` : ""}${open ? "" : `&mecanico=${key}`}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#cddbcf] px-5 text-sm font-bold text-forest hover:bg-[#f2f7f1]">{open ? "Ocultar detalle" : "Ver detalle"}</Link>
              </div>
              {open ? (
                <div className="grid gap-4 border-t border-[#edf0ec] p-4 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Procesos realizados</h3>
                    {row.done.length ? (
                      <ul className="mt-2 divide-y divide-[#edf0ec] text-sm">
                        {row.done.map((item) => (
                          <li key={`${item.orden_trabajo_id}-${item.proceso_id}`} className="flex items-center justify-between gap-3 py-2">
                            <span className="min-w-0"><span className="font-semibold text-ink">{processes?.find((process) => process.id === item.proceso_id)?.nombre ?? "Proceso"}</span> <Link href={`/dashboard/ordenes/${item.orden_trabajo_id}`} className="text-forest underline">OT-{orders?.find((order) => order.id === item.orden_trabajo_id)?.numero_ot}</Link></span>
                            <span className="shrink-0 text-xs text-[#748079]">{item.completado_at ? dateTime.format(new Date(item.completado_at)) : ""}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-sm text-[#65716a]">Sin procesos completados.</p>}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Órdenes asignadas</h3>
                    {row.owned.length ? (
                      <ul className="mt-2 divide-y divide-[#edf0ec] text-sm">
                        {row.owned.map((order) => (
                          <li key={order.id} className="flex items-center justify-between gap-3 py-2">
                            <Link href={`/dashboard/ordenes/${order.id}`} className="font-semibold text-forest underline">OT-{order.numero_ot}</Link>
                            <span className="text-xs text-[#748079]">{order.estado}</span>
                            <span className="font-semibold text-ink">${formatAmount(order.presupuesto_total)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-sm text-[#65716a]">Sin órdenes asignadas en el período.</p>}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
