import Link from "next/link";
import { notFound } from "next/navigation";
import { BicycleDetail } from "@/components/bicycle-management";
import { requireWorkshop } from "@/lib/workshop";

type BicycleDetailPageProps = {
  params: { id: string };
  searchParams: { error?: string; actualizado?: string; transferida?: string; q?: string };
};

export default async function BicycleDetailPage({ params, searchParams }: BicycleDetailPageProps) {
  const { supabase, workshop } = await requireWorkshop();
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
    </>
  );
}
