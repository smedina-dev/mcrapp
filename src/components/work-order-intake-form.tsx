"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createWorkOrderAction } from "@/app/actions";
import { ReceptionPhotoInput } from "@/components/reception-photo-input";
import { formatAmount, processComponentCategories, serviceCategories } from "@/lib/presentation";
import type { Database } from "@/lib/database.types";
import {
  inspectionCategories,
  inspectionItems,
  inspectionMeasurementOptions,
  inspectionStatusOptions,
  inspectionYesNoOptions,
} from "@/lib/bicycle-inspection";

type Customer = { id: string; nombre_completo: string; peso_kg: number | null };
type Bicycle = { id: string; cliente_id: string; marca_modelo: string; tiene_shock: boolean };
type Service = {
  id: string;
  nombre: string;
  categoria: Database["public"]["Enums"]["categoria_servicio_enum"];
  precio_base: number;
  processes: { id: string; nombre: string }[];
};
type Process = {
  id: string;
  nombre: string;
  categoria_componente: Database["public"]["Enums"]["categoria_componente_enum"];
  importe_referencia: number | null;
  descuento_servicio_pct: number;
};

type WorkOrderIntakeFormProps = {
  customers: Customer[];
  bicycles: Bicycle[];
  services: Service[];
  processes: Process[];
  defaultCustomerId?: string;
  defaultBicycleId?: string;
};

