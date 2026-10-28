"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireCatalogManager, requireWorkshop } from "@/lib/workshop";
import { buildInspectionResults } from "@/lib/bicycle-inspection";
import {
  appointmentSchema,
  appointmentStateSchema,
  bicycleSchema,
  customerSchema,
  employeeInvitationSchema,
  employeeUpdateSchema,
  invitationPasswordSchema,
  processSchema,
  serviceSchema,
  serviceProcessesSchema,
  updateServiceProcessSchema,
  updateCustomerSchema,
  signInSchema,
  signUpSchema,
  workOrderSchema,
  workOrderStateSchema,
  workshopSchema,
  transferBicycleSchema,
  linkBicycleToCustomerSchema,
  updateBicycleSchema,
} from "@/lib/validations";

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function discardUnfinishedOrder(
  supabase: ReturnType<typeof createClient>,
  workshopId: string,
  orderId: string,
  paths: string[],
) {
  const { error: storageError } = paths.length
    ? await supabase.storage.from("ordenes-trabajo").remove(paths)
    : { error: null };
  const { data: deletedOrder, error: orderError } = await supabase.from("orden_trabajo")
    .delete()
    .eq("id", orderId)
    .eq("taller_id", workshopId)
    .select("id")
    .maybeSingle();

  if (storageError || orderError || !deletedOrder) {
    throw new Error(
      `No se pudo limpiar la orden de recepción incompleta.`
      + (storageError ? ` Storage: ${storageError.message}.` : "")
      + (orderError ? ` Orden: ${orderError.message}.` : "")
      + (!deletedOrder && !orderError ? " No se encontró la orden para eliminar." : ""),
    );
  }
}

export async function signInAction(formData: FormData) {
  const parsed = signInSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/login?error=datos");
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=credenciales");
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/login?error=datos");
  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: new URL("/auth/callback", siteUrl).toString() },
  });
  if (error) redirect("/login?error=registro");
  if (!data.session) redirect("/login?message=confirmacion");
  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createWorkshopAction(formData: FormData) {
  const parsed = workshopSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/onboarding?error=datos");
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) redirect("/login");

  const { data: workshop, error } = await supabase.from("taller").insert({
    user_id: user.id,
    nombre: parsed.data.nombre,
    cuit_rut: parsed.data.cuit_rut || null,
    telefono: parsed.data.telefono || null,
  }).select("id").single();
  if (error) redirect("/onboarding?error=guardado");
  const { error: employeeError } = await supabase.from("empleado").insert({
    taller_id: workshop.id,
    auth_user_id: user.id,
    email: user.email,
    rol_acceso: "admin",
  });
  if (employeeError) throw new Error(`No se pudo crear el perfil administrativo del taller: ${employeeError.message}`);
  redirect("/dashboard");
}

