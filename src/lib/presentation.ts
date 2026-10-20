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

export const workOrderStates: Record<Database["public"]["Enums"]["estado_ot_enum"], string> = {
  recepcion: "Recepción",
  en_proceso: "En proceso",
  espera_repuesto: "Espera repuesto",
  listo: "Listo",
  entregado: "Entregado",
};

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