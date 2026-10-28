import Link from "next/link";
import {
  addCustomerBicycleAction,
  transferBicycleAction,
  updateCustomerBicycleAction,
} from "@/app/actions";
import { bicycleDisciplines, formatDate } from "@/lib/presentation";
import type { Database } from "@/lib/database.types";

type Bicycle = Database["public"]["Tables"]["bicicleta"]["Row"];
type Customer = {
  id: string;
  nombre_completo: string;
  nombre: string | null;
  apellido: string | null;
  peso_kg: number | null;
};
type OwnershipEvent = {
  id: string;
  bicicleta_id: string;
  cliente_anterior_id: string | null;
  cliente_nuevo_id: string | null;
  fecha_cambio: string;
};

function displayCustomerName(customer: Customer) {
  return customer.nombre && customer.apellido
    ? `${customer.nombre} ${customer.apellido}`
    : customer.nombre_completo;
}

function BicycleFields({ bicycle }: { bicycle?: Bicycle }) {
  const prefix = bicycle?.id ?? "new";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold" htmlFor={`bike-brand-${prefix}`}>Marca
          <input id={`bike-brand-${prefix}`} name="marca" required maxLength={120} defaultValue={bicycle?.marca ?? ""} className="form-input" />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`bike-model-${prefix}`}>Modelo
          <input id={`bike-model-${prefix}`} name="modelo" required maxLength={160} defaultValue={bicycle?.modelo ?? ""} className="form-input" />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`bike-serial-${prefix}`}>Número de cuadro
          <input id={`bike-serial-${prefix}`} name="numero_serie" maxLength={100} defaultValue={bicycle?.numero_serie ?? ""} className="form-input" />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`bike-size-${prefix}`}>Talle
          <input id={`bike-size-${prefix}`} name="talle" maxLength={30} defaultValue={bicycle?.talle ?? ""} placeholder="S, M, L, 54..." className="form-input" />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`bike-color-${prefix}`}>Color
          <input id={`bike-color-${prefix}`} name="color" maxLength={80} defaultValue={bicycle?.color ?? ""} className="form-input" />
        </label>
      </div>
      <label className="block text-sm font-semibold" htmlFor={`bike-discipline-${prefix}`}>Disciplina
        <select id={`bike-discipline-${prefix}`} name="disciplina" required defaultValue={bicycle?.disciplina ?? "mtb_xc"} className="form-input">
          {Object.entries(bicycleDisciplines).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <details className="rounded-xl border border-[#e2e7e1] bg-[#fafbf9] p-4">
        <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-forest">Ruedas y suspensión <span className="ml-2 font-normal text-[#748079]">(opcional)</span></summary>
        <div className="mt-4 space-y-5">
          <label className="flex min-h-12 items-center gap-3 text-sm font-semibold" htmlFor={`bike-tubeless-${prefix}`}>
            <input id={`bike-tubeless-${prefix}`} name="tubelizada" type="checkbox" defaultChecked={bicycle?.tubelizada ?? false} className="h-5 w-5 accent-forest" />
            Tubelizada
          </label>
          <label className="block text-sm font-semibold" htmlFor={`bike-sealant-${prefix}`}>Tipo de líquido tubeless <span className="font-normal text-[#748079]">(requerido si está tubelizada)</span>
            <input id={`bike-sealant-${prefix}`} name="liquido_tubeless" maxLength={120} defaultValue={bicycle?.liquido_tubeless ?? ""} className="form-input" />
          </label>
          <fieldset className="space-y-4 border-t border-line pt-4">
            <legend className="px-1 text-sm font-bold text-ink">Horquilla delantera</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold" htmlFor={`bike-fork-pressure-${prefix}`}>Presión (PSI)
                <input id={`bike-fork-pressure-${prefix}`} name="presion_horquilla_psi" type="number" min={0} max={400} step="0.1" defaultValue={bicycle?.presion_horquilla_psi ?? 0} className="form-input" />
              </label>
              <label className="block text-sm font-semibold" htmlFor={`bike-fork-rebound-${prefix}`}>Clicks de rebote
                <input id={`bike-fork-rebound-${prefix}`} name="rebote_horquilla_clicks" type="number" min={0} max={100} step={1} defaultValue={bicycle?.rebote_horquilla_clicks ?? 0} className="form-input" />
              </label>
            </div>
          </fieldset>
          <label className="flex min-h-12 items-center gap-3 text-sm font-semibold" htmlFor={`bike-shock-${prefix}`}>
            <input id={`bike-shock-${prefix}`} name="tiene_shock" type="checkbox" defaultChecked={bicycle?.tiene_shock ?? false} className="h-5 w-5 accent-forest" />
            Tiene shock trasero
          </label>
          <fieldset className="space-y-4 border-t border-line pt-4">
            <legend className="px-1 text-sm font-bold text-ink">Configuración del shock <span className="font-normal text-[#748079]">(si tiene)</span></legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold" htmlFor={`bike-shock-pressure-${prefix}`}>Presión (PSI)
                <input id={`bike-shock-pressure-${prefix}`} name="presion_shock_psi" type="number" min={0} max={400} step="0.1" defaultValue={bicycle?.presion_shock_psi ?? ""} className="form-input" />
              </label>
              <label className="block text-sm font-semibold" htmlFor={`bike-shock-low-${prefix}`}>Clicks de rebote en baja
                <input id={`bike-shock-low-${prefix}`} name="rebote_shock_baja_clicks" type="number" min={0} max={100} step={1} defaultValue={bicycle?.rebote_shock_baja_clicks ?? ""} className="form-input" />
              </label>
              <label className="block text-sm font-semibold" htmlFor={`bike-shock-high-${prefix}`}>Clicks de rebote en alta
                <input id={`bike-shock-high-${prefix}`} name="rebote_shock_alta_clicks" type="number" min={0} max={100} step={1} defaultValue={bicycle?.rebote_shock_alta_clicks ?? ""} className="form-input" />
              </label>
            </div>
          </fieldset>
        </div>
      </details>
    </>
  );
}