export async function createCustomerAction(formData: FormData) {
  const parsed = customerSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/clientes?error=datos");
  const returnToReception = formData.get("return_to") === "recepcion" || formData.get("return_to") === "ordenes";
  const nombreCompleto = `${parsed.data.nombre} ${parsed.data.apellido}`;
  if (parsed.data.fecha_nacimiento && new Date(`${parsed.data.fecha_nacimiento}T00:00:00Z`) > new Date()) {
    redirect("/dashboard/clientes?error=fecha");
  }
  const { supabase, workshop } = await requireWorkshop();
  const { data: customer, error } = await supabase.from("cliente").insert({
    taller_id: workshop.id,
    nombre_completo: nombreCompleto,
    nombre: parsed.data.nombre,
    apellido: parsed.data.apellido,
    dni: parsed.data.dni,
    telefono: parsed.data.telefono,
    email: parsed.data.email || null,
    direccion: parsed.data.direccion || null,
    fecha_nacimiento: parsed.data.fecha_nacimiento || null,
    altura_cm: parsed.data.altura_cm || null,
    peso_kg: parsed.data.peso_kg || null,
  }).select("id").single();
  if (error) redirect(`/dashboard/clientes?error=${error.code === "23505" ? "dni-duplicado" : "guardado"}`);

  let createdBicycleId: string | null = null;
  if (parsed.data.bicicleta) {
    const { data: bicycle, error: bicycleError } = await supabase.from("bicicleta").insert({
      taller_id: workshop.id,
      cliente_id: customer.id,
      marca_modelo: parsed.data.bicicleta,
      disciplina: parsed.data.bicicleta_disciplina ?? "mtb_xc",
    }).select("id").single();
    if (bicycleError) {
      await supabase.from("cliente").delete().eq("id", customer.id).eq("taller_id", workshop.id);
      redirect("/dashboard/clientes?error=bicicleta");
    }
    createdBicycleId = bicycle.id;
  }

  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/recepcion");
  revalidatePath("/dashboard/ordenes");
  revalidatePath("/dashboard");
  if (returnToReception) {
    const bicycleQuery = createdBicycleId ? `&bicicleta_id=${createdBicycleId}` : "";
    redirect(`/dashboard/recepcion?cliente_id=${customer.id}${bicycleQuery}`);
  }
  redirect(`/dashboard/clientes/${customer.id}?creado=1`);
}

