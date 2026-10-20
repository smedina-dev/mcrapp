import Link from "next/link";
import { BicycleManagement } from "@/components/bicycle-management";
import type { Database } from "@/lib/database.types";
import { bicycleDisciplines } from "@/lib/presentation";
import { requireWorkshop } from "@/lib/workshop";

type Bicycle = Database["public"]["Tables"]["bicicleta"]["Row"];

type BicyclesPageProps = {
  searchParams: {
    q?: string;
    error?: string;
    biciAgregada?: string;
    biciActualizada?: string;
    transferida?: string;
    cliente_id?: string;
    return_to?: string;
  };
};

const CUSTOMER_SEARCH_COLUMNS = ["nombre_completo", "dni", "telefono", "email"] as const;
const BICYCLE_SEARCH_RESULT_LIMIT = 50;
const BICYCLE_SEARCH_COLUMNS = ["marca", "modelo", "marca_modelo", "numero_serie", "talle", "color"] as const;

export default async function BicyclesPage({ searchParams }: BicyclesPageProps) {
  const { supabase, workshop } = await requireWorkshop();
  const query = searchParams.q?.trim() ?? "";
  const isBicycleIdSearch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
  const [{ data: selectedCustomer, error: selectedCustomerError }, bicycleSearches, ownerSearches, bicycleIdSearch] = await Promise.all([
    searchParams.cliente_id
      ? supabase.from("cliente").select("id, nombre_completo, nombre, apellido, peso_kg")
        .eq("id", searchParams.cliente_id).eq("taller_id", workshop.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    query.length >= 2
      ? Promise.all(BICYCLE_SEARCH_COLUMNS.map((column) =>
        supabase.from("bicicleta").select("*")
          .eq("taller_id", workshop.id)
          .ilike(column, `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(BICYCLE_SEARCH_RESULT_LIMIT + 1),
      ))
      : Promise.resolve([]),
    query.length >= 2
      ? Promise.all(CUSTOMER_SEARCH_COLUMNS.map((column) =>
        supabase.from("cliente").select("id")
          .eq("taller_id", workshop.id)
          .ilike(column, `%${query}%`)
          .limit(BICYCLE_SEARCH_RESULT_LIMIT + 1),
      ))
      : Promise.resolve([]),
    isBicycleIdSearch
      ? supabase.from("bicicleta").select("*").eq("taller_id", workshop.id).eq("id", query).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (selectedCustomerError) throw new Error(`No se pudo cargar el cliente seleccionado: ${selectedCustomerError.message}`);
  if (bicycleIdSearch.error) throw new Error(`No se pudo buscar la bicicleta por ID: ${bicycleIdSearch.error.message}`);
  const failedBicycleSearch = bicycleSearches.find(({ error }) => error);
  if (failedBicycleSearch?.error) throw new Error(`No se pudieron buscar bicicletas: ${failedBicycleSearch.error.message}`);
  const failedOwnerSearch = ownerSearches.find(({ error }) => error);
  if (failedOwnerSearch?.error) throw new Error(`No se pudieron buscar propietarios de bicicletas: ${failedOwnerSearch.error.message}`);

  const matchingOwnerIds = Array.from(new Set(ownerSearches.flatMap(({ data }) => (data ?? []).map(({ id }) => id))));
  const bicycleMatches = new Map<string, Bicycle>();
  if (bicycleIdSearch.data) bicycleMatches.set(bicycleIdSearch.data.id, bicycleIdSearch.data);
  let hasMoreBicycleResults = false;
  for (const { data } of bicycleSearches) {
    if ((data?.length ?? 0) > BICYCLE_SEARCH_RESULT_LIMIT) hasMoreBicycleResults = true;
    for (const bicycle of data ?? []) bicycleMatches.set(bicycle.id, bicycle);
  }
  if (matchingOwnerIds.length) {
    const { data: ownerBicycles, error: ownerBicycleError } = await supabase.from("bicicleta").select("*")
      .eq("taller_id", workshop.id).in("cliente_id", matchingOwnerIds)
      .order("created_at", { ascending: false }).limit(BICYCLE_SEARCH_RESULT_LIMIT + 1);
    if (ownerBicycleError) throw new Error(`No se pudieron cargar bicicletas de los clientes encontrados: ${ownerBicycleError.message}`);
    if ((ownerBicycles?.length ?? 0) > BICYCLE_SEARCH_RESULT_LIMIT) hasMoreBicycleResults = true;
    for (const bicycle of ownerBicycles ?? []) bicycleMatches.set(bicycle.id, bicycle);
  }
  const bicycleRows = Array.from(bicycleMatches.values())
    .sort((first, second) => (second.created_at ?? "").localeCompare(first.created_at ?? ""));
  hasMoreBicycleResults ||= bicycleRows.length > BICYCLE_SEARCH_RESULT_LIMIT;
  const bicycles = bicycleRows.slice(0, BICYCLE_SEARCH_RESULT_LIMIT);
  const assignedCustomerIds = Array.from(new Set(
    bicycles.map((bicycle) => bicycle.cliente_id).filter((id): id is string => Boolean(id)),
  ));
  const { data: ownerRows, error: ownerError } = assignedCustomerIds.length
    ? await supabase.from("cliente").select("id, nombre_completo, nombre, apellido, peso_kg")
      .eq("taller_id", workshop.id).in("id", assignedCustomerIds)
    : { data: [], error: null };
  if (ownerError) throw new Error(`No se pudieron cargar los propietarios de las bicicletas: ${ownerError.message}`);
  const customers = ownerRows ?? [];
  const customerNames = new Map(customers.map((customer) => [
    customer.id,
    customer.nombre && customer.apellido ? `${customer.nombre} ${customer.apellido}` : customer.nombre_completo,
  ]));
  const filteredBicycles = query.length >= 2 ? bicycles.filter((bicycle) => {
    const haystack = [
      bicycle.id,
      bicycle.disciplina ? bicycleDisciplines[bicycle.disciplina] : "",
      bicycle.cliente_id ? customerNames.get(bicycle.cliente_id) : "Sin cliente asignado",
    ].filter(Boolean).join(" ").toLocaleLowerCase("es-AR");
    return haystack.includes(query.toLocaleLowerCase("es-AR"))
      || BICYCLE_SEARCH_COLUMNS.some((column) => {
        const value = bicycle[column];
        return typeof value === "string" && value.toLocaleLowerCase("es-AR").includes(query.toLocaleLowerCase("es-AR"));
      });
  }) : [];

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Relaciones</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Bicicletas</h1>
        <p className="mt-2 text-base text-[#65716a]">Ficha técnica, configuración y propietarios.</p>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{searchParams.error === "transferencia" ? "No se pudo transferir la bicicleta. Verificá el nuevo propietario." : "No se pudo guardar la bicicleta. Revisá los datos."}</p> : null}
      {searchParams.biciAgregada ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Bicicleta asociada al cliente.</p> : null}
      {searchParams.biciActualizada ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Configuración de bicicleta actualizada.</p> : null}
      {searchParams.transferida ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Bicicleta transferida. Se reinició la configuración de suspensión para el nuevo propietario.</p> : null}
      <form method="get" role="search" className="mb-4 flex gap-2 rounded-2xl border border-[#e2e7e1] bg-white p-3 shadow-sm">
        <label className="sr-only" htmlFor="bicycle-search">Buscar bicicletas</label>
        <input id="bicycle-search" name="q" type="search" defaultValue={searchParams.q ?? ""} placeholder="N° de cuadro / ID, marca, modelo o propietario" className="form-input mt-0 min-w-0" />
        <button type="submit" className="shrink-0 rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#125840]">Buscar</button>
        {searchParams.q ? <Link href="/dashboard/bicicletas" className="shrink-0 self-center text-sm font-semibold text-forest hover:underline">Limpiar</Link> : null}
      </form>
      <p className="mb-4 px-1 text-sm text-[#748079]" aria-live="polite">
        {query.length < 2
          ? "Ingresá al menos 2 caracteres para buscar. No cargamos bicicletas hasta que hagas una búsqueda."
          : `Mostrando ${filteredBicycles.length}${hasMoreBicycleResults ? " o más" : ""} ${filteredBicycles.length === 1 ? "bicicleta" : "bicicletas"}.`}
      </p>
      <section>
        <p className="rounded-xl bg-[#eaf1e9] px-4 py-3 text-sm text-[#40584a]">Las presiones se expresan en PSI; los valores de rebote, en clicks.</p>
        <div className="mt-4">
          <BicycleManagement customers={customers} selectedCustomer={selectedCustomer ?? undefined} bicycles={filteredBicycles} returnToOrders={searchParams.return_to === "ordenes"} query={searchParams.q?.trim()} searchActive={query.length >= 2} hasMoreResults={hasMoreBicycleResults} />
        </div>
      </section>
    </>
  );
}
