import { z } from "zod";
import {
  inspectionItems,
  inspectionItemIds,
  inspectionMeasurementOptions,
  inspectionStatusOptions,
  inspectionYesNoOptions,
} from "@/lib/bicycle-inspection";

const inspectionItemIdSet = new Set<string>(inspectionItemIds);
const inspectionStatusSet = new Set<string>(inspectionStatusOptions.map(({ id }) => id));
inspectionStatusSet.add("no_aplica");
const inspectionMeasurementSet = new Set<string>(inspectionMeasurementOptions.map(({ id }) => id));
const inspectionItemIdsById = new Set<string>(inspectionItemIds);
const inspectionMeasurementItemIds = new Set(["cadena"]);
const inspectionYesNoSet = new Set<string>(inspectionYesNoOptions.map(({ id }) => id));
const inspectionYesNoItemIds = new Set<string>(
  inspectionItems.filter((item) => "responseType" in item && item.responseType === "yes_no").map((item) => item.id),
);

const requiredText = (label: string, maximum = 255) =>
  z.string().trim().min(1, `${label} es obligatorio`).max(maximum);

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const signUpSchema = signInSchema.extend({
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas deben coincidir",
});

export const workshopSchema = z.object({
  nombre: requiredText("El nombre del taller"),
  cuit_rut: z.string().trim().max(50).optional(),
  telefono: z.string().trim().max(50).optional(),
});

export const customerSchema = z.object({
  nombre: requiredText("El nombre"),
  apellido: requiredText("El apellido"),
  dni: z.string().trim().transform((value) => value.replace(/[.\s-]/g, ""))
    .pipe(z.string().regex(/^\d{7,9}$/, "Ingresá un DNI válido de 7 a 9 dígitos")),
  telefono: requiredText("El teléfono", 50),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  direccion: z.string().trim().max(1000).optional(),
  fecha_nacimiento: z.union([z.string().date(), z.literal("")]).optional(),
  altura_cm: z.union([z.literal(""), z.coerce.number().int().min(50).max(260)]).optional(),
  peso_kg: z.union([z.literal(""), z.coerce.number().min(1).max(500)]).optional(),
  bicicleta: z.string().trim().max(255).optional(),
  bicicleta_disciplina: z.enum(["mtb_xc", "mtb_enduro_dh", "mtb_enduro", "mtb_dh", "ruta", "gravel", "urbana", "ebike", "otra"]).optional(),
});

export const updateCustomerSchema = customerSchema
  .omit({ bicicleta: true, bicicleta_disciplina: true })
  .extend({ id: z.string().uuid() });

const bicycleFieldsSchema = z.object({
  marca: requiredText("La marca"),
  modelo: requiredText("El modelo"),
  numero_serie: z.string().trim().max(100).optional(),
  talle: z.string().trim().max(30).optional(),
  color: z.string().trim().max(80).optional(),
  tubelizada: z.boolean(),
  liquido_tubeless: z.string().trim().max(120).optional(),
  presion_horquilla_psi: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(0).max(400).optional()),
  rebote_horquilla_clicks: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(0).max(100).optional()),
  tiene_shock: z.boolean(),
  presion_shock_psi: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(0).max(400).optional()),
  rebote_shock_baja_clicks: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(0).max(100).optional()),
  rebote_shock_alta_clicks: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(0).max(100).optional()),
  disciplina: z.enum(["mtb_xc", "mtb_enduro_dh", "mtb_enduro", "mtb_dh", "ruta", "gravel", "urbana", "ebike", "otra"]),
});

const validateBicycleFields = (data: z.infer<typeof bicycleFieldsSchema>, context: z.RefinementCtx) => {
  if (data.tubelizada && !data.liquido_tubeless) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["liquido_tubeless"], message: "Indicá el tipo de líquido tubeless" });
  }
};