export async function updateCustomerAction(formData: FormData) {
  const parsed = updateCustomerSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/clientes?error=datos");
  if (parsed.data.fecha_nacimiento && new Date(`${parsed.data.fecha_nacimiento}T00:00:00Z`) > new Date()) {
    redirect(`/dashboard/clientes/${parsed.data.id}?error=fecha`);
  }

  const { supabase, workshop } = await requireWorkshop();
  const nombreCompleto = `${parsed.data.nombre} ${parsed.data.apellido}`;
  const { data, error } = await supabase.from("cliente").update({
    nombre_completo: nombreCompleto,
    nombre: parsed.data.nombre,
    apellido: parsed.data.apellido,
    dni: parsed.data.dni,
    telefono: parsed.data.telefono,
    email: parsed.data.email || null,
    direccion: parsed.data.direccion || null,
    fecha_nacimiento: parsed.data.fecha_nacimiento || null,
    altura_cm: parsed.data.altura_cm || null,
    peso_kg: parsed.data.peso_kg || null,
  }).eq("id", parsed.data.id).eq("taller_id", workshop.id).select("id").maybeSingle();
  if (error) redirect(`/dashboard/clientes/${parsed.data.id}?error=${error.code === "23505" ? "dni-duplicado" : "guardado"}`);
  if (!data) redirect(`/dashboard/clientes/${parsed.data.id}?error=guardado`);

  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/clientes/${parsed.data.id}`);
  revalidatePath("/dashboard/bicicletas");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/recepcion");
  revalidatePath("/dashboard/ordenes");
  revalidatePath("/dashboard");
  redirect(`/dashboard/clientes/${parsed.data.id}?actualizado=1`);
}

export async function addCustomerBicycleAction(formData: FormData) {
  const parsed = bicycleSchema.safeParse({
    ...formValues(formData),
    tubelizada: formData.get("tubelizada") === "on",
    tiene_shock: formData.get("tiene_shock") === "on",
  });
  if (!parsed.success) redirect("/dashboard/bicicletas?error=bicicleta");
  const { supabase, workshop } = await requireWorkshop();
  const { data: customer } = await supabase.from("cliente").select("id")
    .eq("id", parsed.data.cliente_id).eq("taller_id", workshop.id).maybeSingle();
  if (!customer) redirect("/dashboard/bicicletas?error=bicicleta");

  const { data: bicycle, error } = await supabase.from("bicicleta").insert({
    taller_id: workshop.id,
    cliente_id: customer.id,
    marca: parsed.data.marca,
    modelo: parsed.data.modelo,
    numero_serie: parsed.data.numero_serie || null,
    marca_modelo: `${parsed.data.marca} ${parsed.data.modelo}`.trim(),
    talle: parsed.data.talle || null,
    color: parsed.data.color || null,
    tubelizada: parsed.data.tubelizada,
    liquido_tubeless: parsed.data.tubelizada ? parsed.data.liquido_tubeless : null,
    presion_horquilla_psi: parsed.data.presion_horquilla_psi ?? 0,
    rebote_horquilla_clicks: parsed.data.rebote_horquilla_clicks ?? 0,
    tiene_shock: parsed.data.tiene_shock,
    presion_shock_psi: parsed.data.tiene_shock ? parsed.data.presion_shock_psi ?? 0 : null,
    rebote_shock_baja_clicks: parsed.data.tiene_shock ? parsed.data.rebote_shock_baja_clicks ?? 0 : null,
    rebote_shock_alta_clicks: parsed.data.tiene_shock ? parsed.data.rebote_shock_alta_clicks ?? 0 : null,
    disciplina: parsed.data.disciplina,
  }).select("id").single();
  if (error) redirect("/dashboard/bicicletas?error=bicicleta");
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/bicicletas");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/ordenes");
  revalidatePath("/dashboard");
  if (formData.get("return_to") === "recepcion" || formData.get("return_to") === "ordenes") {
    redirect(`/dashboard/recepcion?cliente_id=${customer.id}&bicicleta_id=${bicycle.id}`);
  }
  redirect("/dashboard/bicicletas?biciAgregada=1");
}

export async function updateCustomerBicycleAction(formData: FormData) {
  const parsed = updateBicycleSchema.safeParse({
    ...formValues(formData),
    tubelizada: formData.get("tubelizada") === "on",
    tiene_shock: formData.get("tiene_shock") === "on",
  });
  if (!parsed.success) redirect("/dashboard/bicicletas?error=bicicleta");
  const { supabase, workshop } = await requireWorkshop();
  const { data: bicycle, error } = await supabase.from("bicicleta").update({
    marca: parsed.data.marca,
    modelo: parsed.data.modelo,
    numero_serie: parsed.data.numero_serie || null,
    marca_modelo: `${parsed.data.marca} ${parsed.data.modelo}`.trim(),
    talle: parsed.data.talle || null,
    color: parsed.data.color || null,
    tubelizada: parsed.data.tubelizada,
    liquido_tubeless: parsed.data.tubelizada ? parsed.data.liquido_tubeless : null,
    presion_horquilla_psi: parsed.data.presion_horquilla_psi ?? 0,
    rebote_horquilla_clicks: parsed.data.rebote_horquilla_clicks ?? 0,
    tiene_shock: parsed.data.tiene_shock,
    presion_shock_psi: parsed.data.tiene_shock ? parsed.data.presion_shock_psi ?? 0 : null,
    rebote_shock_baja_clicks: parsed.data.tiene_shock ? parsed.data.rebote_shock_baja_clicks ?? 0 : null,
    rebote_shock_alta_clicks: parsed.data.tiene_shock ? parsed.data.rebote_shock_alta_clicks ?? 0 : null,
    disciplina: parsed.data.disciplina,
  }).eq("id", parsed.data.id).select("id").maybeSingle();
  if (error || !bicycle) redirect(`/dashboard/bicicletas/${parsed.data.id}?error=bicicleta`);
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/bicicletas");
  revalidatePath(`/dashboard/bicicletas/${parsed.data.id}`);
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/ordenes");
  redirect(`/dashboard/bicicletas/${parsed.data.id}?actualizado=1`);
}

export async function transferBicycleAction(formData: FormData) {
  const parsed = transferBicycleSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/bicicletas?error=transferencia");
  const { supabase, workshop } = await requireWorkshop();
  const [{ data: targetCustomer }, { data: bicycle }] = await Promise.all([
    supabase.from("cliente").select("id")
      .eq("id", parsed.data.nuevo_cliente_id).eq("taller_id", workshop.id).maybeSingle(),
    supabase.from("bicicleta").select("id, cliente_id")
      .eq("id", parsed.data.bicicleta_id).maybeSingle(),
  ]);
  if (!targetCustomer || !bicycle || bicycle.cliente_id === targetCustomer.id) {
    redirect(`/dashboard/bicicletas/${parsed.data.bicicleta_id}?error=transferencia`);
  }

  const { error } = await supabase.from("bicicleta")
    .update({ cliente_id: targetCustomer.id }).eq("id", bicycle.id);
  if (error) redirect(`/dashboard/bicicletas/${bicycle.id}?error=transferencia`);
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/bicicletas");
  revalidatePath(`/dashboard/bicicletas/${bicycle.id}`);
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/ordenes");
  revalidatePath("/dashboard");
  redirect(`/dashboard/bicicletas/${bicycle.id}?transferida=1`);
}

export async function linkBicycleToCustomerAction(formData: FormData) {
  const parsed = linkBicycleToCustomerSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect(`/dashboard/clientes/${formData.get("cliente_id")}?error=vincular-bicicleta`);
  const { supabase, workshop } = await requireWorkshop();
  const { data: customer } = await supabase.from("cliente").select("id")
    .eq("id", parsed.data.cliente_id).eq("taller_id", workshop.id).maybeSingle();
  if (!customer) redirect(`/dashboard/clientes/${parsed.data.cliente_id}?error=vincular-bicicleta`);

  const { data: bicycle, error } = await supabase.from("bicicleta")
    .update({ cliente_id: customer.id })
    .eq("id", parsed.data.bicicleta_id)
    .eq("taller_id", workshop.id)
    .is("cliente_id", null)
    .select("id")
    .maybeSingle();
  if (error || !bicycle) redirect(`/dashboard/clientes/${customer.id}?error=vincular-bicicleta`);

  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/clientes/${customer.id}`);
  revalidatePath("/dashboard/bicicletas");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/ordenes");
  revalidatePath("/dashboard");
  redirect(`/dashboard/clientes/${customer.id}?bicicletaVinculada=1`);
}

