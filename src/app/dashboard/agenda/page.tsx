import Link from "next/link";
import { createAppointmentAction, updateAppointmentStateAction } from "@/app/actions";
import { AppointmentDateInput } from "@/components/appointment-date-input";
import { appointmentStates, formatDate } from "@/lib/presentation";
import { requireWorkshop } from "@/lib/workshop";

type AgendaPageProps = { searchParams: { error?: string; creado?: string; actualizado?: string } };

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const { supabase, workshop } = await requireWorkshop();
  const [{ data: customers }, { data: bicycles }, { data: appointments }] = await Promise.all([
    supabase.from("cliente").select("id, nombre_completo").eq("taller_id", workshop.id).order("nombre_completo"),
    supabase.from("bicicleta").select("id, cliente_id, marca_modelo").order("created_at", { ascending: false }),
    supabase.from("agenda_turno").select("id, cliente_id, bicicleta_id, fecha_hora, estado, observaciones")
      .eq("taller_id", workshop.id).order("fecha_hora", { ascending: true }),
  ]);
  const customerNames = new Map((customers ?? []).map((customer) => [customer.id, customer.nombre_completo]));
  const bicycleNames = new Map((bicycles ?? []).map((bicycle) => [bicycle.id, bicycle.marca_modelo]));
  const canCreateAppointment = Boolean(customers?.length && bicycles?.length);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Planificación</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Agenda</h1>
        <p className="mt-2 text-base text-[#65716a]">Organizá los ingresos y la recepción de bicicletas.</p>
      </header>
      {searchParams.error ? <p role="alert" className="mb-5 rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">No se pudo completar la operación. Revisá cliente, bicicleta y fecha.</p> : null}
      {searchParams.creado || searchParams.actualizado ? <p role="status" className="mb-5 rounded-xl border border-[#d6e6d9] bg-[#f2f8f1] px-4 py-3 text-sm font-medium text-forest">Agenda actualizada.</p> : null}
      <section className="mb-7 rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest">Planificación</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Reservar un turno</h2>
        {canCreateAppointment ? <form action={createAppointmentAction} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
          <label className="block text-sm font-semibold" htmlFor="appointment-customer">Cliente<select id="appointment-customer" name="cliente_id" required className="form-input"><option value="">Seleccionar cliente</option>{(customers ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.nombre_completo}</option>)}</select></label>
          <label className="block text-sm font-semibold" htmlFor="appointment-bike">Bicicleta<select id="appointment-bike" name="bicicleta_id" required className="form-input"><option value="">Seleccionar bicicleta</option>{(bicycles ?? []).filter((bicycle) => bicycle.cliente_id).map((bicycle) => <option key={bicycle.id} value={bicycle.id}>{bicycleNames.get(bicycle.id)} · {customerNames.get(bicycle.cliente_id ?? "")}</option>)}</select></label>
          <label className="block text-sm font-semibold">Fecha y hora<AppointmentDateInput /></label>
          <label className="block text-sm font-semibold" htmlFor="appointment-notes">Observaciones<input id="appointment-notes" name="observaciones" maxLength={2000} className="form-input" /></label>
          <button type="submit" className="min-h-14 rounded-xl bg-forest px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#125840] sm:col-span-2 xl:col-span-4 xl:justify-self-end">Reservar turno</button>
        </form> : <p className="mt-3 text-sm text-[#65716a]">Primero registrá un cliente con bicicleta. <Link href="/dashboard/clientes" className="font-semibold text-forest hover:underline">Ir a clientes</Link></p>}
      </section>
      <section aria-label="Turnos" className="space-y-3">
        <div className="px-1"><h2 className="text-xl font-bold text-ink">Turnos agendados</h2><p className="mt-1 text-sm text-[#748079]">{appointments?.length ?? 0} en total</p></div>
        {(appointments ?? []).map((appointment) => (
          <article key={appointment.id} className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-forest">Fecha y hora</p>
                <h3 className="mt-1 text-lg font-bold text-ink">{formatDate(appointment.fecha_hora, { dateStyle: "medium", timeStyle: "short" })}</h3>
              </div>
              <p className="rounded-full bg-[#f0f3ef] px-3 py-1.5 text-sm font-semibold text-[#59665e]">{customerNames.get(appointment.cliente_id) ?? "Cliente"}</p>
            </div>
            <div className="mt-4 grid gap-3 border-t border-[#edf0ec] pt-4 sm:grid-cols-2">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Bicicleta</p><p className="mt-1 font-medium text-ink">{bicycleNames.get(appointment.bicicleta_id) ?? "Bicicleta"}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-[#87928b]">Observaciones</p><p className="mt-1 text-sm text-[#414e47]">{appointment.observaciones || "Sin observaciones"}</p></div>
            </div>
            <form action={updateAppointmentStateAction} className="mt-4 flex flex-col gap-3 border-t border-[#edf0ec] pt-4 sm:flex-row sm:items-end">
              <input type="hidden" name="id" value={appointment.id} />
              <label className="block flex-1 text-sm font-semibold text-[#414e47]">Estado del turno
                <select name="estado" aria-label={`Estado del turno de ${customerNames.get(appointment.cliente_id) ?? "cliente"}`} defaultValue={appointment.estado ?? "pendiente"} className="form-input">{Object.entries(appointmentStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </label>
              <button type="submit" className="min-h-14 rounded-xl border border-[#cddbcf] px-6 text-base font-bold text-forest hover:bg-[#f2f7f1]">Guardar estado</button>
            </form>
          </article>
        ))}
        {appointments?.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cdd6ce] bg-white px-5 py-10 text-center text-sm text-[#65716a]">No hay turnos registrados.</div> : null}
      </section>
    </>
  );
}