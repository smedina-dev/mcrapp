import Link from "next/link";
import { WorkOrderIntakeForm } from "@/components/work-order-intake-form";
import { requireWorkshop } from "@/lib/workshop";

type ReceptionPageProps = {
  searchParams: {
    error?: string;
    creado?: string;
    cliente_id?: string;
    bicicleta_id?: string;
  };
};
type OwnedBicycle = { id: string; cliente_id: string; marca_modelo: string; tiene_shock: boolean };

export default async function ReceptionPage({ searchParams }: ReceptionPageProps) {
  const { supabase, workshop } = await requireWorkshop();
  const [{ data: services }, { data: processes }, { data: serviceProcesses }, { data: customer }] = await Promise.all([
    supabase.from("servicio").select("id, nombre, categoria, precio_base")
      .eq("taller_id", workshop.id).order("nombre"),
    supabase.from("proceso_servicio").select("id, nombre, categoria_componente, importe_referencia, descuento_servicio_pct")
      .eq("taller_id", workshop.id).order("nombre"),
    supabase.from("servicio_proceso").select("servicio_id, proceso_id").order("orden"),
    searchParams.cliente_id
      ? supabase.from("cliente").select("id, nombre_completo, peso_kg")
        .eq("id", searchParams.cliente_id).eq("taller_id", workshop.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: customerBicycles, error: bicycleError } = customer
    ? await supabase.from("bicicleta").select("id, cliente_id, marca_modelo, tiene_shock")
      .eq("taller_id", workshop.id).eq("cliente_id", customer.id).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (bicycleError) throw new Error(`No se pudieron cargar las bicicletas del cliente: ${bicycleError.message}`);

  const processMap = new Map((processes ?? []).map((process) => [process.id, process]));
  const serviceProcessesMap = new Map<string, { id: string; nombre: string }[]>();
  for (const link of serviceProcesses ?? []) {
    const process = processMap.get(link.proceso_id);
    if (process) {
      const items = serviceProcessesMap.get(link.servicio_id) ?? [];
      items.push({ id: process.id, nombre: process.nombre });
      serviceProcessesMap.set(link.servicio_id, items);
    }
  }
  const serviceCards = (services ?? []).map((service) => ({
    ...service,
    processes: serviceProcessesMap.get(service.id) ?? [],
  }));
  const bicycles: OwnedBicycle[] = (customerBicycles ?? []).flatMap((bicycle) =>
    bicycle.cliente_id ? [{ ...bicycle, cliente_id: bicycle.cliente_id }] : [],
  );
  const initialCustomerId = customer?.id ?? "";
  const initialBicycleId = bicycles.some((bicycle) => bicycle.id === searchParams.bicicleta_id)
    ? searchParams.bicicleta_id
    : "";

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Taller</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Recepción</h1>
        <p className="mt-2 text-base text-[#65716a]">Ingresá una bicicleta, registrá su estado y generá la orden de trabajo.</p>
      </header>
      {searchParams.error ? (
        <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">
          {searchParams.error === "seleccion" ? "La combinación seleccionada no es válida. Revisá servicios, procesos y precios."
            : searchParams.error === "bucket" ? "No existe el bucket ordenes-trabajo en el proyecto Supabase conectado. Ejecutá la migración 20261015000000_create_work_order_photo_bucket.sql en ese proyecto y verificá que NEXT_PUBLIC_SUPABASE_URL apunte al mismo proyecto."
              : searchParams.error === "fotos" ? "No se pudo subir una o más fotos. Revisá que sean JPG, PNG o WebP de hasta 4 MB, y que el bucket ordenes-trabajo permita la carga; la recepción no se cerró."
                : searchParams.error === "migracion-cierre" ? "Supabase no encuentra la función que cierra la recepción. Ejecutá la migración 20261015000100_restore_work_order_reception_finalize_rpc.sql en el proyecto conectado y esperá unos segundos a que PostgREST recargue el esquema antes de reintentar."
                  : searchParams.error === "cierre" ? "No se pudo cerrar la recepción. La orden incompleta se descartó; consultá el registro del servidor para ver el detalle."
                    : searchParams.error === "migracion-esquema" ? "Falta una columna de la base de datos para gestionar el cierre de la recepción. Volvé a ejecutar la versión actualizada de 20261012000200_restore_work_order_creation_rpc.sql en el proyecto conectado y luego reintentá."
                      : searchParams.error === "migracion-base" ? "Falta la función base que crea órdenes. Ejecutá en el proyecto conectado la migración 20261012000200_restore_work_order_creation_rpc.sql y volvé a intentar."
                        : searchParams.error === "migracion" ? "Supabase no encuentra la función crear_orden_trabajo_con_inspeccion. Volvé a ejecutar la versión actualizada de 20261012000100_work_order_bike_inspection.sql en el proyecto conectado a la app y esperá unos segundos a que PostgREST recargue el esquema."
                          : "No se pudo completar la recepción. Revisá los datos e intentá nuevamente."}
        </p>
      ) : null}
      {searchParams.creado ? (
        <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">
          Recepción cerrada; la orden quedó completa para el mecánico. <Link href="/dashboard/ordenes" className="underline">Ver órdenes</Link>
        </p>
      ) : null}
      <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        <WorkOrderIntakeForm
          customers={customer ? [customer] : []}
          bicycles={bicycles}
          defaultCustomerId={initialCustomerId}
          defaultBicycleId={initialBicycleId}
          services={serviceCards}
          processes={(processes ?? []).map((process) => ({
            id: process.id,
            nombre: process.nombre,
            categoria_componente: process.categoria_componente,
            importe_referencia: process.importe_referencia,
            descuento_servicio_pct: process.descuento_servicio_pct,
          }))}
        />
      </section>
    </>
  );
}