export async function createServiceAction(formData: FormData) {
  const parsed = serviceSchema.safeParse({
    ...formValues(formData),
    proceso_ids: formData.getAll("proceso_id"),
  });
  if (!parsed.success) redirect("/dashboard/servicios?error=datos");
  const { supabase, workshop } = await requireCatalogManager();
  const { error } = await supabase.rpc("crear_servicio_con_procesos", {
    p_taller_id: workshop.id,
    p_nombre: parsed.data.nombre,
    p_categoria: parsed.data.categoria,
    p_precio_base: parsed.data.precio_base,
    p_tiempo_estimado_min: parsed.data.tiempo_estimado_min,
    p_proceso_ids: parsed.data.proceso_ids,
  });
  if (error) redirect("/dashboard/servicios?error=guardado");
  revalidatePath("/dashboard/servicios");
  redirect("/dashboard/servicios?creado=1");
}

export async function createServiceProcessAction(formData: FormData) {
  const parsed = processSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/servicios?vista=procesos&error=proceso");
  const { supabase, workshop } = await requireCatalogManager();
  const { error } = await supabase.from("proceso_servicio").insert({
    taller_id: workshop.id,
    nombre: parsed.data.nombre,
    categoria_componente: parsed.data.categoria_componente,
    importe_referencia: parsed.data.importe_referencia,
  });
  if (error) redirect(`/dashboard/servicios?vista=procesos&error=${error.code === "23505" ? "proceso-duplicado" : "proceso"}`);
  revalidatePath("/dashboard/servicios");
  redirect("/dashboard/servicios?vista=procesos&procesoCreado=1");
}

