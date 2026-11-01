import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { togglePhotoSharedAction } from "@/app/actions";
import { formatDate } from "@/lib/presentation";
import { requireWorkshop } from "@/lib/workshop";

export default async function WorkOrderPhotosPage({ params, searchParams }: { params: { id: string }; searchParams: { agregada?: string } }) {
  const { supabase, workshop } = await requireWorkshop();
  const { data: order } = await supabase.from("orden_trabajo")
    .select("id, numero_ot, fotos")
    .eq("id", params.id).eq("taller_id", workshop.id).maybeSingle();
  if (!order) notFound();

  const { data: processPhotos } = await supabase.from("orden_trabajo_foto")
    .select("id, proceso_id, ruta, descripcion, compartida, created_at")
    .eq("orden_trabajo_id", order.id).order("created_at", { ascending: false });
  const processIds = Array.from(new Set((processPhotos ?? []).map((photo) => photo.proceso_id).filter((id): id is string => Boolean(id))));
  const { data: processes } = processIds.length
    ? await supabase.from("proceso_servicio").select("id, nombre").in("id", processIds)
    : { data: [] };

  const intakePaths = Array.isArray(order.fotos) ? order.fotos.filter((path): path is string => typeof path === "string") : [];
  const allPaths = [...intakePaths, ...(processPhotos ?? []).map((photo) => photo.ruta)];
  const { data: signed } = allPaths.length
    ? await supabase.storage.from("ordenes-trabajo").createSignedUrls(allPaths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));

  return (
    <>
      <Link href={`/dashboard/ordenes/${order.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#cddbcf] bg-white px-5 text-base font-bold text-forest shadow-sm transition hover:bg-[#f2f7f1]"><span aria-hidden="true">←</span> Volver a la orden</Link>
      <header className="mb-6 mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">OT-{order.numero_ot}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Registro de fotos</h1>
        </div>
        <Link href={`/dashboard/ordenes/${order.id}/fotos/nueva`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-5 text-base font-bold text-white hover:bg-[#125840]">+ Agregar foto del proceso</Link>
      </header>
      {searchParams.agregada ? <p role="status" className="mb-5 rounded-xl border border-[#cddbcf] bg-[#f2f7f1] px-4 py-3 text-sm text-forest">Foto agregada al registro.</p> : null}

      <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-ink">Fotos de procesos <span className="text-sm font-normal text-[#748079]">({processPhotos?.length ?? 0})</span></h2>
        {processPhotos?.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {processPhotos.map((photo) => {
              const url = urlByPath.get(photo.ruta);
              const processName = processes?.find((process) => process.id === photo.proceso_id)?.nombre;
              return (
                <li key={photo.id} className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-[#fafbf9]">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      <Image src={url} alt={photo.descripcion} width={400} height={300} unoptimized className="h-48 w-full object-cover" />
                    </a>
                  ) : <div className="flex h-48 items-center justify-center text-sm text-[#748079]">Imagen no disponible</div>}
                  <div className="p-3">
                    {processName ? <p className="text-xs font-bold uppercase tracking-wide text-forest">{processName}</p> : null}
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[#414e47]">{photo.descripcion}</p>
                    <p className="mt-2 text-xs text-[#87928b]">{formatDate(photo.created_at)}</p>
                    <form action={togglePhotoSharedAction} className="mt-3">
                      <input type="hidden" name="orden_id" value={order.id} />
                      <input type="hidden" name="id" value={photo.id} />
                      <input type="hidden" name="compartida" value={photo.compartida ? "false" : "true"} />
                      <button type="submit" className={`min-h-11 w-full rounded-xl border px-3 text-sm font-bold ${photo.compartida ? "border-forest bg-forest text-white" : "border-[#cddbcf] text-forest hover:bg-[#f2f7f1]"}`}>{photo.compartida ? "✓ Visible para el cliente" : "Compartir con el cliente"}</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-3 text-sm text-[#65716a]">Todavía no se cargaron fotos de procesos.</p>}
      </section>

      <section className="mt-5 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-ink">Fotos de ingreso <span className="text-sm font-normal text-[#748079]">({intakePaths.length})</span></h2>
        {intakePaths.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {intakePaths.map((path, index) => {
              const url = urlByPath.get(path);
              return url ? (
                <a key={path} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-[#e2e7e1]">
                  <Image src={url} alt={`Foto de ingreso ${index + 1} de OT-${order.numero_ot}`} width={160} height={120} unoptimized className="h-[120px] w-40 object-cover" />
                </a>
              ) : null;
            })}
          </div>
        ) : <p className="mt-3 text-sm text-[#65716a]">Sin fotos de ingreso.</p>}
      </section>
    </>
  );
}
