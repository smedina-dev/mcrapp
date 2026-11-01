import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { respondOrderQueryAction } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { formatAmount, formatDate, workOrderStates } from "@/lib/presentation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seguimiento de tu bicicleta", robots: { index: false, follow: false } };

const clientStateLabels: Record<string, string> = {
  recepcion: "Recibida",
  en_proceso: "En proceso",
  espera_repuesto: "Esperando repuesto",
  para_control: "Control final",
  listo: "Lista para retirar",
  entregado: "Entregada",
};
const timeline = ["recepcion", "en_proceso", "para_control", "listo", "entregado"];

export default async function TrackingPage({ params, searchParams }: { params: { token: string }; searchParams: { respondida?: string; error?: string } }) {
  if (!/^[a-f0-9]{12}$|^[a-f0-9]{64}$/.test(params.token)) notFound();
  const admin = createAdminClient();
  const { data: order } = await admin.from("orden_trabajo")
    .select("id, numero_ot, taller_id, cliente_id, bicicleta_id, estado, presupuesto_total, margen_extra, fecha_ingreso, fecha_entrega_estimada")
    .or(`token_seguimiento.eq.${params.token},codigo_corto.eq.${params.token}`).maybeSingle();
  if (!order) notFound();
  if (order.estado === "entregado") {
    const [{ data: workshop }, { data: bicycle }] = await Promise.all([
      admin.from("taller").select("nombre, telefono").eq("id", order.taller_id).maybeSingle(),
      admin.from("bicicleta").select("marca_modelo").eq("id", order.bicicleta_id).maybeSingle(),
    ]);
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
        <div className="w-full rounded-2xl border border-[#e2e7e1] bg-white p-8 shadow-sm">
          <p className="text-5xl" aria-hidden="true">✅</p>
          <h1 className="mt-4 text-2xl font-bold text-ink">Tu bicicleta ya fue entregada</h1>
          <p className="mt-3 text-base text-[#56635c]">{bicycle?.marca_modelo ? `${bicycle.marca_modelo} · ` : ""}OT-{order.numero_ot}</p>
          <p className="mt-4 text-base text-[#56635c]">Este seguimiento ya no está disponible. ¡Gracias por confiar en {workshop?.nombre ?? "nosotros"}!</p>
          {workshop?.telefono ? <p className="mt-4 text-sm text-[#748079]">Consultas: {workshop.telefono}</p> : null}
        </div>
      </main>
    );
  }

  const [{ data: workshop }, { data: customer }, { data: bicycle }, { data: orderServices }, { data: orderProcesses }, { data: checklist }, { data: photos }, { data: queries }, { data: extras }] = await Promise.all([
    admin.from("taller").select("nombre, telefono").eq("id", order.taller_id).maybeSingle(),
    admin.from("cliente").select("nombre_completo").eq("id", order.cliente_id).maybeSingle(),
    admin.from("bicicleta").select("marca_modelo").eq("id", order.bicicleta_id).maybeSingle(),
    admin.from("orden_trabajo_servicio").select("servicio_id").eq("orden_trabajo_id", order.id),
    admin.from("orden_trabajo_proceso").select("proceso_id").eq("orden_trabajo_id", order.id),
    admin.from("orden_trabajo_checklist").select("proceso_id, completado").eq("orden_trabajo_id", order.id),
    admin.from("orden_trabajo_foto").select("id, proceso_id, ruta, descripcion, created_at").eq("orden_trabajo_id", order.id).eq("compartida", true).order("created_at", { ascending: false }),
    admin.from("orden_trabajo_consulta").select("id, mensaje, monto, estado, comentario_cliente, created_at, respondida_at").eq("orden_trabajo_id", order.id).order("created_at", { ascending: false }),
    admin.from("orden_trabajo_extra").select("id, descripcion, monto").eq("orden_trabajo_id", order.id).order("created_at"),
  ]);

  const serviceIds = (orderServices ?? []).map((item) => item.servicio_id);
  const { data: links } = serviceIds.length
    ? await admin.from("servicio_proceso").select("proceso_id").in("servicio_id", serviceIds)
    : { data: [] };
  const processIds = new Set([...(orderProcesses ?? []).map((item) => item.proceso_id), ...(links ?? []).map((item) => item.proceso_id)]);
  const doneCount = (checklist ?? []).filter((row) => row.completado && processIds.has(row.proceso_id)).length;
  const progress = processIds.size ? Math.round((doneCount / processIds.size) * 100) : 0;

  const { data: serviceRows } = serviceIds.length
    ? await admin.from("servicio").select("nombre").in("id", serviceIds)
    : { data: [] };

  const paths = (photos ?? []).map((photo) => photo.ruta);
  const { data: signed } = paths.length ? await admin.storage.from("ordenes-trabajo").createSignedUrls(paths, 3600) : { data: [] };
  const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));

  const state = order.estado ?? "recepcion";
  const stateIndex = timeline.indexOf(state === "espera_repuesto" ? "en_proceso" : state);
  const extrasTotal = (extras ?? []).reduce((sum, item) => sum + Number(item.monto), 0);
  const authorized = (queries ?? []).filter((query) => query.estado === "autorizada").reduce((sum, query) => sum + Number(query.monto ?? 0), 0);
  const margin = Number(order.margen_extra);
  const pending = (queries ?? []).filter((query) => query.estado === "pendiente");
  const answered = (queries ?? []).filter((query) => query.estado !== "pendiente");

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-4 bg-[#f6f8f5] px-4 py-6">
      <AutoRefresh seconds={30} />
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">{workshop?.nombre ?? "Taller"}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Hola {customer?.nombre_completo?.split(" ")[0] ?? ""}, así va tu bicicleta</h1>
        <p className="mt-1 text-sm text-[#65716a]">{bicycle?.marca_modelo ?? "Bicicleta"} · OT-{order.numero_ot}. Esta página se actualiza sola.</p>
      </header>

      {searchParams.respondida ? <p role="status" className="rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">¡Gracias! Recibimos tu respuesta.</p> : null}

      {pending.map((query) => (
        <section key={query.id} className="rounded-2xl border-2 border-[#f2c200] bg-[#fffbe6] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6b5400]">El taller necesita tu respuesta</p>
          <p className="mt-2 whitespace-pre-wrap text-base text-ink">{query.mensaje}</p>
          {query.monto !== null ? <p className="mt-2 text-lg font-bold text-ink">Costo adicional: ${formatAmount(Number(query.monto))}</p> : null}
          <form action={respondOrderQueryAction} className="mt-4 space-y-3">
            <input type="hidden" name="token" value={params.token} />
            <input type="hidden" name="consulta_id" value={query.id} />
            <label className="block text-sm font-semibold text-[#414e47]">Comentario (opcional)
              <textarea name="comentario" maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border border-[#cddbcf] bg-white p-3 text-base" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button type="submit" name="decision" value="autorizada" className="min-h-14 rounded-xl bg-forest text-base font-bold text-white">Autorizo</button>
              <button type="submit" name="decision" value="rechazada" className="min-h-14 rounded-xl border-2 border-[#cddbcf] bg-white text-base font-bold text-[#853321]">No autorizo</button>
            </div>
          </form>
        </section>
      ))}

      <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[#87928b]">Estado actual</p>
        <p className="mt-1 text-2xl font-bold text-forest">{clientStateLabels[state] ?? workOrderStates[state]}</p>
        <ol className="mt-4 flex gap-1" aria-label="Etapas">
          {timeline.map((step, index) => (
            <li key={step} className="flex-1">
              <div className={`h-2 rounded-full ${index <= stateIndex ? "bg-forest" : "bg-[#e2e7e1]"}`} />
              <p className={`mt-1 text-[11px] leading-tight ${index === stateIndex ? "font-bold text-forest" : "text-[#87928b]"}`}>{clientStateLabels[step]}</p>
            </li>
          ))}
        </ol>
        {processIds.size ? (
          <div className="mt-5">
            <div className="flex justify-between text-sm"><span className="font-semibold text-[#414e47]">Avance del trabajo</span><span className="font-bold text-forest">{doneCount} de {processIds.size}</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#e2e7e1]"><div className="h-full rounded-full bg-forest" style={{ width: `${progress}%` }} /></div>
          </div>
        ) : null}
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf0ec] pt-4 text-sm">
          <div><dt className="text-xs font-semibold uppercase text-[#87928b]">Ingreso</dt><dd>{formatDate(order.fecha_ingreso)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[#87928b]">Entrega estimada</dt><dd>{formatDate(order.fecha_entrega_estimada)}</dd></div>
          {serviceRows?.length ? <div className="col-span-2"><dt className="text-xs font-semibold uppercase text-[#87928b]">Servicios</dt><dd>{serviceRows.map((service) => service.nombre).join(" · ")}</dd></div> : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-ink">Presupuesto</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Presupuesto original</dt><dd className="font-bold">${formatAmount(Number(order.presupuesto_total))}</dd></div>
          <div className="flex justify-between"><dt>Margen autorizado para extras</dt><dd className="font-bold">${formatAmount(margin + authorized)}</dd></div>
          <div className="flex justify-between"><dt>Extras usados</dt><dd className="font-bold">${formatAmount(extrasTotal)}</dd></div>
        </dl>
        {extras?.length ? (
          <ul className="mt-3 space-y-1 border-t border-[#edf0ec] pt-3 text-sm text-[#414e47]">
            {extras.map((extra) => <li key={extra.id} className="flex justify-between gap-3"><span>{extra.descripcion}</span><span className="font-semibold">${formatAmount(Number(extra.monto))}</span></li>)}
          </ul>
        ) : null}
      </section>

      {photos?.length ? (
        <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-ink">Fotos del trabajo</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {photos.map((photo) => {
              const url = urlByPath.get(photo.ruta);
              return url ? (
                <li key={photo.id} className="overflow-hidden rounded-xl border border-[#e2e7e1]">
                  <Image src={url} alt={photo.descripcion} width={400} height={300} unoptimized className="h-36 w-full object-cover" />
                  <p className="p-2 text-xs text-[#414e47]">{photo.descripcion}</p>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      ) : null}

      {answered.length ? (
        <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-ink">Consultas respondidas</h2>
          <ul className="mt-3 divide-y divide-[#edf0ec] text-sm">
            {answered.map((query) => (
              <li key={query.id} className="py-2">
                <p className="text-[#414e47]">{query.mensaje}</p>
                <p className={`mt-1 font-bold ${query.estado === "autorizada" ? "text-forest" : "text-[#853321]"}`}>{query.estado === "autorizada" ? "Autorizaste" : "No autorizaste"} · {formatDate(query.respondida_at)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {workshop?.telefono ? <p className="pb-4 text-center text-sm text-[#65716a]">¿Dudas? Contactanos al {workshop.telefono}</p> : null}
    </main>
  );
}