export async function updateServiceProcessAction(formData: FormData) {
  const parsed = updateServiceProcessSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/servicios?vista=procesos&error=proceso");
  const { supabase, workshop } = await requireCatalogManager();
  const { data, error } = await supabase.from("proceso_servicio").update({
    categoria_componente: parsed.data.categoria_componente,
    importe_referencia: parsed.data.importe_referencia,
    descuento_servicio_pct: parsed.data.descuento_servicio_pct,
  }).eq("id", parsed.data.id).eq("taller_id", workshop.id).select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/servicios?vista=procesos&error=proceso");
  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard/ordenes");
  redirect("/dashboard/servicios?vista=procesos&procesoActualizado=1");
}

export async function updateServiceProcessesAction(formData: FormData) {
  const parsed = serviceProcessesSchema.safeParse({
    servicio_id: formData.get("servicio_id"),
    proceso_ids: formData.getAll("proceso_id"),
  });
  if (!parsed.success) redirect("/dashboard/servicios?error=procesos");
  const { supabase, workshop } = await requireCatalogManager();
  const { data: service, error: serviceError } = await supabase.from("servicio")
    .select("id")
    .eq("id", parsed.data.servicio_id)
    .eq("taller_id", workshop.id)
    .maybeSingle();
  if (serviceError) throw new Error("No se pudo validar el service.");
  if (!service) redirect("/dashboard/servicios?error=procesos");
  const { error } = await supabase.rpc("reemplazar_procesos_servicio", {
    p_servicio_id: service.id,
    p_proceso_ids: parsed.data.proceso_ids,
  });
  if (error) redirect("/dashboard/servicios?error=procesos");
  revalidatePath("/dashboard/servicios");
  redirect("/dashboard/servicios?procesosActualizados=1");
}

export async function inviteEmployeeAction(formData: FormData) {
  const parsed = employeeInvitationSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/equipo?error=datos");
  const { supabase, workshop } = await requireAdmin();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect("/dashboard/equipo?error=configuracion");
  }
  const adminClient = createAdminClient();
  const email = parsed.data.email.toLowerCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let redirectTo: string;
  try {
    redirectTo = new URL("/auth/callback?next=/auth/accept-invite", siteUrl).toString();
  } catch {
    redirect("/dashboard/equipo?error=configuracion");
  }
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error || !data.user) {
    const details = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
    console.error("No se pudo enviar una invitación de empleado a Supabase Auth.", {
      code: error?.code ?? null,
      status: error?.status ?? null,
      message: error?.message ?? null,
    });
    const reason = error?.status === 401
      ? "credencial"
      : error?.status === 429 || details.includes("rate_limit") || details.includes("over_email_send_rate_limit")
        ? "limite"
        : details.includes("redirect") || details.includes("url not allowed")
          ? "redireccion"
          : details.includes("email_exists") || details.includes("already registered") || details.includes("already exists")
            ? "correo-existente"
            : "email";
    redirect(`/dashboard/equipo?error=${reason}`);
  }

  const { error: employeeError } = await supabase.from("empleado").insert({
    taller_id: workshop.id,
    auth_user_id: data.user.id,
    email,
    nombre: parsed.data.nombre,
    apellido: parsed.data.apellido,
    fecha_nacimiento: parsed.data.fecha_nacimiento,
    fecha_ingreso: parsed.data.fecha_ingreso,
    rango: parsed.data.rango,
    fecha_inicio_rango: new Date().toISOString().slice(0, 10),
    rol_acceso: parsed.data.rol_acceso,
  });
  if (employeeError) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(data.user.id);
    if (rollbackError) throw new Error(`No se pudo crear el perfil del empleado ni cancelar la invitación: ${employeeError.message}; ${rollbackError.message}`);
    redirect(employeeError.code === "23505"
      ? "/dashboard/equipo?error=correo-existente"
      : "/dashboard/equipo?error=perfil");
  }

  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo?invitacionEnviada=1");
}

