import Link from "next/link";
import { notFound } from "next/navigation";
import { updateServiceAction } from "@/app/actions";
import { formatAmount, serviceCategories } from "@/lib/presentation";
import { requireCatalogManager } from "@/lib/workshop";

type ServiceDetailPageProps = {
  params: { id: string };
  searchParams: { error?: string; actualizado?: string };
};

const errorMessages: Record<string, string> = {
  datos: "Revisá el nombre, precio, duración y la guía del proceso.",
  guardado: "No se pudo guardar el servicio.",
  procesos: "No se pudo actualizar la composición del servicio.",
  guia: "El servicio se creó, pero no se pudo guardar la guía. Cargala desde acá.",
};

export default async function ServiceDetailPage({ params, searchParams }: ServiceDetailPageProps) {
  const { supabase, workshop } = await requireCatalogManager();
  const { data: service } = await supabase.from("servicio")
    .select("id, nombre, categoria, precio_base, tiempo_estimado_min, guia_proceso")
    .eq("id", params.id).eq("taller_id", workshop.id).maybeSingle();
  if (!service) notFound();

  const [{ data: processes }, { data: associations }] = await Promise.all([
    supabase.from("proceso_servicio").select("id, nombre, importe_referencia").eq("taller_id", workshop.id).order("nombre"),
    supabase.from("servicio_proceso").select("proceso_id").eq("servicio_id", service.id),
  ]);
  const selectedProcessIds = new Set((associations ?? []).map((association) => association.proceso_id));

  return (
    <>
      <Link href="/dashboard/servicios" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#cddbcf] bg-white px-5 text-base font-bold text-forest shadow-sm transition hover:bg-[#f2f7f1]"><span aria-hidden="true">←</span> Volver a servicios</Link>
      <header className="mb-6 mt-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Servicio · {serviceCategories[service.categoria]}</p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-ink">{service.nombre}</h1>
        <p className="mt-2 text-base text-[#65716a]">${formatAmount(service.precio_base)} · {service.tiempo_estimado_min} min estimados</p>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{errorMessages[searchParams.error] ?? errorMessages.guardado}</p> : null}
      {searchParams.actualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Servicio actualizado.</p> : null}

      <form action={updateServiceAction} className="space-y-5 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        <input type="hidden" name="id" value={service.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold" htmlFor="service-name">Nombre
            <input id="service-name" name="nombre" required maxLength={255} defaultValue={service.nombre} className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="service-category">Categoría
            <select id="service-category" name="categoria" required defaultValue={service.categoria} className="form-input">
              {Object.entries(serviceCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold" htmlFor="service-price">Precio base
            <input id="service-price" name="precio_base" type="number" min="0" step="0.01" required defaultValue={service.precio_base} className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="service-duration">Duración estimada (minutos)
            <input id="service-duration" name="tiempo_estimado_min" type="number" min="1" step="1" required defaultValue={service.tiempo_estimado_min} className="form-input" />
          </label>
        </div>

        <label className="block text-sm font-semibold" htmlFor="service-guide">Guía del proceso
          <span className="mt-1 block text-xs font-normal text-[#748079]">Explicá paso a paso cómo se realiza este servicio. El mecánico la usa como guía.</span>
          <textarea id="service-guide" name="guia_proceso" rows={8} maxLength={5000} defaultValue={service.guia_proceso ?? ""} className="form-input" />
        </label>

        <fieldset className="rounded-xl border border-[#e2e7e1] bg-[#fafbf9] p-3 sm:p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Procesos incluidos</legend>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {(processes ?? []).map((process) => (
              <label key={process.id} htmlFor={`process-${process.id}`} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white">
                <input id={`process-${process.id}`} name="proceso_id" type="checkbox" value={process.id} defaultChecked={selectedProcessIds.has(process.id)} className="h-6 w-6 accent-forest" />
                <span className="min-w-0 flex-1">{process.nombre}</span>
                {process.importe_referencia != null ? <span className="shrink-0 text-xs text-[#748079]">ref. ${formatAmount(process.importe_referencia)}</span> : null}
              </label>
            ))}
            {processes?.length === 0 ? <p className="py-4 text-sm text-[#748079]">Primero agregá procesos desde la pestaña Procesos.</p> : null}
          </div>
        </fieldset>

        <button type="submit" className="min-h-14 w-full rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840] sm:w-auto">Guardar cambios</button>
      </form>
    </>
  );
}
