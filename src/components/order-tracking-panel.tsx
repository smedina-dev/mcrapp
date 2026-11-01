import Link from "next/link";
import {
  addOrderExtraAction,
  createOrderQueryAction,
  deleteOrderExtraAction,
  sendTrackingAction,
  updateOrderMarginAction,
} from "@/app/actions";
import { formatAmount, formatDate } from "@/lib/presentation";
import { trackingMessage, trackingUrl, whatsappLink } from "@/lib/tracking";

type Props = {
  order: { id: string; numero_ot: number; codigo_corto: string; margen_extra: number; seguimiento_enviado_at: string | null };
  customer: { nombre_completo: string; email: string | null; telefono: string | null } | null;
  workshopName: string;
  qrDataUrl: string;
  extras: { id: string; descripcion: string; monto: number }[];
  queries: { id: string; mensaje: string; monto: number | null; estado: string; comentario_cliente: string | null; created_at: string; respondida_at: string | null }[];
  flash: { error?: string; seguimiento?: string; consulta?: string; extra?: string; margen?: string };
};

const deliveryMessages: Record<string, string> = {
  ok: "Email enviado al cliente.",
  "sin-email": "El cliente no tiene email cargado. Usá el botón de WhatsApp o copiá el link.",
  "sin-configurar": "El envío de emails no está configurado (falta RESEND_API_KEY). Usá WhatsApp o copiá el link.",
  error: "No se pudo enviar el email. Probá con WhatsApp o copiá el link.",
};
const errorMessages: Record<string, string> = {
  "margen-superado": "El gasto supera el margen autorizado. Enviá una consulta al cliente y, cuando la autorice, podrás cargarlo.",
  "margen-datos": "Revisá el monto del margen.",
  "extra-datos": "Revisá la descripción y el monto del gasto extra.",
  "consulta-datos": "Revisá el texto y el monto de la consulta.",
  migracion: "Falta aplicar la migración 20261101000200_customer_tracking_and_margin.sql en Supabase.",
};
const queryStyles: Record<string, string> = {
  pendiente: "bg-[#fff8d6] text-[#6b5400]",
  autorizada: "bg-[#e7f6ec] text-[#1c6b3c]",
  rechazada: "bg-[#fde8e8] text-[#9b1c1c]",
};