type BicycleManagementProps = {
  customers: Customer[];
  selectedCustomer?: Customer;
  bicycles: Bicycle[];
  returnToReception?: boolean;
  query?: string;
  searchActive: boolean;
  hasMoreResults: boolean;
};

export function BicycleManagement({ customers, selectedCustomer, bicycles, returnToReception, query = "", searchActive, hasMoreResults }: BicycleManagementProps) {
  const customerMap = new Map(customers.map((customer) => [customer.id, displayCustomerName(customer)]));

  return (
    <>
      {searchActive && bicycles.length ? (
        <>
          <div className="mb-3 overflow-x-auto rounded-xl border border-[#e2e7e1] bg-white shadow-sm">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead className="bg-[#f2f6f0] text-xs uppercase tracking-wide text-[#65716a]">
                <tr>
                  <th scope="col" className="px-4 py-3">Bicicleta</th>
                  <th scope="col" className="px-4 py-3">N° de cuadro</th>
                  <th scope="col" className="px-4 py-3">Propietario</th>
                  <th scope="col" className="px-4 py-3">Disciplina / talle</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Ficha</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {bicycles.map((bicycle) => {
                  const bicycleName = [bicycle.marca ?? bicycle.marca_modelo, bicycle.modelo].filter(Boolean).join(" ");
                  return (
                    <tr key={bicycle.id} className="hover:bg-[#f8faf7]">
                      <th scope="row" className="px-4 py-3 font-semibold text-ink">{bicycleName}</th>
                      <td className="px-4 py-3 text-[#65716a]">{bicycle.numero_serie ?? "Sin registrar"}</td>
                      <td className="px-4 py-3 text-[#65716a]">{bicycle.cliente_id ? customerMap.get(bicycle.cliente_id) ?? "Cliente" : "Sin cliente asignado"}</td>
                      <td className="px-4 py-3 text-[#65716a]">{bicycle.disciplina ? bicycleDisciplines[bicycle.disciplina] : "Sin disciplina"}{bicycle.talle ? ` · ${bicycle.talle}` : ""}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/bicicletas/${bicycle.id}${query ? `?q=${encodeURIComponent(query)}` : ""}`} className="inline-flex min-h-10 items-center whitespace-nowrap font-bold text-forest underline-offset-2 hover:underline">Ver ficha →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMoreResults ? <p className="mb-4 text-sm text-[#65716a]">Se muestran hasta 50 bicicletas. Agregá más caracteres para precisar la búsqueda.</p> : null}
        </>
      ) : searchActive ? (
        <p className="mb-6 rounded-2xl border border-dashed border-[#cdd6ce] bg-white p-6 text-sm text-[#65716a]">No hay bicicletas que coincidan con la búsqueda.</p>
      ) : null}

      <details id="registrar-bicicleta" open={Boolean(selectedCustomer || returnToReception)} className="scroll-mt-6 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        <summary className="flex min-h-12 cursor-pointer items-center text-xl font-bold text-ink">Registrar bicicleta</summary>
        {selectedCustomer ? (
          <form action={addCustomerBicycleAction} className="mt-4">
            {returnToReception ? <input type="hidden" name="return_to" value="recepcion" /> : null}
            <div className="grid gap-4 xl:grid-cols-2">
              <input type="hidden" name="cliente_id" value={selectedCustomer.id} />
              <p className="rounded-xl bg-[#f2f6f0] px-4 py-3 text-sm font-semibold text-ink">Propietario seleccionado: {displayCustomerName(selectedCustomer)}{selectedCustomer.peso_kg ? ` · ${selectedCustomer.peso_kg} kg` : ""}</p>
              <BicycleFields />
            </div>
            <button type="submit" className="mt-5 min-h-14 rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840]">Guardar bicicleta</button>
            <Link href="/dashboard/bicicletas" className="ml-4 text-sm font-semibold text-forest hover:underline">Cambiar cliente</Link>
          </form>
        ) : <p className="mt-3 text-sm text-[#65716a]">Buscá un cliente arriba y elegilo para asociar la bicicleta.</p>}
      </details>
    </>
  );
}

type BicycleDetailProps = {
  bicycle: Bicycle;
  customers: Customer[];
  ownershipHistory: OwnershipEvent[];
};

export function BicycleDetail({ bicycle, customers, ownershipHistory }: BicycleDetailProps) {
  const customerMap = new Map(customers.map((customer) => [customer.id, displayCustomerName(customer)]));
  const owner = customers.find((customer) => customer.id === bicycle.cliente_id);
  const history = ownershipHistory.filter((event) => event.bicicleta_id === bicycle.id);
  const detailRows = [
    ["Número de cuadro", bicycle.numero_serie],
    ["Marca", bicycle.marca ?? bicycle.marca_modelo],
    ["Modelo", bicycle.modelo],
    ["Disciplina", bicycle.disciplina ? bicycleDisciplines[bicycle.disciplina] : null],
    ["Talle", bicycle.talle],
    ["Color", bicycle.color],
    ["Propietario", owner ? displayCustomerName(owner) : "Sin cliente asignado"],
    ["Tubeless", bicycle.tubelizada ? `Sí${bicycle.liquido_tubeless ? ` · ${bicycle.liquido_tubeless}` : ""}` : "No"],
    ["Horquilla", bicycle.horquilla],
    ["Presión de horquilla", `${bicycle.presion_horquilla_psi} PSI`],
    ["Rebote de horquilla", `${bicycle.rebote_horquilla_clicks} clicks`],
    ["Shock trasero", bicycle.tiene_shock ? bicycle.shock ?? "Sí, modelo sin registrar" : "No"],
    ["Presión de shock", bicycle.tiene_shock ? bicycle.presion_shock_psi != null ? `${bicycle.presion_shock_psi} PSI` : "Sin registrar" : "No aplica"],
    ["Rebote de shock en baja", bicycle.tiene_shock ? bicycle.rebote_shock_baja_clicks != null ? `${bicycle.rebote_shock_baja_clicks} clicks` : "Sin registrar" : "No aplica"],
    ["Rebote de shock en alta", bicycle.tiene_shock ? bicycle.rebote_shock_alta_clicks != null ? `${bicycle.rebote_shock_alta_clicks} clicks` : "Sin registrar" : "No aplica"],
    ["Primer service disponible", bicycle.primer_service_disponible ? "Sí" : "No"],
  ] as const;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e2e7e1] bg-white shadow-sm">
      <section aria-labelledby={`bicycle-data-${bicycle.id}`} className="border-b border-[#edf0ec] p-5 sm:p-6">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-forest">Datos técnicos</p>
          <h2 id={`bicycle-data-${bicycle.id}`} className="mt-1 text-lg font-bold text-ink">Ficha completa</h2>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {detailRows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-[#414e47]">{value || "Sin registrar"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <form action={updateCustomerBicycleAction} className="space-y-4 p-5 sm:p-6">
        <input type="hidden" name="id" value={bicycle.id} />
        <div className="border-b border-[#edf0ec] pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-forest">Ficha de bicicleta</p>
          <h2 className="mt-1 text-xl font-bold text-ink">{[bicycle.marca ?? bicycle.marca_modelo, bicycle.modelo].filter(Boolean).join(" ")}</h2>
          <p className="mt-1 text-sm text-[#65716a]">Propietario: {owner ? displayCustomerName(owner) : "Sin cliente asignado"}</p>
          <p className="mt-1 text-sm font-semibold text-forest">Peso para regulación: {owner?.peso_kg ? `${owner.peso_kg} kg` : "Sin registrar"}</p>
        </div>
        <BicycleFields bicycle={bicycle} />
        <button type="submit" className="w-full rounded-xl border border-[#cddbcf] px-4 py-3 text-base font-bold text-forest hover:bg-[#f2f7f1]">Guardar cambios</button>
      </form>
      <div className="space-y-4 border-t border-[#edf0ec] bg-[#fafbf9] p-5 sm:p-6">
        <form action={transferBicycleAction} className="space-y-3">
          <input type="hidden" name="bicicleta_id" value={bicycle.id} />
          <label className="block text-sm font-semibold" htmlFor={`new-owner-${bicycle.id}`}>{bicycle.cliente_id ? "Transferir a otro cliente" : "Asignar a un cliente"}
            <select id={`new-owner-${bicycle.id}`} name="nuevo_cliente_id" required className="form-input"><option value="">Seleccionar nuevo propietario</option>{customers.filter((customer) => customer.id !== bicycle.cliente_id).map((customer) => <option key={customer.id} value={customer.id}>{displayCustomerName(customer)}</option>)}</select>
          </label>
          <p className="text-xs text-[#65716a]">El cambio queda registrado y reinicia a cero la presión y el rebote de la horquilla y del shock.</p>
          <button type="submit" className="min-h-12 rounded-xl border border-[#e3c4bd] px-4 py-3 text-sm font-bold text-[#853321] hover:bg-[#fff4f1]">Confirmar cambio de propietario</button>
        </form>
        {history.length ? <div className="border-t border-line pt-3">
          <h3 className="text-sm font-bold text-ink">Historial de propietarios</h3>
          <ul className="mt-2 space-y-1 text-xs text-[#65716a]">{history.map((event) => <li key={event.id}>{customerMap.get(event.cliente_anterior_id ?? "") ?? "Propietario anterior"} → {customerMap.get(event.cliente_nuevo_id ?? "") ?? "Propietario nuevo"} · {formatDate(event.fecha_cambio)}</li>)}</ul>
        </div> : null}
      </div>
    </article>
  );
}