export async function updateEmployeeAction(formData: FormData) {
  const parsed = employeeUpdateSchema.safeParse({
    ...formValues(formData),
    activo: formData.get("activo") === "on",
  });
  if (!parsed.success) redirect("/dashboard/equipo?error=datos");
  const { supabase, user, workshop } = await requireAdmin();
  const { data: currentEmployee, error: currentEmployeeError } = await supabase.from("empleado")
    .select("id, auth_user_id, rol_acceso, activo")
    .eq("id", parsed.data.id)
    .eq("taller_id", workshop.id)
    .maybeSingle();
  if (currentEmployeeError) throw new Error("No se pudo validar el empleado.");
  if (!currentEmployee) redirect("/dashboard/equipo?error=empleado");

  const isDemotingAdmin = currentEmployee.rol_acceso === "admin"
    && (parsed.data.rol_acceso !== "admin" || !parsed.data.activo);
  if (isDemotingAdmin) {
    if (currentEmployee.auth_user_id === user.id) redirect("/dashboard/equipo?error=admin-propio");
    const { count, error: adminsError } = await supabase.from("empleado")
      .select("id", { count: "exact", head: true })
      .eq("taller_id", workshop.id)
      .eq("rol_acceso", "admin")
      .eq("activo", true);
    if (adminsError) throw new Error("No se pudo verificar la cantidad de administradores.");
    if ((count ?? 0) <= 1) redirect("/dashboard/equipo?error=ultimo-admin");
  }

  const { error } = await supabase.from("empleado").update({
    nombre: parsed.data.nombre,
    apellido: parsed.data.apellido,
    fecha_nacimiento: parsed.data.fecha_nacimiento,
    fecha_ingreso: parsed.data.fecha_ingreso,
    rango: parsed.data.rango,
    rol_acceso: parsed.data.rol_acceso,
    activo: parsed.data.activo,
  }).eq("id", currentEmployee.id).eq("taller_id", workshop.id);
  if (error) redirect("/dashboard/equipo?error=guardado");
  revalidatePath("/dashboard/equipo");
  revalidatePath("/dashboard/servicios");
  redirect("/dashboard/equipo?actualizado=1");
}

export async function acceptEmployeeInvitationAction(formData: FormData) {
  const parsed = invitationPasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/auth/accept-invite?error=datos");
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?error=confirmacion");
  const { data: employee, error: employeeError } = await supabase.from("empleado")
    .select("id, activo")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (employeeError || !employee || !employee.activo) redirect("/login?error=confirmacion");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect("/auth/accept-invite?error=contrasena");
  redirect("/dashboard");
}

export async function createAppointmentAction(formData: FormData) {
  const parsed = appointmentSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/agenda?error=datos");
  const date = new Date(parsed.data.fecha_hora);
  if (Number.isNaN(date.getTime()) || date <= new Date()) redirect("/dashboard/agenda?error=fecha");
  const { supabase, workshop } = await requireWorkshop();
  const { data: customer } = await supabase.from("cliente").select("id")
    .eq("id", parsed.data.cliente_id).eq("taller_id", workshop.id).maybeSingle();
  const { data: bicycle } = await supabase.from("bicicleta").select("id")
    .eq("id", parsed.data.bicicleta_id).eq("cliente_id", parsed.data.cliente_id).maybeSingle();
  if (!customer || !bicycle) redirect("/dashboard/agenda?error=relacion");

  const { error } = await supabase.from("agenda_turno").insert({
    taller_id: workshop.id,
    cliente_id: customer.id,
    bicicleta_id: bicycle.id,
    fecha_hora: date.toISOString(),
    observaciones: parsed.data.observaciones || null,
  });
  if (error) redirect("/dashboard/agenda?error=guardado");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  redirect("/dashboard/agenda?creado=1");
}