export function OrderTrackingPanel({ order, customer, workshopName, qrDataUrl, extras, queries, flash }: Props) {
  const url = trackingUrl(order.codigo_corto);
  const whatsapp = whatsappLink(customer?.telefono, trackingMessage(customer?.nombre_completo.split(" ")[0] ?? "", order.numero_ot, url, workshopName));
  const authorized = queries.filter((query) => query.estado === "autorizada").reduce((sum, query) => sum + Number(query.monto ?? 0), 0);
  const used = extras.reduce((sum, extra) => sum + Number(extra.monto), 0);
  const available = Number(order.margen_extra) + authorized - used;
  const notice = flash.seguimiento ?? flash.consulta;

  return (
    <details open={Boolean(notice || flash.error)} className="group mt-5 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-xl font-bold text-ink">
        Cliente: seguimiento y margen
        <span className="rounded-xl border border-[#cddbcf] px-4 py-2 text-base text-forest group-open:hidden">Abrir</span>
        <span className="hidden rounded-xl border border-[#cddbcf] px-4 py-2 text-base text-forest group-open:inline">Cerrar</span>
      </summary>
      {notice && deliveryMessages[notice] ? <p role="status" className="mt-3 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm text-forest">{flash.consulta ? "Consulta creada. " : ""}{deliveryMessages[notice]}</p> : null}
      {flash.error && errorMessages[flash.error] ? <p role="alert" className="mt-3 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{errorMessages[flash.error]}</p> : null}

      <div className="mt-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#87928b]">Link del cliente {order.seguimiento_enviado_at ? <span className="font-normal normal-case">· enviado {formatDate(order.seguimiento_enviado_at)}</span> : null}</p>
        <input readOnly value={url} aria-label="Link de seguimiento" className="form-input w-full text-sm" />
        <details className="group">
          <summary className="inline-flex min-h-12 cursor-pointer list-none items-center rounded-xl border border-[#cddbcf] px-5 text-base font-bold text-forest hover:bg-[#f2f7f1]">Mostrar código QR</summary>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`Código QR del seguimiento de OT-${order.numero_ot}`} width={220} height={220} className="rounded-xl border border-[#e2e7e1] bg-white p-2" />
            <div className="text-sm text-[#56635c]">
              <p>El cliente lo escanea con la cámara del celular.</p>
              <a href={qrDataUrl} download={`seguimiento-OT-${order.numero_ot}.png`} className="mt-2 inline-flex min-h-12 items-center rounded-xl bg-forest px-5 text-base font-bold text-white hover:bg-[#125840]">Descargar QR</a>
            </div>
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <form action={sendTrackingAction}>
            <input type="hidden" name="orden_id" value={order.id} />
            <button type="submit" className="min-h-12 rounded-xl bg-forest px-5 text-base font-bold text-white hover:bg-[#125840]">Enviar por email</button>
          </form>
          {whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-xl border border-[#cddbcf] px-5 text-base font-bold text-forest hover:bg-[#f2f7f1]">Enviar por WhatsApp</a> : <span className="inline-flex min-h-12 items-center text-sm text-[#748079]">Sin teléfono para WhatsApp</span>}
          <Link href={url} target="_blank" className="inline-flex min-h-12 items-center rounded-xl border border-[#cddbcf] px-5 text-base font-bold text-forest hover:bg-[#f2f7f1]">Ver como cliente</Link>
        </div>
      </div>

      <div className="mt-6 border-t border-[#edf0ec] pt-4">
        <h3 className="text-lg font-bold text-ink">Margen para gastos extra</h3>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs font-semibold uppercase text-[#87928b]">Margen inicial</dt><dd className="font-bold">${formatAmount(Number(order.margen_extra))}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[#87928b]">Autorizado por consulta</dt><dd className="font-bold">${formatAmount(authorized)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[#87928b]">Usado</dt><dd className="font-bold">${formatAmount(used)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[#87928b]">Disponible</dt><dd className={`font-bold ${available <= 0 ? "text-[#b42318]" : "text-forest"}`}>${formatAmount(available)}</dd></div>
        </dl>
        <form action={updateOrderMarginAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="orden_id" value={order.id} />
          <label className="text-sm font-semibold text-[#414e47]">Margen inicial ($)
            <input name="margen_extra" type="number" min="0" step="0.01" defaultValue={Number(order.margen_extra)} className="form-input" />
          </label>
          <button type="submit" className="min-h-12 rounded-xl border border-[#cddbcf] px-5 text-base font-bold text-forest hover:bg-[#f2f7f1]">Guardar margen</button>
        </form>

        {extras.length ? (
          <ul className="mt-4 divide-y divide-[#edf0ec] text-sm">
            {extras.map((extra) => (
              <li key={extra.id} className="flex items-center justify-between gap-3 py-2">
                <span>{extra.descripcion}</span>
                <span className="flex items-center gap-3">
                  <span className="font-bold">${formatAmount(Number(extra.monto))}</span>
                  <form action={deleteOrderExtraAction}><input type="hidden" name="orden_id" value={order.id} /><input type="hidden" name="id" value={extra.id} /><button type="submit" className="min-h-11 rounded-lg px-3 text-sm font-bold text-[#853321] hover:bg-[#fff7f5]">Quitar</button></form>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <details className="group mt-3">
          <summary className="inline-flex min-h-12 cursor-pointer list-none items-center rounded-xl border border-[#cddbcf] px-5 text-base font-bold text-forest hover:bg-[#f2f7f1]">+ Registrar gasto extra</summary>
          <form action={addOrderExtraAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
            <input type="hidden" name="orden_id" value={order.id} />
            <label className="text-sm font-semibold text-[#414e47]">Descripción<input name="descripcion" required maxLength={300} className="form-input" placeholder="Ej: cambio de cadena" /></label>
            <label className="text-sm font-semibold text-[#414e47]">Monto ($)<input name="monto" type="number" min="0" step="0.01" required className="form-input" /></label>
            <button type="submit" className="min-h-14 rounded-xl bg-forest px-6 text-base font-bold text-white hover:bg-[#125840]">Agregar</button>
          </form>
        </details>
      </div>

      <div className="mt-6 border-t border-[#edf0ec] pt-4">
        <h3 className="text-lg font-bold text-ink">Consultas al cliente</h3>
        {queries.length ? (
          <ul className="mt-3 space-y-2">
            {queries.map((query) => (
              <li key={query.id} className="rounded-xl border border-[#e2e7e1] p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase ${queryStyles[query.estado] ?? ""}`}>{query.estado}</span>
                  <span className="text-xs text-[#87928b]">{formatDate(query.created_at)}{query.respondida_at ? ` · respondida ${formatDate(query.respondida_at)}` : ""}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[#414e47]">{query.mensaje}</p>
                {query.monto !== null ? <p className="mt-1 font-bold">${formatAmount(Number(query.monto))}</p> : null}
                {query.comentario_cliente ? <p className="mt-1 italic text-[#56635c]">Cliente: “{query.comentario_cliente}”</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-[#65716a]">Todavía no hay consultas.</p>}
        <details className="group mt-3">
          <summary className="inline-flex min-h-12 cursor-pointer list-none items-center rounded-xl bg-forest px-5 text-base font-bold text-white hover:bg-[#125840]">+ Nueva consulta al cliente</summary>
          <form action={createOrderQueryAction} className="mt-3 space-y-3">
            <input type="hidden" name="orden_id" value={order.id} />
            <label className="block text-sm font-semibold text-[#414e47]">Consulta<textarea name="mensaje" required minLength={3} maxLength={1000} rows={3} className="form-input" placeholder="Ej: la cadena está muy desgastada, ¿autorizás cambiarla?" /></label>
            <label className="block text-sm font-semibold text-[#414e47] sm:max-w-xs">Costo adicional ($, opcional)<input name="monto" type="number" min="0" step="0.01" className="form-input" /></label>
            <button type="submit" className="min-h-14 rounded-xl bg-forest px-6 text-base font-bold text-white hover:bg-[#125840]">Enviar consulta</button>
            <p className="text-xs text-[#748079]">Se avisa por email si el cliente tiene uno cargado. También podés mandarle el link por WhatsApp.</p>
          </form>
        </details>
      </div>
    </details>
  );
}
