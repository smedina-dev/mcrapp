import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomerAction } from "@/app/actions";
import { CustomerFields } from "@/components/customer-fields";
import { UnassignedBicycleLinker } from "@/components/unassigned-bicycle-linker";
import { appointmentStates, bicycleDisciplines, formatAmount, formatDate, workOrderStates } from "@/lib/presentation";
import { requireWorkshop } from "@/lib/workshop";

type CustomerDetailPageProps = {
  params: { id: string };
  searchParams: { error?: string; actualizado?: string; creado?: string; bicicletaVinculada?: string; q?: string };
};

export default async function CustomerDetailPage({ params, searchParams }: CustomerDetailPageProps) {
  const { supabase, workshop } = await requireWorkshop();
  const [
    { data: customer, error: customerError },
    { data: bicycles, error: bicyclesError },
    { data: unassignedBicycles, error: unassignedBicyclesError },
    { data: orders, error: ordersError },
    { data: appointments, error: appointmentsError },
  ] = await Promise.all([
    supabase.from("cliente")
      .select("id, nombre_completo, nombre, apellido, dni, fecha_nacimiento, altura_cm, peso_kg, telefono, email, direccion, created_at")
      .eq("id", params.id).eq("taller_id", workshop.id).maybeSingle(),
    supabase.from("bicicleta")
      .select("id, marca_modelo, marca, modelo, talle, color, tubelizada, liquido_tubeless, presion_horquilla_psi, rebote_horquilla_clicks, tiene_shock, presion_shock_psi, rebote_shock_baja_clicks, rebote_shock_alta_clicks, numero_serie, horquilla, shock, disciplina, primer_service_disponible, created_at")
      .eq("cliente_id", params.id).order("created_at", { ascending: false }),
    supabase.from("bicicleta")
      .select("id, marca_modelo, marca, modelo, numero_serie")
      .eq("taller_id", workshop.id).is("cliente_id", null).order("created_at", { ascending: false }),
    supabase.from("orden_trabajo")
      .select("id, numero_ot, estado, presupuesto_total, fecha_ingreso, fecha_entrega_estimada, fecha_cierre")
      .eq("taller_id", workshop.id).eq("cliente_id", params.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("agenda_turno")
      .select("id, bicicleta_id, fecha_hora, estado, observaciones")
      .eq("taller_id", workshop.id).eq("cliente_id", params.id).order("fecha_hora", { ascending: false }).limit(20),
  ]);
  if (customerError) throw new Error(`No se pudo cargar el cliente: ${customerError.message}`);
  if (bicyclesError) throw new Error(`No se pudieron cargar las bicicletas del cliente: ${bicyclesError.message}`);
  if (unassignedBicyclesError) throw new Error(`No se pudieron buscar bicicletas sin asignar: ${unassignedBicyclesError.message}`);
  if (ordersError) throw new Error(`No se pudieron cargar las órdenes del cliente: ${ordersError.message}`);
  if (appointmentsError) throw new Error(`No se pudieron cargar los turnos del cliente: ${appointmentsError.message}`);
  if (!customer) notFound();

  const backHref = searchParams.q
    ? `/dashboard/clientes?q=${encodeURIComponent(searchParams.q)}`
    : "/dashboard/clientes";
  const customerName = customer.nombre && customer.apellido
    ? `${customer.nombre} ${customer.apellido}`
    : customer.nombre_completo;
  const bicyclesById = new Map((bicycles ?? []).map((bicycle) => [bicycle.id, bicycle]));

  return (
    <>
      <Link href={backHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-forest hover:underline">← Volver a Clientes</Link>
      <header className="mb-6 mt-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Ficha del cliente</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{customerName}</h1>
        <p className="mt-2 text-base text-[#65716a]">Cliente desde {formatDate(customer.created_at)}</p>
      </header>
      {searchParams.error && searchParams.error !== "vincular-bicicleta" ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{searchParams.error === "fecha" ? "La fecha de nacimiento no puede ser futura." : searchParams.error === "dni-duplicado" ? "Ya existe un cliente con ese DNI en este taller." : "No se pudieron guardar los cambios. Revisá los datos e intentá de nuevo."}</p> : null}
      {searchParams.actualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Datos del cliente actualizados.</p> : null}
      {searchParams.creado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Cliente registrado. Completá o revisá su ficha.</p> : null}
      {searchParams.bicicletaVinculada ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Bicicleta vinculada al cliente.</p> : null}
      {searchParams.error === "vincular-bicicleta" ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo vincular la bicicleta. Puede que ya esté asignada o no pertenezca a este taller.</p> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-ink">Datos personales</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">DNI</dt><dd className="mt-1 text-sm text-[#414e47]">{customer.dni ?? "Sin registrar"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Teléfono</dt><dd className="mt-1 text-sm text-[#414e47]"><a className="text-forest hover:underline" href={`tel:${customer.telefono}`}>{customer.telefono}</a></dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Correo</dt><dd className="mt-1 break-all text-sm text-[#414e47]">{customer.email ?? "Sin registrar"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Dirección</dt><dd className="mt-1 text-sm text-[#414e47]">{customer.direccion ?? "Sin registrar"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Fecha de nacimiento</dt><dd className="mt-1 text-sm text-[#414e47]">{formatDate(customer.fecha_nacimiento)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Altura / peso</dt><dd className="mt-1 text-sm text-[#414e47]">{customer.altura_cm ? `${customer.altura_cm} cm` : "Altura sin registrar"} · {customer.peso_kg ? `${customer.peso_kg} kg` : "Peso sin registrar"}</dd></div>
          </dl>
          <details className="mt-5 border-t border-[#edf0ec] pt-3">
            <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-forest">Editar datos personales</summary>
            <form action={updateCustomerAction} className="mt-3 rounded-xl bg-[#f8faf7] p-4">
              <input type="hidden" name="id" value={customer.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <CustomerFields
                  prefix={`edit-customer-${customer.id}`}
                  customer={{
                    nombre: customer.nombre ?? customer.nombre_completo.split(" ")[0] ?? "",
                    apellido: customer.apellido ?? customer.nombre_completo.split(" ").slice(1).join(" "),
                    dni: customer.dni ?? "",
                    telefono: customer.telefono,
                    email: customer.email,
                    direccion: customer.direccion,
                    fecha_nacimiento: customer.fecha_nacimiento,
                    altura_cm: customer.altura_cm,
                    peso_kg: customer.peso_kg,
                  }}
                />
              </div>
              <button type="submit" className="mt-4 min-h-12 w-full rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#125840]">Guardar cambios</button>
            </form>
          </details>
        </section>

        <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold text-ink">Bicicletas</h2><p className="mt-1 text-sm text-[#748079]">{bicycles?.length ?? 0} asociadas</p></div>
            <Link href={`/dashboard/bicicletas?cliente_id=${customer.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-[#cddbcf] px-4 text-sm font-bold text-forest hover:bg-[#f2f7f1]">Agregar</Link>
          </div>
          <div className="mt-4 space-y-3">
            {(bicycles ?? []).map((bicycle) => (
              <article key={bicycle.id} className="rounded-xl bg-[#f8faf7] p-4">
                <h3 className="font-bold text-ink">{[bicycle.marca ?? bicycle.marca_modelo, bicycle.modelo].filter(Boolean).join(" ")}</h3>
                <p className="mt-1 text-sm text-[#65716a]">{bicycle.disciplina ? bicycleDisciplines[bicycle.disciplina] : "Disciplina sin registrar"}{bicycle.talle ? ` · Talle ${bicycle.talle}` : ""}{bicycle.color ? ` · ${bicycle.color}` : ""}</p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Número de serie</dt><dd className="mt-1 text-[#414e47]">{bicycle.numero_serie ?? "Sin registrar"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Tubeless</dt><dd className="mt-1 text-[#414e47]">{bicycle.tubelizada ? `Sí${bicycle.liquido_tubeless ? ` · ${bicycle.liquido_tubeless} ml` : ""}` : "No / sin registrar"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Horquilla</dt><dd className="mt-1 text-[#414e47]">{bicycle.horquilla ?? "Sin registrar"}{bicycle.presion_horquilla_psi ? ` · ${bicycle.presion_horquilla_psi} PSI` : ""}{bicycle.rebote_horquilla_clicks != null ? ` · ${bicycle.rebote_horquilla_clicks} clicks` : ""}</dd></div>
                  {bicycle.tiene_shock ? <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Shock</dt><dd className="mt-1 text-[#414e47]">{bicycle.shock ?? "Sin registrar"}{bicycle.presion_shock_psi ? ` · ${bicycle.presion_shock_psi} PSI` : ""}{bicycle.rebote_shock_baja_clicks != null ? ` · ${bicycle.rebote_shock_baja_clicks} clicks bajos` : ""}{bicycle.rebote_shock_alta_clicks != null ? ` · ${bicycle.rebote_shock_alta_clicks} clicks altos` : ""}</dd></div> : null}
                </dl>
              </article>
            ))}
            {!bicycles?.length ? <p className="rounded-xl border border-dashed border-[#cdd6ce] px-4 py-6 text-center text-sm text-[#65716a]">Todavía no tiene bicicletas asociadas.</p> : null}
          </div>
          <UnassignedBicycleLinker customerId={customer.id} bicycles={unassignedBicycles ?? []} />
        </section>

        <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-ink">Órdenes de trabajo</h2><Link href={`/dashboard/recepcion?cliente_id=${customer.id}`} className="text-sm font-bold text-forest hover:underline">Nueva recepción</Link></div>
          <ul className="mt-4 divide-y divide-[#edf0ec]">
            {(orders ?? []).map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-semibold text-ink">OT #{order.numero_ot} · {order.estado ? workOrderStates[order.estado] : "Sin estado"}</p><p className="mt-1 text-sm text-[#65716a]">{formatDate(order.fecha_ingreso)}{order.fecha_entrega_estimada ? ` · Entrega estimada ${formatDate(order.fecha_entrega_estimada)}` : ""}</p></div>
                <p className="text-sm font-bold text-forest">${formatAmount(order.presupuesto_total)}</p>
              </li>
            ))}
          </ul>
          {!orders?.length ? <p className="mt-3 text-sm text-[#65716a]">Todavía no hay órdenes registradas.</p> : null}
          {(orders?.length ?? 0) >= 20 ? <p className="mt-3 text-xs text-[#748079]">Se muestran las 20 órdenes más recientes.</p> : null}
        </section>

        <section className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-ink">Turnos</h2>
          <ul className="mt-4 divide-y divide-[#edf0ec]">
            {(appointments ?? []).map((appointment) => (
              <li key={appointment.id} className="py-3">
                <p className="font-semibold text-ink">{formatDate(appointment.fecha_hora, { dateStyle: "medium", timeStyle: "short" })} · {appointment.estado ? appointmentStates[appointment.estado] : "Sin estado"}</p>
                <p className="mt-1 text-sm text-[#65716a]">{bicyclesById.get(appointment.bicicleta_id)?.marca_modelo ?? "Bicicleta"}{appointment.observaciones ? ` · ${appointment.observaciones}` : ""}</p>
              </li>
            ))}
          </ul>
          {!appointments?.length ? <p className="mt-3 text-sm text-[#65716a]">Todavía no hay turnos registrados.</p> : null}
          {(appointments?.length ?? 0) >= 20 ? <p className="mt-3 text-xs text-[#748079]">Se muestran los 20 turnos más recientes.</p> : null}
        </section>
      </div>
    </>
  );
}
