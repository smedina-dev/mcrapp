import Link from "next/link";
import {
  createServiceAction,
  createServiceProcessAction,
  updateServiceProcessAction,
  updateServiceProcessesAction,
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
  };
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const { supabase, workshop } = await requireCatalogManager();
  const view = searchParams.vista === "procesos" ? "procesos" : "servicios";
  const [
    { data: services, error: serviceError },
    { data: processes, error: processError },
    { data: serviceProcesses, error: serviceProcessError },
  ] = await Promise.all([
    supabase.from("servicio")
      .select("id, nombre, categoria, precio_base, tiempo_estimado_min, checklist_plantilla")
      .eq("taller_id", workshop.id).order("nombre"),
    supabase.from("proceso_servicio")
      .select("id, nombre, categoria_componente, importe_referencia, descuento_servicio_pct")
      .eq("taller_id", workshop.id).order("nombre"),
    supabase.from("servicio_proceso")
      .select("servicio_id, proceso_id, orden")
      .order("orden"),
  ]);

  const processMap = new Map((processes ?? []).map((process) => [process.id, process]));
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
            <a href="#nuevo-servicio" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#125840]">
              Crear servicio
            </a>
          </div>

          {(services ?? []).map((service) => {
            const legacyChecklist = Array.isArray(service.checklist_plantilla)
              ? service.checklist_plantilla.filter((item): item is { item: string; importe_referencia?: number | null } =>
                typeof item === "object" && item !== null && !Array.isArray(item) && typeof item.item === "string")
              : [];
            const associatedProcesses = (serviceProcessMap.get(service.id) ?? [])
              .map((processId) => processMap.get(processId))
              .filter((process): process is NonNullable<typeof process> => Boolean(process));
            const selectedProcessIds = new Set(associatedProcesses.map((process) => process.id));
            const displayedProcesses = associatedProcesses.length
              ? associatedProcesses.map((process) => process.nombre)
              : legacyChecklist.map((item) => item.item);

            return (
              <article key={service.id} className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-[#edf4eb] px-3 py-1 text-xs font-bold text-forest">{serviceCategories[service.categoria]}</span>
                    <h3 className="mt-2 break-words text-xl font-bold text-ink">{service.nombre}</h3>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xl font-bold text-ink">${formatAmount(service.precio_base)}</p>
                    <p className="mt-1 text-sm text-[#748079]">{service.tiempo_estimado_min} min estimados</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#edf0ec] pt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#87928b]">Incluye</p>
                  {displayedProcesses.length ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {displayedProcesses.slice(0, 4).map((processName) => (
                        <li key={processName} className="rounded-lg bg-[#f3f5f2] px-3 py-2 text-sm text-[#414e47]">{processName}</li>
                      ))}
                      {displayedProcesses.length > 4 ? <li className="rounded-lg bg-[#f3f5f2] px-3 py-2 text-sm font-semibold text-[#65716a]">+{displayedProcesses.length - 4} más</li> : null}
                    </ul>
                  ) : <p className="mt-2 text-sm text-[#748079]">Todavía no tiene procesos asociados.</p>}
                </div>

                <details className="mt-4 border-t border-[#edf0ec] pt-3">
                  <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-forest">Editar procesos incluidos</summary>
                  <form action={updateServiceProcessesAction} className="mt-3">
                    <input type="hidden" name="servicio_id" value={service.id} />
                    <fieldset className="rounded-xl border border-[#e2e7e1] bg-[#fafbf9] p-3 sm:p-4">
                      <legend className="px-1 text-sm font-semibold text-ink">Elegí las tareas del paquete</legend>
                      <div className="max-h-72 space-y-1 overflow-y-auto">
                        {(processes ?? []).map((process) => (
                          <label key={process.id} htmlFor={`service-${service.id}-process-${process.id}`} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white">
                            <input id={`service-${service.id}-process-${process.id}`} name="proceso_id" type="checkbox" value={process.id} defaultChecked={selectedProcessIds.has(process.id)} className="h-6 w-6 accent-forest" />
                            <span className="min-w-0 flex-1">{process.nombre}</span>
                            {process.importe_referencia != null ? <span className="shrink-0 text-xs text-[#748079]">ref. ${formatAmount(process.importe_referencia)}</span> : null}
                          </label>
                        ))}
                        {processes?.length === 0 ? <p className="py-4 text-sm text-[#748079]">Primero agregá procesos desde la pestaña Procesos.</p> : null}
                      </div>
                    </fieldset>
                    <button type="submit" className="mt-3 min-h-14 w-full rounded-xl border border-[#cddbcf] px-4 py-3 text-base font-bold text-forest hover:bg-[#f2f7f1]">Guardar composición</button>
                  </form>
                </details>
              </article>
            );
          })}

          {services?.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cdd6ce] bg-white px-5 py-10 text-center text-sm text-[#65716a]">Todavía no hay servicios. Creá el primer paquete para empezar.</div> : null}

          <details id="nuevo-servicio" className="scroll-mt-4 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
            <summary className="flex min-h-12 cursor-pointer items-center text-lg font-bold text-forest">Crear un servicio nuevo</summary>
            <form action={createServiceAction} className="mt-4 space-y-4">
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
              <button type="submit" className="min-h-14 w-full rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840]">Guardar servicio</button>
            </form>
          </details>
        </section>
      ) : (
        <section aria-label="Procesos del taller" className="space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <h2 className="text-xl font-bold text-ink">Tareas del taller</h2>
              <p className="mt-1 text-sm text-[#748079]">Estas tareas se pueden combinar en distintos servicios. Sus importes son solo referencias.</p>
            </div>
            <a href="#nuevo-proceso" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#125840]">Agregar proceso</a>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(processes ?? []).map((process) => (
              <article key={process.id} className="rounded-2xl border border-[#e2e7e1] bg-white p-4 shadow-sm sm:p-5">
                <form action={updateServiceProcessAction} className="space-y-3">
                  <input type="hidden" name="id" value={process.id} />
                  <h3 className="min-h-10 font-semibold leading-snug text-ink">{process.nombre}</h3>
                  <label className="block text-sm font-semibold text-[#414e47]">Componente
                    <select name="categoria_componente" defaultValue={process.categoria_componente} required className="form-input">
                      {processComponentCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-[#414e47]">Precio de referencia
                    <input name="importe_referencia" type="number" min="0" step="0.01" defaultValue={process.importe_referencia ?? ""} required className="form-input" />
                  </label>
                  <label className="block text-sm font-semibold text-[#414e47]">Descuento si se agrega a un servicio (%)
                    <input name="descuento_servicio_pct" type="number" min="0" max="100" step="0.01" defaultValue={process.descuento_servicio_pct} required className="form-input" />
                  </label>
                  <p className="text-xs text-[#748079]">Precio adicional con servicio: {process.importe_referencia == null ? "definir precio" : `$${formatAmount(process.importe_referencia * (1 - process.descuento_servicio_pct / 100))}`}</p>
                  <button type="submit" className="min-h-12 w-full rounded-xl border border-[#cddbcf] px-4 text-sm font-bold text-forest hover:bg-[#f2f7f1]">Guardar precio y descuento</button>
                </form>
              </article>
            ))}
            {processes?.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-[#cdd6ce] bg-white px-5 py-10 text-center text-sm text-[#65716a]">Todavía no hay procesos cargados. Agregá las tareas habituales del taller.</div> : null}
          </div>

          <form id="nuevo-proceso" action={createServiceProcessAction} className="scroll-mt-4 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest">Catálogo de tareas</p>
            <h3 className="mt-1 text-xl font-bold text-ink">Agregar proceso</h3>
            <p className="mt-1 text-sm text-[#748079]">Cargá una tarea una sola vez para reutilizarla en varios servicios.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)_auto] sm:items-end">
              <label className="block text-sm font-semibold" htmlFor="process-name">Nombre del proceso
                <input id="process-name" name="nombre" required maxLength={255} className="form-input" />
              </label>
              <label className="block text-sm font-semibold" htmlFor="process-category">Componente
                <select id="process-category" name="categoria_componente" required defaultValue="general" className="form-input">
                  {processComponentCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold" htmlFor="process-reference-price">Importe de referencia <span className="font-normal text-[#748079]">(opcional)</span>
                <input id="process-reference-price" name="importe_referencia" type="number" min="0" step="0.01" className="form-input" />
              </label>
              <button type="submit" className="min-h-14 rounded-xl bg-forest px-5 py-3 text-base font-bold text-white hover:bg-[#125840]">Guardar proceso</button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
