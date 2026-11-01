import Link from "next/link";
import { notFound } from "next/navigation";
import { updateServiceProcessAction } from "@/app/actions";
import { formatAmount, processComponentCategories } from "@/lib/presentation";
import { requireCatalogManager } from "@/lib/workshop";

type ProcessDetailPageProps = {
  params: { id: string };
  searchParams: { error?: string; actualizado?: string };
};

export default async function ProcessDetailPage({ params, searchParams }: ProcessDetailPageProps) {
  const { supabase, workshop } = await requireCatalogManager();
  const { data: process } = await supabase.from("proceso_servicio")
    .select("id, nombre, categoria_componente, importe_referencia, descuento_servicio_pct, guia_proceso")
    .eq("id", params.id).eq("taller_id", workshop.id).maybeSingle();
  if (!process) notFound();

  return (
    <>
      <Link href="/dashboard/servicios?vista=procesos" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#cddbcf] bg-white px-5 text-base font-bold text-forest shadow-sm transition hover:bg-[#f2f7f1]"><span aria-hidden="true">←</span> Volver a procesos</Link>
      <header className="mb-6 mt-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Proceso</p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-ink">{process.nombre}</h1>
        <p className="mt-2 text-base text-[#65716a]">Referencia: {process.importe_referencia == null ? "sin definir" : `$${formatAmount(process.importe_referencia)}`}</p>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{searchParams.error === "proceso-duplicado" ? "Ya existe un proceso con ese nombre." : "No se pudo guardar el proceso. Revisá los datos."}</p> : null}
      {searchParams.actualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Proceso actualizado.</p> : null}

      <form action={updateServiceProcessAction} className="space-y-5 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        <input type="hidden" name="id" value={process.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold sm:col-span-2" htmlFor="process-name">Nombre
            <input id="process-name" name="nombre" required maxLength={255} defaultValue={process.nombre} className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="process-category">Componente
            <select id="process-category" name="categoria_componente" required defaultValue={process.categoria_componente} className="form-input">
              {processComponentCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold" htmlFor="process-price">Precio de referencia
            <input id="process-price" name="importe_referencia" type="number" min="0" step="0.01" required defaultValue={process.importe_referencia ?? ""} className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="process-discount">Descuento si se agrega a un servicio (%)
            <input id="process-discount" name="descuento_servicio_pct" type="number" min="0" max="100" step="0.01" required defaultValue={process.descuento_servicio_pct} className="form-input" />
          </label>
        </div>
        <label className="block text-sm font-semibold" htmlFor="process-guide">Guía del proceso
          <span className="mt-1 block text-xs font-normal text-[#748079]">Explicá paso a paso cómo se realiza esta tarea. El mecánico la usa como guía.</span>
          <textarea id="process-guide" name="guia_proceso" rows={8} maxLength={5000} defaultValue={process.guia_proceso ?? ""} className="form-input" />
        </label>
        <button type="submit" className="min-h-14 w-full rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840] sm:w-auto">Guardar cambios</button>
      </form>
    </>
  );
}