export const bicycleSchema = bicycleFieldsSchema.extend({ cliente_id: z.string().uuid() }).superRefine(validateBicycleFields);
export const updateBicycleSchema = bicycleFieldsSchema.extend({ id: z.string().uuid() }).superRefine(validateBicycleFields);
export const transferBicycleSchema = z.object({ bicicleta_id: z.string().uuid(), nuevo_cliente_id: z.string().uuid() });
export const linkBicycleToCustomerSchema = z.object({ bicicleta_id: z.string().uuid(), cliente_id: z.string().uuid() });

export const serviceSchema = z.object({
  nombre: requiredText("El nombre del servicio"),
  categoria: z.enum(["basico", "intermedio", "avanzado", "primer_service", "agregado", "express"]),
  precio_base: z.coerce.number().min(0).max(9999999999.99),
  tiempo_estimado_min: z.coerce.number().int().min(1).max(100000),
  proceso_ids: z.array(z.string().uuid()).max(200),
});

export const processSchema = z.object({
  nombre: requiredText("El nombre del proceso"),
  categoria_componente: z.enum(["ruedas", "frenos", "caja_pedalera", "horquilla", "asiento", "transmision", "shock", "cuadro", "general"]),
  importe_referencia: z.preprocess(
    (value) => value === "" || value === undefined ? null : value,
    z.coerce.number().min(0).max(9999999999.99).nullable(),
  ),
});

export const updateServiceProcessSchema = z.object({
  id: z.string().uuid(),
  categoria_componente: z.enum(["ruedas", "frenos", "caja_pedalera", "horquilla", "asiento", "transmision", "shock", "cuadro", "general"]),
  importe_referencia: z.coerce.number().min(0).max(9999999999.99),
  descuento_servicio_pct: z.coerce.number().min(0).max(100),
});

export const serviceProcessesSchema = z.object({
  servicio_id: z.string().uuid(),
  proceso_ids: z.array(z.string().uuid()).max(200),
});

const employeeRanks = [
  "ayudante_mecanico",
  "embalador",
  "mecanico",
  "mecanico_especializado",
  "jefe_mecanicos",
] as const;

const employeeAccessRoles = ["admin", "jefe_taller", "empleado"] as const;

export const employeeInvitationSchema = z.object({
  email: z.string().trim().email().max(255),
  nombre: requiredText("El nombre"),
  apellido: requiredText("El apellido"),
  fecha_nacimiento: z.string().date(),
  fecha_ingreso: z.string().date(),
  rango: z.enum(employeeRanks),
  rol_acceso: z.enum(employeeAccessRoles),
}).refine((data) => data.fecha_nacimiento <= new Date().toISOString().slice(0, 10), {
  path: ["fecha_nacimiento"],
  message: "La fecha de nacimiento no puede ser futura",
}).refine((data) => data.fecha_ingreso <= new Date().toISOString().slice(0, 10), {
  path: ["fecha_ingreso"],
  message: "La fecha de ingreso no puede ser futura",
});

export const employeeUpdateSchema = z.object({
  id: z.string().uuid(),
  nombre: requiredText("El nombre"),
  apellido: requiredText("El apellido"),
  fecha_nacimiento: z.string().date(),
  fecha_ingreso: z.string().date(),
  rango: z.enum(employeeRanks),
  rol_acceso: z.enum(employeeAccessRoles),
  activo: z.boolean(),
}).refine((data) => data.fecha_nacimiento <= new Date().toISOString().slice(0, 10), {
  path: ["fecha_nacimiento"],
  message: "La fecha de nacimiento no puede ser futura",
}).refine((data) => data.fecha_ingreso <= new Date().toISOString().slice(0, 10), {
  path: ["fecha_ingreso"],
  message: "La fecha de ingreso no puede ser futura",
});

export const invitationPasswordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas deben coincidir",
});

