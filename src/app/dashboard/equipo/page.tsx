import { inviteEmployeeAction, updateEmployeeAction } from "@/app/actions";
import { requireAdmin } from "@/lib/workshop";
import type { Database } from "@/lib/database.types";

type Employee = Database["public"]["Tables"]["empleado"]["Row"];
type TeamPageProps = {
  searchParams: {
    error?: string;
    invitacionEnviada?: string;
    actualizado?: string;
  };
};

const accessRoles: Record<Employee["rol_acceso"], string> = {
  admin: "Administrador",
  jefe_taller: "Jefe de taller",
  empleado: "Empleado",
};

const employeeRanks: Record<Exclude<Employee["rango"], null>, string> = {
  ayudante_mecanico: "Ayudante de mecánico",
  embalador: "Embalador",
  mecanico: "Mecánico",
  mecanico_especializado: "Mecánico especializado",
  jefe_mecanicos: "Jefe de mecánicos",
};

function currentRankDuration(value: string | null) {
  if (!value) return "Rango pendiente";
  const start = new Date(`${value}T00:00:00Z`);
  const now = new Date();
  let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12
    + now.getUTCMonth() - start.getUTCMonth();
  if (now.getUTCDate() < start.getUTCDate()) months -= 1;
  if (months < 1) return "Menos de un mes";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years && remainingMonths) return `${years} a ${remainingMonths} m`;
  if (years) return `${years} ${years === 1 ? "año" : "años"}`;
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}