export function WorkOrderIntakeForm({
  customers,
  bicycles,
  services,
  processes,
  defaultCustomerId = "",
  defaultBicycleId = "",
}: WorkOrderIntakeFormProps) {
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [bicycleId, setBicycleId] = useState(defaultBicycleId);
  const [selectedCustomer, setSelectedCustomer] = useState(
    customers.find((customer) => customer.id === defaultCustomerId) ?? null,
  );
  const [customerSearch, setCustomerSearch] = useState(selectedCustomer?.nombre_completo ?? "");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState("");
  const [customerBicycles, setCustomerBicycles] = useState(
    bicycles.filter((bicycle) => bicycle.cliente_id === defaultCustomerId),
  );
  const inspectionDialogRef = useRef<HTMLDialogElement>(null);
  const bicycleRequestId = useRef(0);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [isLoadingBicycles, setIsLoadingBicycles] = useState(false);
  const [bicycleLoadError, setBicycleLoadError] = useState("");
  const [activeCategory, setActiveCategory] = useState<Database["public"]["Enums"]["categoria_componente_enum"] | null>(null);
  const [inspectionStatuses, setInspectionStatuses] = useState<Record<string, string>>({});
  const [inspectionComments, setInspectionComments] = useState<Record<string, string>>({});
  const [activeServiceCategory, setActiveServiceCategory] = useState<
    "basico" | "intermedio" | "primer_service" | "express" | "detallado"
  >("basico");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const selectedServiceSet = new Set(selectedServices);
  const selectedProcessSet = new Set(selectedProcesses);
  const includedProcessIds = new Set(
    services.filter((service) => selectedServiceSet.has(service.id)).flatMap((service) => service.processes.map((process) => process.id)),
  );
  const packageTotal = services
    .filter((service) => selectedServiceSet.has(service.id))
    .reduce((sum, service) => sum + service.precio_base, 0);
  const additionalTotal = processes
    .filter((process) => selectedProcessSet.has(process.id) && process.importe_referencia != null)
    .reduce((sum, process) => {
      const discount = selectedServices.length ? process.descuento_servicio_pct : 0;
      const lineTotal = Math.round(process.importe_referencia! * (100 - discount)) / 100;
      return sum + lineTotal;
    }, 0);
  const total = packageTotal + additionalTotal;
  const selectedBicycle = customerBicycles.find((bicycle) => bicycle.id === bicycleId);
  const inspectionItemCount = inspectionCategories.reduce((count, category) => count + category.items.length, 0);
  const completedInspectionCount = Object.keys(inspectionStatuses).filter((id) =>
    inspectionStatuses[id] !== "no_aplica" || id === "shock",
  ).length;
  const inspectionComplete = completedInspectionCount === inspectionItemCount;

  function toggleSelection(current: string[], id: string, checked: boolean) {
    return checked ? [...current, id] : current.filter((item) => item !== id);
  }

  useEffect(() => {
    if (selectedCustomer || !customerSearch.trim()) {
      setCustomerResults([]);
      setIsSearchingCustomers(false);
      setCustomerSearchError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearchingCustomers(true);
      setCustomerSearchError("");
      try {
        const response = await fetch(`/api/ordenes/clientes?q=${encodeURIComponent(customerSearch.trim())}`, {
          signal: controller.signal,
        });
        const result = await response.json() as { customers?: Customer[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "No se pudo buscar clientes.");
        setCustomerResults(result.customers ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCustomerResults([]);
          setCustomerSearchError(error instanceof Error ? error.message : "No se pudo buscar clientes.");
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingCustomers(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [customerSearch, selectedCustomer]);

  useEffect(() => {
    const dialog = inspectionDialogRef.current;
    if (!dialog) return;
    if (isInspectionDialogOpen && !dialog.open) dialog.showModal();
    if (!isInspectionDialogOpen && dialog.open) dialog.close();
  }, [isInspectionDialogOpen]);

  async function chooseCustomer(customer: Customer) {
    const requestId = bicycleRequestId.current + 1;
    bicycleRequestId.current = requestId;
    setInspectionStatuses({});
    setInspectionComments({});
    setIsInspectionDialogOpen(false);
    setSelectedServices([]);
    setSelectedProcesses([]);
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    setCustomerSearch(customer.nombre_completo);
    setCustomerResults([]);
    setBicycleId("");
    setCustomerBicycles([]);
    setBicycleLoadError("");
    setIsLoadingBicycles(true);
    try {
      const response = await fetch(`/api/ordenes/clientes/${encodeURIComponent(customer.id)}/bicicletas`);
      const result = await response.json() as { bicycles?: Bicycle[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudieron cargar las bicicletas.");
      if (bicycleRequestId.current === requestId) setCustomerBicycles(result.bicycles ?? []);
    } catch (error) {
      if (bicycleRequestId.current === requestId) {
        setBicycleLoadError(error instanceof Error ? error.message : "No se pudieron cargar las bicicletas.");
      }
    } finally {
      if (bicycleRequestId.current === requestId) setIsLoadingBicycles(false);
    }
  }

  const serviceCategoryFilters: {
    id: "basico" | "intermedio" | "primer_service" | "express" | "detallado";
    label: string;
    serviceCategory: Database["public"]["Enums"]["categoria_servicio_enum"];
  }[] = [
    { id: "basico", label: "Básico", serviceCategory: "basico" },
    { id: "intermedio", label: "Intermedio", serviceCategory: "intermedio" },
    { id: "primer_service", label: "Primer service", serviceCategory: "primer_service" },
    { id: "express", label: "Express", serviceCategory: "express" },
    { id: "detallado", label: "Detallado", serviceCategory: "avanzado" },
  ];
  const activeServiceCategoryValue = serviceCategoryFilters.find(
    (category) => category.id === activeServiceCategory,
  )?.serviceCategory;

  return (
    <form action={createWorkOrderAction} autoComplete="off" className="mt-5 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm font-semibold">
          <label htmlFor="order-customer">Buscar cliente</label>
          <input type="hidden" name="cliente_id" value={customerId} />
          <input
            id="order-customer"
            role="combobox"
            type="search"
            autoComplete="off"
            maxLength={100}
            value={customerId ? selectedCustomer?.nombre_completo ?? "" : customerSearch}
            onChange={(event) => {
              bicycleRequestId.current += 1;
              setIsLoadingBicycles(false);
              setInspectionStatuses({});
              setInspectionComments({});
              setSelectedServices([]);
              setSelectedProcesses([]);
              setCustomerSearch(event.target.value);
              setSelectedCustomer(null);
              setCustomerId("");
              setBicycleId("");
              setCustomerBicycles([]);
              setCustomerResults([]);
              setCustomerSearchError("");
              setBicycleLoadError("");
            }}
            aria-autocomplete="list"
            aria-controls="order-customer-results"
            aria-expanded={customerResults.length > 0}
            placeholder="Escribí el comienzo del nombre..."
            className="form-input"
          />
          {customerResults.length ? (
            <ul id="order-customer-results" role="listbox" className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-[#dce4dc] bg-white shadow-lg">
              {customerResults.map((customer) => (
                <li key={customer.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => void chooseCustomer(customer)}
                    className="min-h-12 w-full border-b border-[#edf0ec] px-4 py-3 text-left text-sm hover:bg-[#f2f7f1]"
                  >
                    <span className="block font-semibold text-ink">{customer.nombre_completo}</span>
                    {customer.peso_kg ? <span className="text-xs font-normal text-[#748079]">{customer.peso_kg} kg</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {isSearchingCustomers ? <span className="mt-2 block text-xs font-normal text-[#748079]" role="status">Buscando...</span> : null}
          {customerSearchError ? <span className="mt-2 block text-xs font-normal text-[#853321]" role="alert">{customerSearchError}</span> : null}
          {customerSearch.trim().length > 0 && !isSearchingCustomers && !customerResults.length && !selectedCustomer && !customerSearchError
            ? <span className="mt-2 block text-xs font-normal text-[#748079]">No se encontraron clientes que comiencen con ese texto.</span>
            : null}
          <Link href="/dashboard/clientes?return_to=ordenes#nuevo-cliente" className="mt-2 inline-block text-xs font-semibold text-forest underline-offset-2 hover:underline">Crear cliente nuevo</Link>
        </div>
        <div className="text-sm font-semibold">
          <label htmlFor="order-bike">Bicicleta</label>
          <select id="order-bike" name="bicicleta_id" autoComplete="off" required disabled={!customerId || isLoadingBicycles} value={bicycleId} onChange={(event) => {
            setBicycleId(event.target.value);
            setInspectionStatuses({});
            setInspectionComments({});
            setIsInspectionDialogOpen(false);
            setSelectedServices([]);
            setSelectedProcesses([]);
          }} className="form-input disabled:bg-[#f0f3ef]">
            <option value="">Seleccionar bicicleta</option>
            {customerBicycles.map((bicycle) => <option key={bicycle.id} value={bicycle.id}>{bicycle.marca_modelo}</option>)}
          </select>
          <input type="hidden" name="tiene_shock" value={selectedBicycle?.tiene_shock ? "true" : "false"} />
          {isLoadingBicycles ? <span className="mt-1 block text-xs font-normal text-[#748079]">Cargando bicicletas...</span> : null}
          {bicycleLoadError ? <span className="mt-1 block text-xs font-normal text-[#853321]" role="alert">{bicycleLoadError}</span> : null}
          <span className="mt-1 block text-xs font-normal"><Link href={customerId ? `/dashboard/bicicletas?return_to=ordenes&cliente_id=${encodeURIComponent(customerId)}#registrar-bicicleta` : "/dashboard/bicicletas#registrar-bicicleta"} className="text-forest underline-offset-2 hover:underline">{customerId && customerBicycles.length === 0 ? "Este cliente no tiene bicicletas · agregar una" : "Agregar bicicleta"}</Link></span>
        </div>
      </div>
      {selectedCustomer ? (
        <p className="rounded-xl bg-[#edf4eb] px-4 py-3 text-sm text-[#40584a]">
          Peso del ciclista para regular la suspensión: <strong>{selectedCustomer.peso_kg ? `${selectedCustomer.peso_kg} kg` : "sin registrar"}</strong>
          {!selectedCustomer.peso_kg ? <span> · Completalo en Clientes antes de ajustar la suspensión.</span> : null}
        </p>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-[#e2e7e1] bg-[#f8faf7] p-4 sm:p-5" aria-labelledby="reception-condition-heading">
        <div>
          <h3 id="reception-condition-heading" className="font-bold text-ink">1. Revisá la bicicleta</h3>
          <p className="mt-1 text-sm text-[#748079]">{bicycleId ? "Abrí el checklist para revisar los componentes. Podés desplegar cada categoría y cada punto cuando lo necesites." : "Elegí primero al cliente y su bicicleta para comenzar la inspección."}</p>
        </div>
        <button
          type="button"
          disabled={!bicycleId}
          aria-haspopup="dialog"
          aria-expanded={isInspectionDialogOpen}
          onClick={() => setIsInspectionDialogOpen(true)}
          className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border border-[#cddbcf] bg-white px-4 py-3 text-left transition hover:bg-[#f2f7f1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>
            <span className="block font-bold text-forest">Abrir checklist de ingreso</span>
            <span className="mt-1 block text-sm font-normal text-[#65716a]" aria-live="polite">
              {completedInspectionCount} de {inspectionItemCount} puntos revisados
            </span>
          </span>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${inspectionComplete ? "bg-[#edf4eb] text-forest" : "bg-[#f1f5ef] text-[#65716a]"}`}>
            {inspectionComplete ? "Completo" : "Pendiente"}
          </span>
        </button>
        <dialog
          ref={inspectionDialogRef}
          aria-labelledby="inspection-dialog-heading"
          onClose={() => setIsInspectionDialogOpen(false)}
          className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl overflow-hidden rounded-2xl border border-[#dce4dc] bg-white p-0 text-ink shadow-2xl backdrop:bg-black/60"
        >
          <div className="flex max-h-[calc(100dvh-1rem)] flex-col">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#edf0ec] bg-white px-4 py-4 sm:px-6">
              <div>
                <h2 id="inspection-dialog-heading" className="text-lg font-bold text-ink sm:text-xl">Checklist de ingreso</h2>
                <p className="mt-1 text-sm text-[#65716a]" aria-live="polite">
                  {completedInspectionCount} de {inspectionItemCount} puntos revisados
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInspectionDialogOpen(false)}
                className="min-h-12 shrink-0 rounded-xl border border-[#cddbcf] px-4 text-sm font-bold text-forest hover:bg-[#f2f7f1]"
              >
                Cerrar
              </button>
            </header>
            <div className="space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <p className="text-sm text-[#65716a]">Desplegá una parte para ver sus puntos; abrí cada punto para marcar el estado o agregar una nota.</p>
              {inspectionCategories.map((category) => {
                const categoryCompleted = category.items.filter((item) => inspectionStatuses[item.id]).length;
                return (
                  <details key={category.id} className="group overflow-hidden rounded-xl border border-[#dce4dc] bg-[#f8faf7]">
                    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="font-bold text-ink">{category.label}</span>
                      <span className="flex shrink-0 items-center gap-3 text-sm font-semibold text-[#65716a]">
                        {categoryCompleted}/{category.items.length}
                        <span aria-hidden="true" className="text-lg text-forest transition-transform group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <div className="space-y-2 border-t border-[#edf0ec] p-3 sm:p-4">
                      <p className="mb-3 text-xs text-[#748079]">{category.description}</p>
                      {category.items.map((item) => {
                        const selectedStatus = inspectionStatuses[item.id] ?? "";
                        const options = "measurement" in item && item.measurement
                          ? inspectionMeasurementOptions
                          : "responseType" in item && item.responseType === "yes_no"
                            ? inspectionYesNoOptions
                            : item.id === "shock"
                              ? [...inspectionStatusOptions, { id: "no_aplica", label: "No aplica" }]
                              : inspectionStatusOptions;
                        const selectedStatusLabel = options.find((option) => option.id === selectedStatus)?.label ?? "Pendiente";
                        return (
                          <details key={item.id} className="group rounded-xl border border-[#e7ece7] bg-white">
                            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
                              <span className="text-sm font-semibold text-ink">{item.label}</span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selectedStatus ? "bg-[#edf4eb] text-forest" : "bg-[#f1f5ef] text-[#65716a]"}`}>
                                  {selectedStatusLabel}
                                </span>
                                <span aria-hidden="true" className="text-lg text-forest transition-transform group-open:rotate-45">+</span>
                              </span>
                            </summary>
                            <div className="space-y-3 border-t border-[#edf0ec] p-3">
                              <p className="text-sm leading-5 text-[#65716a]">{item.detail}</p>
                              <div role="group" aria-label={`Estado: ${item.label}`} className="grid grid-cols-2 gap-2">
                                {options.map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={selectedStatus === option.id}
                                    onClick={() => setInspectionStatuses((current) => ({ ...current, [item.id]: option.id }))}
                                    className={`min-h-14 rounded-lg border px-3 py-2 text-sm font-semibold transition ${selectedStatus === option.id ? "border-forest bg-forest text-white" : "border-[#cddbcf] bg-white text-[#40584a] hover:bg-[#f2f7f1]"}`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                              <label htmlFor={`inspection-comment-${item.id}`} className="block text-xs font-semibold text-[#59665e]">
                                Comentario opcional
                                <textarea
                                  id={`inspection-comment-${item.id}`}
                                  value={inspectionComments[item.id] ?? ""}
                                  onChange={(event) => setInspectionComments((current) => ({ ...current, [item.id]: event.target.value }))}
                                  maxLength={500}
                                  rows={2}
                                  placeholder="Agregá un detalle si hace falta..."
                                  className="form-input mt-1 min-h-12 resize-y text-sm font-normal"
                                />
                              </label>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </dialog>
        {Object.entries(inspectionStatuses).map(([id, status]) => (
          <input key={id} type="hidden" name="inspeccion_estado" value={`${id}:${status}`} />
        ))}
        {inspectionItems.map((item) => (
          <input key={item.id} type="hidden" name="inspeccion_comentario" value={`${item.id}:${inspectionComments[item.id] ?? ""}`} />
        ))}
        <fieldset disabled={!bicycleId} className={`rounded-xl border border-[#dce4dc] bg-white p-4 ${bicycleId ? "" : "opacity-50"}`}>
        <legend className="sr-only">Antigüedad de mantenimientos</legend>
        <section className="space-y-3" aria-labelledby="maintenance-history-heading">
          <div>
            <h4 id="maintenance-history-heading" className="font-bold text-ink">Antigüedad del último service</h4>
            <p className="mt-1 text-xs text-[#748079]">Preguntale al cliente. Si no lo recuerda, dejá el campo vacío.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label key={`last-service-months-${bicycleId}`} className="block text-sm font-semibold" htmlFor="last-service-months">Bicicleta completa · meses desde el último service
              <input id="last-service-months" name="ultimo_service_meses" autoComplete="off" type="number" min={0} max={1200} step={1} inputMode="numeric" placeholder="No sabe" className="form-input" />
            </label>
            <label key={`last-service-km-${bicycleId}`} className="block text-sm font-semibold" htmlFor="last-service-km">Bicicleta completa · km desde el último service
              <input id="last-service-km" name="ultimo_service_km" autoComplete="off" type="number" min={0} max={1000000} step={1} inputMode="numeric" placeholder="No sabe" className="form-input" />
            </label>
            <label key={`fork-service-months-${bicycleId}`} className="block text-sm font-semibold" htmlFor="fork-service-months">Horquilla · meses desde el último service
              <input id="fork-service-months" name="horquilla_service_meses" autoComplete="off" type="number" min={0} max={1200} step={1} inputMode="numeric" placeholder="No sabe" className="form-input" />
            </label>
            <label key={`fork-service-km-${bicycleId}`} className="block text-sm font-semibold" htmlFor="fork-service-km">Horquilla · km desde el último service
              <input id="fork-service-km" name="horquilla_service_km" autoComplete="off" type="number" min={0} max={1000000} step={1} inputMode="numeric" placeholder="No sabe" className="form-input" />
            </label>
            {selectedBicycle?.tiene_shock ? <>
              <label key={`shock-service-months-${bicycleId}`} className="block text-sm font-semibold" htmlFor="shock-service-months">Shock · meses desde el último service
                <input id="shock-service-months" name="shock_service_meses" autoComplete="off" type="number" min={0} max={1200} step={1} inputMode="numeric" placeholder="No sabe" className="form-input" />
              </label>
              <label key={`shock-service-km-${bicycleId}`} className="block text-sm font-semibold" htmlFor="shock-service-km">Shock · km desde el último service
                <input id="shock-service-km" name="shock_service_km" autoComplete="off" type="number" min={0} max={1000000} step={1} inputMode="numeric" placeholder="No sabe" className="form-input" />
              </label>
            </> : null}
          </div>
        </section>
        </fieldset>
        <label className="block text-sm font-semibold" htmlFor="reception-observations">Observaciones del estado
          <textarea key={`reception-observations-${bicycleId}`} id="reception-observations" name="observaciones_recepcion" autoComplete="off" maxLength={2000} rows={3} className="form-input min-h-24 resize-y" placeholder="Ej.: rayón previo en el cuadro, cubierta trasera gastada..." />
        </label>
        <div className="space-y-2 text-sm font-semibold">
          <h4>Fotos de recepción <span className="text-[#a23d2d]">· al menos una obligatoria</span></h4>
          <ReceptionPhotoInput key={bicycleId} />
          <p className="text-xs font-normal text-[#748079]">La cámara solicita permiso y muestra una vista previa en vivo; en tablets intenta usar la cámara trasera. También podés elegir archivos como alternativa y combinar ambos orígenes. Se admiten hasta 5 fotos JPG, PNG o WebP de 4 MB como máximo cada una. La cámara requiere HTTPS (localhost en desarrollo).</p>
        </div>
      </section>

      <fieldset disabled={!inspectionComplete} className={`space-y-4 transition-opacity ${inspectionComplete ? "" : "opacity-50"}`}>
        <legend className="text-base font-bold text-ink">2. Elegí un servicio</legend>
        <p className="mt-1 text-sm text-[#748079]">{inspectionComplete ? "Elegí una categoría y seleccioná el paquete que corresponda. Podés elegir más de uno." : "Completá cada punto con su estado o marcá “No revisado” para habilitar los servicios."}</p>
        {services.length ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Categorías de servicio">
              {serviceCategoryFilters.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={activeServiceCategory === id}
                  onClick={() => setActiveServiceCategory(id)}
                  className={`min-h-11 rounded-xl px-4 text-sm font-bold transition ${activeServiceCategory === id ? "bg-forest text-white" : "border border-[#cddbcf] bg-white text-forest hover:bg-[#f2f7f1]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {services.filter((service) => service.categoria === activeServiceCategoryValue).map((service) => {
              const checked = selectedServiceSet.has(service.id);
              return (
                <label
                  key={service.id}
                  className={`block cursor-pointer rounded-2xl border p-4 transition ${checked ? "border-forest bg-[#f1f7ef] ring-2 ring-forest/15" : "border-[#e2e7e1] bg-white hover:border-[#aabdad]"}`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      name="servicio_id"
                      type="checkbox"
                      value={service.id}
                      checked={checked}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedServices((current) => toggleSelection(current, service.id, checked));
                        if (checked) {
                          const includedIds = new Set(service.processes.map((process) => process.id));
                          setSelectedProcesses((current) => current.filter((id) => !includedIds.has(id)));
                        }
                      }}
                      className="mt-0.5 h-6 w-6 shrink-0 accent-forest"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink">{service.nombre}</span>
                      <span className="mt-1 block text-xs font-medium text-forest">{service.categoria === "avanzado" ? "Detallado" : serviceCategories[service.categoria]}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-bold text-ink">${formatAmount(service.precio_base)}</span>
                  </span>
                  {checked ? (
                    <span className="mt-3 block border-t border-[#dce7da] pt-3">
                      <span className="block text-xs font-bold uppercase tracking-wide text-[#748079]">Procesos incluidos</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {service.processes.length
                          ? service.processes.map((process) => <span key={process.id} className="rounded-md bg-white px-2 py-1 text-xs text-[#414e47]">{process.nombre}</span>)
                          : <span className="text-xs text-[#748079]">Sin procesos asociados</span>}
                      </span>
                    </span>
                  ) : null}
                </label>
              );
            })}
            </div>
            {!services.some((service) => service.categoria === activeServiceCategoryValue) ? (
              <p className="mt-3 rounded-xl border border-dashed border-[#cdd6ce] bg-white px-4 py-6 text-center text-sm text-[#65716a]">Todavía no hay servicios de esta categoría en el catálogo.</p>
            ) : null}
          </>
        ) : <p className="mt-3 rounded-xl bg-[#f8faf7] p-4 text-sm text-[#65716a]">No hay paquetes cargados. Podés ingresar procesos adicionales.</p>}
      </fieldset>

      {inspectionComplete && (selectedServices.length || !services.length) ? <fieldset>
        <legend className="text-base font-bold text-ink">Agregados por componente</legend>
        <p className="mt-1 text-sm text-[#748079]">
          {selectedServices.length
            ? "Se aplica el descuento configurado para cada agregado adicional."
            : "Sin un servicio contratado, se cobra el precio de referencia completo."}
        </p>
        {processes.length ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {processComponentCategories.map((category) => {
                const categoryProcesses = processes.filter((process) => process.categoria_componente === category.id);
                const selectedCount = categoryProcesses.filter((process) => selectedProcessSet.has(process.id)).length;
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-controls="component-process-list"
                    onClick={() => setActiveCategory(isActive ? null : category.id)}
                    className={`flex min-h-28 flex-col items-start justify-between rounded-2xl border-2 p-4 text-left transition active:scale-[0.98] ${isActive ? "border-forest bg-[#edf4eb] shadow-sm" : "border-[#e2e7e1] bg-white hover:border-[#aabdad]"}`}
                  >
                    <span>
                      <span className="block text-base font-bold text-ink">{category.label}</span>
                      <span className="mt-1 block text-xs font-normal text-[#748079]">{category.description}</span>
                    </span>
                    <span className={`mt-3 text-xs font-semibold ${selectedCount ? "text-forest" : "text-[#87928b]"}`}>
                      {selectedCount ? `${selectedCount} seleccionado${selectedCount === 1 ? "" : "s"}` : `${categoryProcesses.length} proceso${categoryProcesses.length === 1 ? "" : "s"}`}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeCategory ? (
              <div id="component-process-list" className="mt-4 rounded-2xl border border-[#e2e7e1] bg-[#f8faf7] p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-ink">{processComponentCategories.find((category) => category.id === activeCategory)?.label}</h3>
                    <p className="mt-1 text-xs text-[#748079]">Tocá cada tarea para sumarla o quitarla de la orden.</p>
                  </div>
                  <button type="button" onClick={() => setActiveCategory(null)} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-forest hover:bg-white">Cerrar</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {processes.filter((process) => process.categoria_componente === activeCategory).map((process) => {
              const isIncluded = includedProcessIds.has(process.id);
              const discount = selectedServices.length ? process.descuento_servicio_pct : 0;
              const finalPrice = process.importe_referencia == null
                ? null
                : Math.round(process.importe_referencia * (100 - discount)) / 100;
              return (
                <label
                  key={process.id}
                  className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3 ${isIncluded || process.importe_referencia == null ? "cursor-not-allowed border-[#e8ece7] bg-[#f6f7f5] opacity-70" : "cursor-pointer border-[#e2e7e1] bg-white hover:border-[#aabdad]"}`}
                >
                  <input
                    name="proceso_id"
                    type="checkbox"
                    value={process.id}
                    checked={selectedProcessSet.has(process.id)}
                    disabled={isIncluded || process.importe_referencia == null}
                    onChange={(event) => setSelectedProcesses((current) => toggleSelection(current, process.id, event.target.checked))}
                    className="h-6 w-6 shrink-0 accent-forest"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{process.nombre}</span>
                    {isIncluded ? <span className="mt-1 block text-xs text-forest">Ya incluido en el servicio</span> : process.importe_referencia == null ? <span className="mt-1 block text-xs text-[#853321]">Definí el precio en Catálogo → Procesos</span> : selectedServices.length && discount > 0 ? <span className="mt-1 block text-xs text-forest">{discount}% de descuento</span> : null}
                  </span>
                  <span className="shrink-0 text-right">
                    {finalPrice == null ? <span className="text-xs text-[#748079]">Sin precio</span> : (
                      <>
                        {selectedServices.length && discount > 0 ? <span className="block text-xs text-[#87928b] line-through">${formatAmount(process.importe_referencia!)}</span> : null}
                        <span className="block text-sm font-bold text-ink">${formatAmount(finalPrice)}</span>
                      </>
                    )}
                  </span>
                </label>
                  );
                  })}
                  {processes.every((process) => process.categoria_componente !== activeCategory) ? <p className="col-span-full rounded-xl bg-white px-4 py-6 text-center text-sm text-[#748079]">Todavía no hay tareas en esta categoría. Podés clasificarlas en Catálogo → Procesos.</p> : null}
                </div>
              </div>
            ) : null}
            {selectedProcesses.length ? (
              <p className="mt-3 text-sm font-semibold text-forest" aria-live="polite">
                {selectedProcesses.length} proceso{selectedProcesses.length === 1 ? "" : "s"} adicional{selectedProcesses.length === 1 ? "" : "es"} seleccionado{selectedProcesses.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </>
        ) : <p className="mt-3 text-sm text-[#748079]">No hay procesos cargados.</p>}
      </fieldset> : null}

      <div className="grid gap-4 border-t border-[#edf0ec] pt-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold" htmlFor="order-due-date">
          Entrega estimada <span className="text-[#a23d2d]">*</span>
          <input id="order-due-date" name="fecha_entrega_estimada" autoComplete="off" type="date" required className="form-input" />
        </label>
        <label className="flex min-h-14 items-center gap-3 self-end rounded-xl border border-[#e2e7e1] bg-[#f8faf7] px-4 text-sm font-semibold" htmlFor="order-express">
          <input id="order-express" name="es_express" type="checkbox" className="h-5 w-5 accent-forest" />
          Servicio express
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f1f5ef] p-4 sm:p-5">
        <div>
          <p className="text-sm text-[#65716a]">Total estimado</p>
          <p className="text-2xl font-bold text-ink">${formatAmount(total)}</p>
          <p className="mt-1 text-xs text-[#748079]">Los precios quedan guardados como referencia. La recepción se cierra y se envía al mecánico; él la pasa a En proceso al comenzar. Los repuestos se conectarán en la etapa de integración externa.</p>
        </div>
        <button type="submit" disabled={!customerId || !bicycleId || !inspectionComplete || isLoadingBicycles || selectedServices.length + selectedProcesses.length === 0} className="min-h-14 w-full rounded-xl bg-forest px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          Cerrar recepción y enviar al mecánico
        </button>
      </div>
    </form>
  );
}
