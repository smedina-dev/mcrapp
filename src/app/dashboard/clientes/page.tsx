import Link from "next/link";
import { createCustomerAction } from "@/app/actions";
import { CustomerFields } from "@/components/customer-fields";
import { requireWorkshop } from "@/lib/workshop";

type CustomersPageProps = { searchParams: { q?: string; error?: string; creado?: string; actualizado?: string; return_to?: string; crear?: string } };
const isReceptionReturn = (returnTo?: string) => returnTo === "recepcion" || returnTo === "ordenes";

const SEARCH_RESULT_LIMIT = 20;
const SEARCH_COLUMNS = ["nombre_completo", "dni", "telefono", "email"] as const;

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { supabase, workshop } = await requireWorkshop();
  const query = searchParams.q?.trim() ?? "";
  const isCreateFormOpen = searchParams.crear === "1";
  let customers: {
    id: string;
    nombre_completo: string;
    dni: string | null;
    telefono: string;
    email: string | null;
  }[] = [];
  let hasMoreResults = false;

  if (query.length >= 2) {
    const searches = await Promise.all(SEARCH_COLUMNS.map((column) =>
      supabase.from("cliente")
        .select("id, nombre_completo, dni, telefono, email")
        .eq("taller_id", workshop.id)
        .ilike(column, `%${query}%`)
        .order("nombre_completo")
        .limit(SEARCH_RESULT_LIMIT + 1),
    ));
    const failedSearch = searches.find(({ error }) => error);
    if (failedSearch?.error) throw new Error(`No se pudo buscar clientes: ${failedSearch.error.message}`);

    const uniqueCustomers = new Map<string, (typeof customers)[number]>();
    for (const { data } of searches) {
      for (const customer of data ?? []) uniqueCustomers.set(customer.id, customer);
      if ((data?.length ?? 0) > SEARCH_RESULT_LIMIT) hasMoreResults = true;
    }
    const sortedCustomers = Array.from(uniqueCustomers.values())
      .sort((first, second) => first.nombre_completo.localeCompare(second.nombre_completo, "es-AR"));
    hasMoreResults ||= sortedCustomers.length > SEARCH_RESULT_LIMIT;
    customers = sortedCustomers.slice(0, SEARCH_RESULT_LIMIT);
  }

  const baseHref = isReceptionReturn(searchParams.return_to) ? "/dashboard/clientes?return_to=recepcion" : "/dashboard/clientes";
  const customerListHref = query ? `${baseHref}${baseHref.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}` : baseHref;
  const openCreateHref = `${customerListHref}${customerListHref.includes("?") ? "&" : "?"}crear=1`;
  const closeCreateHref = customerListHref;

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Relaciones</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Clientes</h1>
        <p className="mt-2 text-base text-[#65716a]">Registrá un cliente o buscá una ficha existente.</p>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{searchParams.error === "fecha" ? "La fecha de nacimiento no puede ser futura." : searchParams.error === "dni-duplicado" ? "Ya existe un cliente con ese DNI en este taller. Verificá el dato." : searchParams.error === "bicicleta" ? "No se pudo asociar la bicicleta. El cliente no se guardó." : "No se pudo guardar el cliente. Revisá los datos."}</p> : null}
      {searchParams.creado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Cliente registrado.</p> : null}
      {searchParams.actualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Datos del cliente actualizados.</p> : null}

      <section aria-label="Acciones de clientes" className="rounded-2xl border border-[#e2e7e1] bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form method="get" role="search" className="flex w-full flex-1 items-center gap-2 rounded-2xl border border-[#e2e7e1] bg-[#f8faf7] px-3 py-2">
            {isReceptionReturn(searchParams.return_to) ? <input type="hidden" name="return_to" value="recepcion" /> : null}
            <label className="sr-only" htmlFor="customer-search">Buscar clientes</label>
            <input id="customer-search" name="q" type="search" minLength={2} maxLength={100} defaultValue={query} placeholder="Buscar cliente" className="form-input mt-0 min-w-0 border-0 bg-transparent px-0 shadow-none focus:ring-0" />
            <button type="submit" className="min-h-10 shrink-0 rounded-xl bg-[#eef4ee] px-4 text-sm font-semibold text-forest hover:bg-[#e1eadf]">Buscar</button>
          </form>

          <Link
            href={isCreateFormOpen ? closeCreateHref : openCreateHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#125840]"
          >
            {isCreateFormOpen ? "Cancelar" : "Nuevo Cliente"}
          </Link>
        </div>
      </section>

      {isCreateFormOpen ? (
        <form id="nuevo-cliente" action={createCustomerAction} className="scroll-mt-6 mt-5 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
          {isReceptionReturn(searchParams.return_to) ? <input type="hidden" name="return_to" value="recepcion" /> : null}
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest">Registro</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Registrar cliente</h2>
            <p className="mt-1 text-sm text-[#748079]">Los campos opcionales pueden completarse después.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CustomerFields prefix="new-customer" />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="min-h-12 rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840]">Guardar cliente</button>
            <Link href={closeCreateHref} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#dfe7df] bg-white px-5 py-3 text-base font-semibold text-[#2d3c35] hover:bg-[#f7faf7]">Cancelar</Link>
          </div>
        </form>
      ) : null}

      <section aria-labelledby="customer-search-heading" className="mt-7">
        <h2 id="customer-search-heading" className="text-xl font-bold text-ink">Buscar cliente</h2>
        <p className="mt-1 text-sm text-[#748079]">Buscá por nombre, DNI, teléfono o correo electrónico.</p>
        {query.length < 2 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[#cdd6ce] bg-white px-5 py-8 text-center text-sm text-[#65716a]">Ingresá al menos 2 caracteres para buscar. No cargamos clientes hasta que hagas una búsqueda.</p>
        ) : (
          <>
            <p className="mt-4 px-1 text-sm text-[#748079]" aria-live="polite">
              {customers.length === 0 ? "No se encontraron clientes." : `Mostrando ${customers.length}${hasMoreResults ? " o más" : ""} ${customers.length === 1 ? "resultado" : "resultados"}.`}
            </p>
            <ul className="mt-3 space-y-2">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <Link href={`/dashboard/clientes/${customer.id}?q=${encodeURIComponent(query)}`} className="flex min-h-16 flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e2e7e1] bg-white px-5 py-3 shadow-sm transition hover:border-[#aabdad] hover:bg-[#f8faf7]">
                    <span>
                      <span className="block font-bold text-ink">{customer.nombre_completo}</span>
                      <span className="mt-1 block text-sm text-[#65716a]">DNI {customer.dni ?? "pendiente"} · {customer.telefono}{customer.email ? ` · ${customer.email}` : ""}</span>
                    </span>
                    <span className="text-sm font-bold text-forest">Ver ficha →</span>
                  </Link>
                </li>
              ))}
            </ul>
            {hasMoreResults ? <p className="mt-3 text-sm text-[#65716a]">Se muestran hasta {SEARCH_RESULT_LIMIT} resultados. Agregá más letras para precisar la búsqueda.</p> : null}
          </>
        )}
      </section>
    </>
  );
}
