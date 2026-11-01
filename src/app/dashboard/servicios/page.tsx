import Link from "next/link";
import {
  createServiceAction,
  createServiceProcessAction,
} from "@/app/actions";
import { formatAmount, processComponentCategories, serviceCategories } from "@/lib/presentation";
import { requireCatalogManager } from "@/lib/workshop";

type ServicesPageProps = {
  searchParams: {
    vista?: string;
    error?: string;
    creado?: string;
    procesoCreado?: string;
    procesoActualizado?: string;
    procesosActualizados?: string;
    modo?: string;
    parte?: string;
  };
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const { supabase, workshop } = await requireCatalogManager();
  const view = searchParams.vista === "procesos" ? "procesos" : "servicios";
  const partsMode = searchParams.modo === "partes";
  const selectedPart = partsMode ? processComponentCategories.find((category) => category.id === searchParams.parte) : undefined;
  const [
    { data: services, error: serviceError },
    { data: processes, error: processError },
    { data: serviceProcesses, error: serviceProcessError },
  ] = await Promise.all([
    supabase.from("servicio")
      .select("id, nombre, categoria, precio_base, tiempo_estimado_min, checklist_plantilla, guia_proceso")
      .eq("taller_id", workshop.id).order("nombre"),
    supabase.from("proceso_servicio")
      .select("id, nombre, categoria_componente, importe_referencia, descuento_servicio_pct, guia_proceso")
      .eq("taller_id", workshop.id).order("nombre"),
    supabase.from("servicio_proceso")
      .select("servicio_id, proceso_id, orden")
      .order("orden"),
  ]);

  const processMap = new Map((processes ?? []).map((process) => [process.id, process]));
  const processCountByPart = new Map<string, number>();
  for (const process of processes ?? []) {
    processCountByPart.set(process.categoria_componente, (processCountByPart.get(process.categoria_componente) ?? 0) + 1);
  }
  const visibleProcesses = selectedPart
    ? (processes ?? []).filter((process) => process.categoria_componente === selectedPart.id)
    : (processes ?? []);
  const serviceProcessMap = new Map<string, string[]>();
  for (const association of serviceProcesses ?? []) {
    const processIds = serviceProcessMap.get(association.servicio_id) ?? [];
    processIds.push(association.proceso_id);
    serviceProcessMap.set(association.servicio_id, processIds);
  }

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Catálogo del taller</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Servicios</h1>
        <p className="mt-2 text-base text-[#65716a]">Administrá los paquetes que ofrecés y las tareas de tu taller.</p>
      </header>

      <nav aria-label="Catálogo" className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-[#e2e7e1] bg-white p-2 shadow-sm">
        <Link
          href="/dashboard/servicios?vista=servicios"
          aria-current={view === "servicios" ? "page" : undefined}
          className={`flex min-h-14 items-center justify-center rounded-xl px-4 text-sm font-bold transition ${view === "servicios" ? "bg-forest text-white shadow-sm" : "text-[#56635c] hover:bg-[#f2f5f1]"}`}
        >
          Servicios <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{services?.length ?? 0}</span>
        </Link>
        <Link
          href="/dashboard/servicios?vista=procesos"
          aria-current={view === "procesos" ? "page" : undefined}
          className={`flex min-h-14 items-center justify-center rounded-xl px-4 text-sm font-bold transition ${view === "procesos" ? "bg-forest text-white shadow-sm" : "text-[#56635c] hover:bg-[#f2f5f1]"}`}
        >
          Procesos <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs">{processes?.length ?? 0}</span>
        </Link>
      </nav>

      {searchParams.error === "proceso-duplicado" ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">Ya existe un proceso con ese nombre.</p> : null}
      {searchParams.error === "proceso" ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo agregar el proceso. Revisá sus datos.</p> : null}
      {searchParams.error === "datos" ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">Revisá el nombre, precio, duración y procesos seleccionados.</p> : null}
      {searchParams.error === "guardado" ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo guardar el service y sus procesos. Revisá la migración del catálogo y tus permisos.</p> : null}
      {searchParams.error === "procesos" ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo actualizar la composición del service.</p> : null}
      {searchParams.creado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Servicio agregado al catálogo.</p> : null}
      {searchParams.procesoCreado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Proceso agregado al catálogo.</p> : null}
      {searchParams.procesoActualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Precio y descuento del proceso actualizados.</p> : null}
      {searchParams.procesosActualizados ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Procesos incluidos actualizados.</p> : null}
      {processError ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo cargar el catálogo de procesos. Aplicá las migraciones del catálogo y volvé a intentar.</p> : null}
      {serviceError ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo cargar el catálogo de servicios.</p> : null}
      {serviceProcessError ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo cargar la composición de los servicios.</p> : null}

      {view === "servicios" ? (
        <section aria-label="Servicios del taller" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <h2 className="text-xl font-bold text-ink">Paquetes de servicio</h2>
              <p className="mt-1 text-sm text-[#748079]">{services?.length ?? 0} disponibles para las órdenes</p>
            </div>
          </div>

          <details id="nuevo-servicio" className="group scroll-mt-4 rounded-2xl border border-[#e2e7e1] bg-white shadow-sm">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-base font-bold text-ink">Crear servicio</span>
              <span className="inline-flex min-h-11 items-center rounded-xl bg-forest px-5 text-sm font-bold text-white group-hover:bg-[#125840]">
                <span className="group-open:hidden">+ Nuevo servicio</span>
                <span className="hidden group-open:inline">Cerrar</span>
              </span>
            </summary>
            <form action={createServiceAction} className="space-y-4 border-t border-[#edf0ec] p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold" htmlFor="service-name">Nombre
                  <input id="service-name" name="nombre" required maxLength={255} className="form-input" />
                </label>
                <label className="block text-sm font-semibold" htmlFor="service-category">Categoría
                  <select id="service-category" name="categoria" required defaultValue="basico" className="form-input">
                    <option value="basico">Básico</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                    <option value="primer_service">Primer service</option>
                    <option value="agregado">Agregado</option>
                    <option value="express">Express</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold" htmlFor="service-price">Precio base
                  <input id="service-price" name="precio_base" type="number" min="0" step="0.01" defaultValue="0" required className="form-input" />
                </label>
                <label className="block text-sm font-semibold" htmlFor="service-duration">Duración estimada (minutos)
                  <input id="service-duration" name="tiempo_estimado_min" type="number" min="1" step="1" defaultValue="60" required className="form-input" />
                </label>
              </div>
              <fieldset className="rounded-xl border border-[#e2e7e1] bg-[#fafbf9] p-3 sm:p-4">
                <legend className="px-1 text-sm font-semibold">Procesos incluidos <span className="font-normal text-[#748079]">(opcional)</span></legend>
                <p className="mb-2 text-sm text-[#748079]">Los importes de referencia no se suman al precio del paquete.</p>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {(processes ?? []).map((process) => (
                    <label key={process.id} htmlFor={`new-service-process-${process.id}`} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white">
                      <input id={`new-service-process-${process.id}`} name="proceso_id" type="checkbox" value={process.id} className="h-6 w-6 accent-forest" />
                      <span className="min-w-0 flex-1">{process.nombre}</span>
                      {process.importe_referencia != null ? <span className="shrink-0 text-xs text-[#748079]">ref. ${formatAmount(process.importe_referencia)}</span> : null}
                    </label>
                  ))}
                  {processes?.length === 0 ? <p className="py-4 text-sm text-[#748079]">Podés asociar procesos después desde la pestaña Procesos.</p> : null}
                </div>
              </fieldset>
              <label className="block text-sm font-semibold" htmlFor="service-guide">Guía del proceso <span className="font-normal text-[#748079]">(opcional)</span>
                <textarea id="service-guide" name="guia_proceso" rows={5} maxLength={5000} placeholder="Explicá paso a paso cómo se realiza este servicio, como guía para el mecánico." className="form-input" />
              </label>
              <button type="submit" className="min-h-14 w-full rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840] sm:w-auto">Guardar servicio</button>
            </form>
          </details>

          {(services ?? []).map((service) => {
            const legacyChecklist = Array.isArray(service.checklist_plantilla)
              ? service.checklist_plantilla.filter((item): item is { item: string; importe_referencia?: number | null } =>
                typeof item === "object" && item !== null && !Array.isArray(item) && typeof item.item === "string")
              : [];
            const associatedProcesses = (serviceProcessMap.get(service.id) ?? [])
              .map((processId) => processMap.get(processId))
              .filter((process): process is NonNullable<typeof process> => Boolean(process));
            const displayedProcesses = associatedProcesses.length
              ? associatedProcesses.map((process) => process.nombre)
              : legacyChecklist.map((item) => item.item);

            return (
              <article key={service.id} className="group/row relative flex min-h-14 items-center gap-3 rounded-2xl border border-[#e2e7e1] bg-white px-4 py-2 shadow-sm hover:z-10 hover:border-[#cddbcf] focus-within:z-10">
                <span className="hidden shrink-0 rounded-full bg-[#edf4eb] px-3 py-1 text-xs font-bold text-forest sm:inline-flex">{serviceCategories[service.categoria]}</span>
                <h3 tabIndex={0} className="min-w-0 flex-1 truncate text-base font-bold text-ink outline-none">{service.nombre}</h3>
                <span className="hidden shrink-0 text-sm text-[#748079] md:inline">{service.tiempo_estimado_min} min</span>
                <span className="shrink-0 text-base font-bold text-ink">${formatAmount(service.precio_base)}</span>
                <Link href={`/dashboard/servicios/${service.id}`} aria-label={`Modificar ${service.nombre}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-[#cddbcf] px-4 text-sm font-bold text-forest hover:bg-[#f2f7f1]">Modificar</Link>

                <div role="tooltip" className="pointer-events-none invisible absolute left-4 top-full z-20 mt-1 w-80 max-w-[calc(100%-2rem)] rounded-xl border border-[#e2e7e1] bg-white p-4 opacity-0 shadow-lg transition group-hover/row:visible group-hover/row:opacity-100 group-focus-within/row:visible group-focus-within/row:opacity-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#87928b]">Procesos ({displayedProcesses.length})</p>
                  {displayedProcesses.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#414e47]">
                      {displayedProcesses.map((processName) => <li key={processName}>{processName}</li>)}
                    </ul>
                  ) : <p className="mt-2 text-sm text-[#748079]">Todavía no tiene procesos asociados.</p>}
                </div>
              </article>
            );
          })}

          {services?.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cdd6ce] bg-white px-5 py-10 text-center text-sm text-[#65716a]">Todavía no hay servicios. Creá el primer paquete para empezar.</div> : null}

        </section>
      ) : (
        <section aria-label="Procesos del taller" className="space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <h2 className="text-xl font-bold text-ink">{selectedPart ? `Procesos de ${selectedPart.label}` : "Tareas del taller"}</h2>
              <p className="mt-1 text-sm text-[#748079]">Estas tareas se pueden combinar en distintos servicios. Sus importes son solo referencias.</p>
            </div>
            <div role="group" aria-label="Cambiar vista de procesos" className="grid grid-cols-2 gap-1 rounded-xl border border-[#e2e7e1] bg-white p-1 shadow-sm">
              <Link href="/dashboard/servicios?vista=procesos&modo=lista" aria-current={!partsMode ? "true" : undefined} className={`flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-bold ${!partsMode ? "bg-forest text-white" : "text-[#56635c] hover:bg-[#f2f5f1]"}`}>Listado</Link>
              <Link href="/dashboard/servicios?vista=procesos&modo=partes" aria-current={partsMode ? "true" : undefined} className={`flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-bold ${partsMode ? "bg-forest text-white" : "text-[#56635c] hover:bg-[#f2f5f1]"}`}>Por partes</Link>
            </div>
          </header>

          {partsMode && !selectedPart ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {processComponentCategories.map((category) => (
                <Link key={category.id} href={`/dashboard/servicios?vista=procesos&modo=partes&parte=${category.id}`} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-[#e2e7e1] bg-white px-5 py-4 shadow-sm transition hover:border-[#aabdad] hover:bg-[#f8faf7]">
                  <span>
                    <span className="block text-lg font-bold text-ink">{category.label}</span>
                    <span className="mt-0.5 block text-sm text-[#748079]">{category.description}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#edf4eb] px-3 py-1 text-sm font-bold text-forest">{processCountByPart.get(category.id) ?? 0}</span>
                </Link>
              ))}
            </div>
          ) : (
            <>
              {selectedPart ? (
                <Link href="/dashboard/servicios?vista=procesos&modo=partes" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#cddbcf] bg-white px-5 text-base font-bold text-forest shadow-sm transition hover:bg-[#f2f7f1]"><span aria-hidden="true">←</span> Volver a partes</Link>
              ) : null}

              <details id="nuevo-proceso" className="group scroll-mt-4 rounded-2xl border border-[#e2e7e1] bg-white shadow-sm">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="text-base font-bold text-ink">Agregar proceso{selectedPart ? ` a ${selectedPart.label}` : ""}</span>
                  <span className="inline-flex min-h-11 items-center rounded-xl bg-forest px-5 text-sm font-bold text-white group-hover:bg-[#125840]">
                    <span className="group-open:hidden">+ Nuevo proceso</span>
                    <span className="hidden group-open:inline">Cerrar</span>
                  </span>
                </summary>
                <form action={createServiceProcessAction} className="border-t border-[#edf0ec] p-5 sm:p-6">
                  {selectedPart ? <input type="hidden" name="parte" value={selectedPart.id} /> : null}
                  <p className="text-sm text-[#748079]">Cargá una tarea una sola vez para reutilizarla en varios servicios.</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)_minmax(180px,0.55fr)]">
                    <label className="block text-sm font-semibold" htmlFor="process-name">Nombre del proceso
                      <input id="process-name" name="nombre" required maxLength={255} className="form-input" />
                    </label>
                    {selectedPart ? (
                      <div className="text-sm font-semibold">
                        <span>Componente</span>
                        <input type="hidden" name="categoria_componente" value={selectedPart.id} />
                        <p className="mt-2 flex min-h-12 items-center rounded-xl border border-[#e2e7e1] bg-[#f3f5f2] px-4 font-bold text-forest">{selectedPart.label}</p>
                      </div>
                    ) : (
                      <label className="block text-sm font-semibold" htmlFor="process-category">Componente
                        <select id="process-category" name="categoria_componente" required defaultValue="general" className="form-input">
                          {processComponentCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                        </select>
                      </label>
                    )}
                    <label className="block text-sm font-semibold" htmlFor="process-reference-price">Importe de referencia <span className="font-normal text-[#748079]">(opcional)</span>
                      <input id="process-reference-price" name="importe_referencia" type="number" min="0" step="0.01" className="form-input" />
                    </label>
                  </div>
                  <label className="mt-4 block text-sm font-semibold" htmlFor="process-guide">Guía del proceso <span className="font-normal text-[#748079]">(opcional)</span>
                    <textarea id="process-guide" name="guia_proceso" rows={4} maxLength={5000} placeholder="Explicá paso a paso cómo se realiza esta tarea, como guía para el mecánico." className="form-input" />
                  </label>
                  <button type="submit" className="mt-4 min-h-14 w-full rounded-xl bg-forest px-5 py-3 text-base font-bold text-white hover:bg-[#125840] sm:w-auto">Guardar proceso</button>
                </form>
              </details>

              <div className="space-y-2">
                {visibleProcesses.map((process) => (
                  <article key={process.id} className="flex items-center gap-3 rounded-xl border border-[#e2e7e1] bg-white px-4 py-2.5 shadow-sm">
                    <h3 className="min-w-0 flex-1 truncate font-semibold text-ink">{process.nombre}</h3>
                    {!selectedPart ? <span className="hidden shrink-0 rounded-full bg-[#edf4eb] px-2.5 py-1 text-xs font-bold text-forest sm:inline">{processComponentCategories.find((category) => category.id === process.categoria_componente)?.label ?? process.categoria_componente}</span> : null}
                    <span className="hidden shrink-0 text-sm font-semibold text-[#414e47] md:inline">{process.importe_referencia == null ? "Sin precio" : `$${formatAmount(process.importe_referencia)}`}</span>
                    <Link href={`/dashboard/servicios/proceso/${process.id}`} aria-label={`Modificar ${process.nombre}`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#cddbcf] px-4 text-sm font-bold text-forest hover:bg-[#f2f7f1]">Modificar</Link>
                  </article>
                ))}
                {visibleProcesses.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cdd6ce] bg-white px-5 py-10 text-center text-sm text-[#65716a]">{selectedPart ? `Todavía no hay procesos en ${selectedPart.label}.` : "Todavía no hay procesos cargados. Agregá las tareas habituales del taller."}</div> : null}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