function EmployeeFields({ employee }: { employee: Employee }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold" htmlFor={`employee-name-${employee.id}`}>Nombre
          <input id={`employee-name-${employee.id}`} name="nombre" required maxLength={255} defaultValue={employee.nombre ?? ""} className="form-input" />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`employee-surname-${employee.id}`}>Apellido
          <input id={`employee-surname-${employee.id}`} name="apellido" required maxLength={255} defaultValue={employee.apellido ?? ""} className="form-input" />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`employee-birth-${employee.id}`}>Fecha de nacimiento
          <input id={`employee-birth-${employee.id}`} name="fecha_nacimiento" type="date" required defaultValue={employee.fecha_nacimiento ?? ""} className="form-input" />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`employee-hire-${employee.id}`}>Fecha de ingreso
          <input id={`employee-hire-${employee.id}`} name="fecha_ingreso" type="date" required defaultValue={employee.fecha_ingreso ?? ""} className="form-input" />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`employee-rank-${employee.id}`}>Rango laboral
          <select id={`employee-rank-${employee.id}`} name="rango" required defaultValue={employee.rango ?? ""} className="form-input">
            <option value="" disabled>Seleccionar rango</option>
            {Object.entries(employeeRanks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold" htmlFor={`employee-access-${employee.id}`}>Permisos del sistema
          <select id={`employee-access-${employee.id}`} name="rol_acceso" required defaultValue={employee.rol_acceso} className="form-input">
            {Object.entries(accessRoles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <label className="flex min-h-12 items-center gap-3 text-sm font-semibold" htmlFor={`employee-active-${employee.id}`}>
        <input id={`employee-active-${employee.id}`} name="activo" type="checkbox" defaultChecked={employee.activo} className="h-6 w-6 accent-forest" />
        Acceso activo
      </label>
    </>
  );
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const { supabase, workshop } = await requireAdmin();
  const { data: employees, error } = await supabase.from("empleado")
    .select("*")
    .eq("taller_id", workshop.id)
    .order("created_at");
  if (error) throw new Error("No se pudo cargar el equipo del taller.");

  return (
    <>
      <header className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Administración</p><h1 className="mt-2 text-3xl font-bold text-ink">Equipo y accesos</h1><p className="mt-2 text-sm text-[#65716a]">Invitá al personal, asigná rangos laborales y administrá sus permisos.</p></header>
      {searchParams.error ? <p role="alert" className="mb-5 border-l-2 border-[#ba4c35] bg-white px-4 py-3 text-sm text-[#853321]">
        {searchParams.error === "datos" ? "Revisá los datos ingresados." :
          searchParams.error === "configuracion" ? "Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SITE_URL tiene un formato inválido. Configurá las variables del servidor y reinicialo." :
            searchParams.error === "redireccion" ? "Supabase rechazó la URL de retorno. En Authentication → URL Configuration, permití la URL completa del callback, incluido ?next=/auth/accept-invite." :
              searchParams.error === "limite" ? "Supabase limitó los correos de invitación. Esperá antes de reintentar o configurá un proveedor SMTP propio." :
                searchParams.error === "credencial" ? "Supabase rechazó la clave administrativa (401). Verificá que SUPABASE_SERVICE_ROLE_KEY sea la clave secreta/service_role del mismo proyecto que NEXT_PUBLIC_SUPABASE_URL, que no haya sido revocada y reiniciá el servidor para cargarla." :
                  searchParams.error === "email" ? "Supabase no pudo enviar el correo. Revisá que Email esté habilitado y la configuración SMTP; el SMTP predeterminado puede limitar los destinatarios de prueba." :
                    searchParams.error === "correo-existente" ? "Ya existe un usuario o perfil con ese correo." :
                      searchParams.error === "perfil" ? "No se pudo guardar el perfil del empleado. La invitación se canceló." :
                        searchParams.error === "ultimo-admin" ? "El taller debe conservar al menos un administrador activo." :
                          searchParams.error === "admin-propio" ? "No podés quitarte tus propios permisos de administrador." :
                            "No se pudo actualizar el empleado."}
      </p> : null}
      {searchParams.invitacionEnviada ? <p role="status" className="mb-5 border-l-2 border-forest bg-white px-4 py-3 text-sm text-forest">Invitación enviada. El empleado deberá abrir el correo y crear su contraseña.</p> : null}
      {searchParams.actualizado ? <p role="status" className="mb-5 border-l-2 border-forest bg-white px-4 py-3 text-sm text-forest">Datos y permisos actualizados.</p> : null}

      <form action={inviteEmployeeAction} className="mb-8 border-t-2 border-forest bg-[#fbfcf8] p-5">
        <h2 className="text-xl font-bold text-ink">Invitar empleado</h2>
        <p className="mt-1 text-sm text-[#65716a]">Se enviará un correo para que la persona cree su contraseña. El rango y los permisos son independientes.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-semibold" htmlFor="invite-email">Correo electrónico
            <input id="invite-email" name="email" type="email" autoComplete="email" required maxLength={255} className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="invite-name">Nombre
            <input id="invite-name" name="nombre" required maxLength={255} className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="invite-surname">Apellido
            <input id="invite-surname" name="apellido" required maxLength={255} className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="invite-birth">Fecha de nacimiento
            <input id="invite-birth" name="fecha_nacimiento" type="date" required className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="invite-hire">Fecha de ingreso
            <input id="invite-hire" name="fecha_ingreso" type="date" required className="form-input" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="invite-rank">Rango laboral
            <select id="invite-rank" name="rango" required defaultValue="ayudante_mecanico" className="form-input">
              {Object.entries(employeeRanks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold" htmlFor="invite-access">Permisos del sistema
            <select id="invite-access" name="rol_acceso" required defaultValue="empleado" className="form-input">
              {Object.entries(accessRoles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <button type="submit" className="mt-5 w-full rounded-md bg-forest px-5 py-3 text-base font-bold text-white hover:bg-[#125840] sm:w-auto">Enviar invitación</button>
      </form>

      <section className="space-y-4">
        <div><h2 className="text-xl font-bold text-ink">Personal del taller</h2><p className="mt-1 text-sm text-[#65716a]">El tiempo en el rango se calcula desde la fecha de su último cambio.</p></div>
        {(employees ?? []).map((employee) => (
          <form key={employee.id} action={updateEmployeeAction} className="space-y-4 border border-line border-t-2 border-t-forest bg-[#fbfcf8] p-5">
            <input type="hidden" name="id" value={employee.id} />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h3 className="font-bold text-ink">{employee.nombre && employee.apellido ? `${employee.nombre} ${employee.apellido}` : "Perfil administrador pendiente de completar"}</h3><p className="text-sm text-[#65716a]">{employee.email}</p></div>
              <div className="text-right text-sm"><p className="font-semibold text-forest">{employee.rango ? employeeRanks[employee.rango] : "Rango pendiente"}</p><p className="text-xs text-[#748079]">{currentRankDuration(employee.fecha_inicio_rango)} en el rango actual</p></div>
            </div>
            <EmployeeFields employee={employee} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-xs text-[#65716a]">Permiso actual: {accessRoles[employee.rol_acceso]} · {employee.activo ? "Activo" : "Desactivado"}</p>
              <button type="submit" className="min-h-12 w-full rounded-md border border-forest px-5 py-3 text-base font-bold text-forest hover:bg-[#edf3ec] sm:w-auto">Guardar cambios</button>
            </div>
          </form>
        ))}
        {employees?.length === 0 ? <p className="border border-line bg-[#fbfcf8] p-6 text-sm text-[#65716a]">Todavía no hay empleados cargados.</p> : null}
      </section>
      <p className="mt-6 text-sm text-[#65716a]">Solo los administradores gestionan empleados y rangos. Los administradores y jefes de taller pueden administrar el catálogo de services.</p>
    </>
  );
}
