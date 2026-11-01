import type { Database } from "@/lib/database.types";

export const serviceCategories: Record<Database["public"]["Enums"]["categoria_servicio_enum"], string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  primer_service: "Primer service",
  agregado: "Agregado",
  express: "Express",
};

export const processComponentCategories: {
  id: Database["public"]["Enums"]["categoria_componente_enum"];
  label: string;
  description: string;
}[] = [
  { id: "ruedas", label: "Ruedas", description: "Cubiertas, mazas y armado" },
  { id: "frenos", label: "Frenos", description: "Purgado, discos y pastillas" },
  { id: "caja_pedalera", label: "Caja pedalera", description: "Centro y rodamientos" },
  { id: "horquilla", label: "Horquilla", description: "Suspensión delantera" },
  { id: "asiento", label: "Asiento", description: "Asiento y portasilla" },
  { id: "transmision", label: "Transmisión", description: "Cambios, plato y cadena" },
  { id: "shock", label: "Shock", description: "Suspensión trasera" },
  { id: "cuadro", label: "Cuadro", description: "Dirección, cuadro y fusible" },
  { id: "general", label: "General / otros", description: "Tareas sin componente específico" },
];

export const workOrderPriorities = {
  baja: { label: "Baja", badge: "bg-[#2e9e5b] text-white", selected: "border-[#2e9e5b] bg-[#e7f6ec] text-[#1c6b3c]", dot: "bg-[#2e9e5b]" },
  normal: { label: "Normal", badge: "bg-[#f2c200] text-[#4a3a00]", selected: "border-[#d4a900] bg-[#fff8d6] text-[#6b5400]", dot: "bg-[#f2c200]" },
  alta: { label: "Alta", badge: "bg-[#ec7a1c] text-white", selected: "border-[#ec7a1c] bg-[#fdeedd] text-[#9a4c0a]", dot: "bg-[#ec7a1c]" },
  pre_carrera: { label: "Pre Carrera", badge: "bg-[#d62f2f] text-white", selected: "border-[#d62f2f] bg-[#fde8e8] text-[#9b1c1c]", dot: "bg-[#d62f2f]" },
  express: { label: "Express", badge: "bg-[#1f6fd1] text-white", selected: "border-[#1f6fd1] bg-[#e5f0fd] text-[#164f96]", dot: "bg-[#1f6fd1]" },
} as const;

export type WorkOrderPriority = keyof typeof workOrderPriorities;

export const workOrderPriorityOrder: WorkOrderPriority[] = ["baja", "normal", "alta", "pre_carrera", "express"];

const priorityRank: Record<WorkOrderPriority, number> = { express: 0, pre_carrera: 1, alta: 2, normal: 3, baja: 4 };

export function priorityOf(value: string | null | undefined): WorkOrderPriority {
  return value && value in workOrderPriorities ? (value as WorkOrderPriority) : "normal";
}

export function comparePriority(a: string | null | undefined, b: string | null | undefined) {
  return priorityRank[priorityOf(a)] - priorityRank[priorityOf(b)];
}

export const workOrderStates: Record<Database["public"]["Enums"]["estado_ot_enum"], string> = {
  recepcion: "Recepción",
  en_proceso: "En proceso",
  espera_repuesto: "Espera repuesto",
  para_control: "Para control",
  listo: "Listo",
  entregado: "Entregado",
};

export type WorkOrderState = keyof typeof workOrderStates;

const restrictedOrderStates: WorkOrderState[] = ["listo", "entregado"];

export function canManageRestrictedStates(accessRole: string) {
  return accessRole === "admin" || accessRole === "jefe_taller";
}

// Estados que el rol puede asignar a una orden.
export function assignableOrderStates(accessRole: string): WorkOrderState[] {
  const all = Object.keys(workOrderStates) as WorkOrderState[];
  return canManageRestrictedStates(accessRole) ? all : all.filter((state) => !restrictedOrderStates.includes(state));
}

// "Listo" solo lo ve admin/jefe; "Entregado" se ve únicamente en historiales.
export function isOrderStateRestricted(state: string | null | undefined) {
  return restrictedOrderStates.includes((state ?? "recepcion") as WorkOrderState);
}

export const appointmentStates: Record<Database["public"]["Enums"]["estado_turno_enum"], string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  en_taller: "En taller",
};

export const bicycleDisciplines: Record<Database["public"]["Enums"]["disciplina_bici_enum"], string> = {
  mtb_xc: "MTB XC",
  mtb_enduro_dh: "MTB Enduro / DH",
  mtb_enduro: "MTB Enduro",
  mtb_dh: "MTB DH",
  ruta: "Ruta",
  gravel: "Gravel",
  urbana: "Urbana",
  ebike: "E-bike",
  otra: "Otra",
};

export function formatDate(value: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { ...options, timeZone: "UTC" }).format(new Date(value));
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}