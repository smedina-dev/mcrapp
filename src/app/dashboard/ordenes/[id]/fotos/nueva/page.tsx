import Link from "next/link";
import { notFound } from "next/navigation";
import { addProcessPhotoAction } from "@/app/actions";
import { ProcessPhotoInput } from "@/components/process-photo-input";
import { requireWorkshop } from "@/lib/workshop";

const errors: Record<string, string> = {
  datos: "Revisá los datos: la descripción debe tener al menos 3 caracteres.",
  foto: "Elegí una foto JPG, PNG o WebP de hasta 4 MB.",
  subida: "No se pudo subir la foto. Probá de nuevo.",
  guardado: "La foto se subió pero no se pudo registrar. Probá de nuevo.",
  migracion: "Falta aplicar la migración 20261031000200_order_checklist_and_photos.sql en Supabase.",
};

export default async function NewProcessPhotoPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { supabase, workshop } = await requireWorkshop();
  const { data: order } = await supabase.from("orden_trabajo")
    .select("id, numero_ot")
    .eq("id", params.id).eq("taller_id", workshop.id).maybeSingle();
  if (!order) notFound();

  const [{ data: orderServices }, { data: extraProcesses }] = await Promise.all([
    supabase.from("orden_trabajo_servicio").select("servicio_id").eq("orden_trabajo_id", order.id),
    supabase.from("orden_trabajo_proceso").select("proceso_id").eq("orden_trabajo_id", order.id),
  ]);
  const serviceIds = (orderServices ?? []).map((item) => item.servicio_id);
  const { data: links } = serviceIds.length
    ? await supabase.from("servicio_proceso").select("proceso_id").in("servicio_id", serviceIds)
    : { data: [] };
  const processIds = Array.from(new Set([...(extraProcesses ?? []).map((item) => item.proceso_id), ...(links ?? []).map((item) => item.proceso_id)]));
  const { data: processes } = processIds.length
    ? await supabase.from("proceso_servicio").select("id, nombre").in("id", processIds).order("nombre")
    : { data: [] };

  return (
    <>
      <Link href={`/dashboard/ordenes/${order.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#cddbcf] bg-white px-5 text-base font-bold text-forest shadow-sm transition hover:bg-[#f2f7f1]"><span aria-hidden="true">←</span> Volver a la orden</Link>
      <header className="mb-6 mt-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">OT-{order.numero_ot}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Agregar foto del proceso</h1>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{errors[searchParams.error] ?? errors.guardado}</p> : null}

      <form action={addProcessPhotoAction} className="space-y-4 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        <input type="hidden" name="orden_id" value={order.id} />
        <div className="text-sm font-semibold">Foto
          <div className="mt-2"><ProcessPhotoInput /></div>
        </div>
        <label className="block text-sm font-semibold" htmlFor="photo-process">Proceso al que pertenece <span className="font-normal text-[#748079]">(opcional)</span>
          <select id="photo-process" name="proceso_id" defaultValue="" className="form-input">
            <option value="">General de la orden</option>
            {(processes ?? []).map((process) => <option key={process.id} value={process.id}>{process.nombre}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold" htmlFor="photo-description">Detalle: qué se ve en la foto
          <textarea id="photo-description" name="descripcion" rows={4} required minLength={3} maxLength={500} placeholder="Ej.: Rulemanes de maza trasera desgastados antes del cambio." className="form-input" />
        </label>
        <button type="submit" className="min-h-14 w-full rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840] sm:w-auto">Guardar foto</button>
      </form>
    </>
  );
}