export const appointmentSchema = z.object({
  cliente_id: z.string().uuid(),
  bicicleta_id: z.string().uuid(),
  fecha_hora: z.string().min(1),
  observaciones: z.string().trim().max(2000).optional(),
});

export const workOrderSchema = z.object({
  cliente_id: z.string().uuid(),
  bicicleta_id: z.string().uuid(),
  es_express: z.boolean(),
  fecha_entrega_estimada: z.string().date(),
  observaciones_recepcion: z.string().trim().max(2000).optional(),
  servicio_personalizado: z.string().trim().max(200).optional(),
  servicio_personalizado_precio: z.preprocess(
    (value) => {
      if (value === "" || value === undefined) return null;
      if (typeof value === "string" && /^(?:\d{1,10}(?:\.\d{1,2})?|\.\d{1,2})$/.test(value)) return Number(value);
      return Number.NaN;
    },
    z.coerce.number().min(0).max(9999999999.99).nullable(),
  ),
  inspeccion_estado: z.array(z.string()).length(inspectionItemIdSet.size).refine((entries) => {
    const parsedEntries = entries.map((entry) => {
      const separator = entry.indexOf(":");
      return { id: entry.slice(0, separator), status: entry.slice(separator + 1) };
    });
    return parsedEntries.every(({ id, status }) =>
      inspectionItemIdsById.has(id)
      && (inspectionMeasurementItemIds.has(id)
        ? inspectionMeasurementSet.has(status)
        : inspectionYesNoItemIds.has(id)
          ? inspectionYesNoSet.has(status)
          : inspectionStatusSet.has(status) && (status !== "no_aplica" || id === "shock")),
    ) && new Set(parsedEntries.map(({ id }) => id)).size === inspectionItemIdSet.size;
  }),
  inspeccion_comentario: z.array(z.string().max(550)).length(inspectionItemIdSet.size).refine((entries) => {
    const parsedEntries = entries.map((entry) => {
    const separator = entry.indexOf(":");
    return { id: entry.slice(0, separator), comment: entry.slice(separator + 1) };
    });
    return parsedEntries.every(({ id, comment }) =>
    inspectionItemIdsById.has(id) && comment.length <= 500,
    ) && new Set(parsedEntries.map(({ id }) => id)).size === inspectionItemIdSet.size;
  }),
  ultimo_service_meses: z.union([z.literal(""), z.coerce.number().int().min(0).max(1200)]).optional(),
  ultimo_service_km: z.union([z.literal(""), z.coerce.number().int().min(0).max(1000000)]).optional(),
  horquilla_service_meses: z.union([z.literal(""), z.coerce.number().int().min(0).max(1200)]).optional(),
  horquilla_service_km: z.union([z.literal(""), z.coerce.number().int().min(0).max(1000000)]).optional(),
  shock_service_meses: z.union([z.literal(""), z.coerce.number().int().min(0).max(1200)]).optional(),
  shock_service_km: z.union([z.literal(""), z.coerce.number().int().min(0).max(1000000)]).optional(),
  tiene_shock: z.enum(["true", "false"]),
  servicio_ids: z.array(z.string().uuid()).max(100),
  proceso_ids: z.array(z.string().uuid()).max(200),
}).refine((data) => {
  const hasCustomService = Boolean(data.servicio_personalizado);
  const hasCustomServicePrice = data.servicio_personalizado_precio !== null;
  if (hasCustomService !== hasCustomServicePrice) return false;
  if (data.es_express) {
    return data.servicio_ids.length === 0
      && (data.proceso_ids.length > 0 || hasCustomService);
  }
  return !hasCustomService
    && data.servicio_ids.length + data.proceso_ids.length > 0;
}, {
  message: "La orden debe incluir un proceso o servicio válido",
});

export const workOrderStateSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(["recepcion", "en_proceso", "espera_repuesto", "listo", "entregado"]),
});

export const appointmentStateSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(["pendiente", "confirmado", "cancelado", "en_taller"]),
});