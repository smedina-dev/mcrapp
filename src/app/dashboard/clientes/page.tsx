import Link from "next/link";
import { createCustomerAction } from "@/app/actions";
import { CustomerFields } from "@/components/customer-fields";
import { requireWorkshop } from "@/lib/workshop";

type CustomersPageProps = { searchParams: { q?: string; error?: string; creado?: string; actualizado?: string; return_to?: string } };

const SEARCH_RESULT_LIMIT = 20;
const SEARCH_COLUMNS = ["nombre_completo", "dni", "telefono", "email"] as const;

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { supabase, workshop } = await requireWorkshop();
  const query = searchParams.q?.trim() ?? "";
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

      <form id="nuevo-cliente" action={createCustomerAction} className="scroll-mt-6 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        {searchParams.return_to === "ordenes" ? <input type="hidden" name="return_to" value="ordenes" /> : null}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest">Registro</p>
          <h2 className="mt-1 text-xl font-bold text-ink">Registrar cliente</h2>
          <p className="mt-1 text-sm text-[#748079]">Los campos opcionales pueden completarse después.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <CustomerFields prefix="new-customer" />
        </div>
        <button type="submit" className="mt-5 min-h-12 w-full rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840] sm:w-auto">Guardar cliente</button>
      </form>

      <section aria-labelledby="customer-search-heading" className="mt-7">
        <h2 id="customer-search-heading" className="text-xl font-bold text-ink">Buscar cliente</h2>
        <p className="mt-1 text-sm text-[#748079]">Buscá por nombre, DNI, teléfono o correo electrónico.</p>
        <form method="get" role="search" className="mt-3 flex gap-2 rounded-2xl border border-[#e2e7e1] bg-white p-3 shadow-sm">
          {searchParams.return_to === "ordenes" ? <input type="hidden" name="return_to" value="ordenes" /> : null}
          <label className="sr-only" htmlFor="customer-search">Buscar clientes</label>
          <input id="customer-search" name="q" type="search" minLength={2} maxLength={100} defaultValue={query} placeholder="Nombre, DNI, teléfono o correo" className="form-input mt-0 min-w-0" />
          <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#125840]">Buscar</button>
          {query ? <Link href={searchParams.return_to === "ordenes" ? "/dashboard/clientes?return_to=ordenes" : "/dashboard/clientes"} className="shrink-0 self-center text-sm font-semibold text-forest hover:underline">Limpiar</Link> : null}
        </form>
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