export async function createWorkOrderAction(formData: FormData) {
  const parsed = workOrderSchema.safeParse({
    ...formValues(formData),
    es_express: formData.get("es_express") === "on",
    inspeccion_estado: formData.getAll("inspeccion_estado"),
    inspeccion_comentario: formData.getAll("inspeccion_comentario"),
    servicio_ids: formData.getAll("servicio_id"),
    proceso_ids: formData.getAll("proceso_id"),
  });
  if (!parsed.success) redirect("/dashboard/recepcion?error=datos");

  const photoEntries = formData.getAll("fotos");
  const photos = photoEntries.filter((value): value is File => value instanceof File && value.size > 0);
  const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const maxPhotoCount = 5;
  const maxPhotoSize = 4 * 1024 * 1024;
  if (
    photos.length < 1
    || photos.length > maxPhotoCount
    || photoEntries.length > maxPhotoCount
    || photoEntries.some((value) => !(value instanceof File))
    || photos.some((photo) => !allowedPhotoTypes.has(photo.type) || photo.size > maxPhotoSize)
  ) {
    redirect("/dashboard/recepcion?error=fotos");
  }

  const { supabase, workshop } = await requireWorkshop();
  const estimatedDate = parsed.data.fecha_entrega_estimada
    ? new Date(parsed.data.fecha_entrega_estimada)
    : null;
  if (estimatedDate && Number.isNaN(estimatedDate.getTime())) redirect("/dashboard/recepcion?error=fecha");
  const customServiceName = parsed.data.servicio_personalizado?.trim() ?? "";
  const customServicePrice = parsed.data.servicio_personalizado_precio;
  const { data: orderId, error } = await supabase.rpc("crear_orden_trabajo_con_inspeccion", {
    p_taller_id: workshop.id,
    p_cliente_id: parsed.data.cliente_id,
    p_bicicleta_id: parsed.data.bicicleta_id,
    p_es_express: parsed.data.es_express,
    p_fecha_entrega_estimada: estimatedDate?.toISOString() ?? null,
    p_servicio_ids: parsed.data.servicio_ids,
    p_proceso_ids: parsed.data.proceso_ids,
    p_inspeccion_recepcion: {
      observaciones: parsed.data.observaciones_recepcion?.trim() || null,
      desperfectos: [],
      revision: parsed.data.es_express
        ? []
        : buildInspectionResults(parsed.data.inspeccion_estado, parsed.data.inspeccion_comentario),
      mantenimiento: parsed.data.es_express ? null : {
        ultimo_service: {
          meses: parsed.data.ultimo_service_meses === "" ? null : parsed.data.ultimo_service_meses ?? null,
          kilometros: parsed.data.ultimo_service_km === "" ? null : parsed.data.ultimo_service_km ?? null,
        },
        horquilla: {
          meses: parsed.data.horquilla_service_meses === "" ? null : parsed.data.horquilla_service_meses ?? null,
          kilometros: parsed.data.horquilla_service_km === "" ? null : parsed.data.horquilla_service_km ?? null,
        },
        shock: parsed.data.tiene_shock === "true" ? {
          meses: parsed.data.shock_service_meses === "" ? null : parsed.data.shock_service_meses ?? null,
          kilometros: parsed.data.shock_service_km === "" ? null : parsed.data.shock_service_km ?? null,
        } : null,
      },
      servicio_personalizado: customServiceName && customServicePrice !== null
        ? { nombre: customServiceName, precio: customServicePrice }
        : null,
    },
  });
  if (error) {
    console.error("No se pudo crear la orden de trabajo.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    if (error.code === "PGRST202") {
      redirect("/dashboard/recepcion?error=migracion");
    }
    if (error.code === "42883" && error.message.includes("crear_orden_trabajo_con_items")) {
      redirect("/dashboard/recepcion?error=migracion-base");
    }
    if (error.code === "42703" && error.message.includes("recepcion_cerrada")) {
      redirect("/dashboard/recepcion?error=migracion-esquema");
    }
    redirect(`/dashboard/recepcion?error=${error.code === "23514" ? "seleccion" : "guardado"}`);
  }
  if (!orderId) {
    console.error("Supabase no devolvió el identificador de la orden de trabajo.");
    redirect("/dashboard/recepcion?error=guardado");
  }

 if (customServiceName && customServicePrice !== null) {
    if (!Number.isFinite(customServicePrice) || customServicePrice < 0) {
      console.error("Precio de servicio personalizado inválido");
      await discardUnfinishedOrder(supabase, workshop.id, orderId, []);
      redirect("/dashboard/recepcion?error=guardado");
    }

    const { error: orderTotalUpdateError } = await supabase.rpc("incrementar_presupuesto_orden", {
      p_orden_id: orderId,
      p_taller_id: workshop.id,
      p_incremento: customServicePrice,
    });

    if (orderTotalUpdateError) {
      console.error("No se pudo actualizar el total de la orden con el servicio personalizado.", {
        message: orderTotalUpdateError.message,
      });
      await discardUnfinishedOrder(supabase, workshop.id, orderId, []);
      redirect("/dashboard/recepcion?error=guardado");
    }
  }

 

  const uploadedPaths: string[] = [];
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  for (const photo of photos) {
    const path = `${workshop.id}/${orderId}/${crypto.randomUUID()}.${extensionByType[photo.type]}`;
    const { error: uploadError } = await supabase.storage.from("ordenes-trabajo").upload(
      path,
      new Uint8Array(await photo.arrayBuffer()),
      { contentType: photo.type, upsert: false },
    );
    if (uploadError) {
      console.error("No se pudo subir una foto de recepción.", {
        name: uploadError.name,
        message: uploadError.message,
      });
      await discardUnfinishedOrder(supabase, workshop.id, orderId, uploadedPaths);
      if (uploadError.message === "Bucket not found") {
        redirect("/dashboard/recepcion?error=bucket");
      }
      redirect("/dashboard/recepcion?error=fotos");
    }
    uploadedPaths.push(path);
  }

  const { error: finalizeError } = await supabase.rpc("finalizar_recepcion_orden_trabajo", {
    p_orden_trabajo_id: orderId,
    p_fotos: uploadedPaths,
  });
  if (finalizeError) {
    console.error("No se pudo cerrar la recepción de la orden de trabajo.", {
      code: finalizeError.code,
      message: finalizeError.message,
      details: finalizeError.details,
      hint: finalizeError.hint,
    });
    await discardUnfinishedOrder(supabase, workshop.id, orderId, uploadedPaths);
    if (finalizeError.code === "PGRST202") {
      redirect("/dashboard/recepcion?error=migracion-cierre");
    }
    redirect("/dashboard/recepcion?error=cierre");
  }

  revalidatePath("/dashboard/ordenes");
  revalidatePath("/dashboard/recepcion");
  revalidatePath("/dashboard");
  redirect(`/dashboard/ordenes?creado=${parsed.data.es_express ? "express" : "1"}`);
}

export async function updateWorkOrderStateAction(formData: FormData) {
  const parsed = workOrderStateSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/ordenes?error=datos");
  const { supabase, workshop } = await requireWorkshop();
  const { error } = await supabase.from("orden_trabajo").update({
    estado: parsed.data.estado,
    fecha_cierre: parsed.data.estado === "entregado" ? new Date().toISOString() : null,
  }).eq("id", parsed.data.id).eq("taller_id", workshop.id);
  if (error) redirect("/dashboard/ordenes?error=estado");
  revalidatePath("/dashboard/ordenes");
  revalidatePath("/dashboard");
  redirect("/dashboard/ordenes?actualizado=1");
}

export async function updateAppointmentStateAction(formData: FormData) {
  const parsed = appointmentStateSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/dashboard/agenda?error=datos");
  const { supabase, workshop } = await requireWorkshop();
  const { error } = await supabase.from("agenda_turno").update({ estado: parsed.data.estado })
    .eq("id", parsed.data.id).eq("taller_id", workshop.id);
  if (error) redirect("/dashboard/agenda?error=estado");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  redirect("/dashboard/agenda?actualizado=1");
}