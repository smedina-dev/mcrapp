import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireWorkshop() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: employee, error: employeeError } = await supabase.from("empleado")
    .select("taller_id, rol_acceso, activo, nombre, apellido")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (employeeError) {
    throw new Error(
      `No se pudo validar el acceso del empleado (${employeeError.code}): ${employeeError.message}`
      + (employeeError.hint ? ` Hint: ${employeeError.hint}` : ""),
    );
  }
  if (employee && !employee.activo) redirect("/login?error=acceso");

  const workshopQuery = supabase.from("taller")
    .select("id, nombre, telefono, cuit_rut");
  const { data: workshop, error: workshopError } = employee
    ? await workshopQuery.eq("id", employee.taller_id).maybeSingle()
    : await workshopQuery.eq("user_id", user.id).maybeSingle();

  if (workshopError) throw new Error("No se pudo cargar el taller.");
  if (!workshop) redirect("/onboarding");
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  const employeeName = [employee?.nombre, employee?.apellido]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
  const displayName = employeeName
    || (typeof metadataName === "string" ? metadataName.trim() : "")
    || user.email?.split("@")[0]
    || "equipo";
  return {
    supabase,
    user,
    workshop,
    displayName,
    accessRole: employee?.rol_acceso ?? "admin",
  };
}

export async function requireAdmin() {
  const context = await requireWorkshop();
  if (context.accessRole !== "admin") redirect("/dashboard?error=permisos");
  return context;
}

export async function requireCatalogManager() {
  const context = await requireWorkshop();
  if (context.accessRole !== "admin" && context.accessRole !== "jefe_taller") {
    redirect("/dashboard?error=permisos");
  }
  return context;
}