export const inspectionCategories = [
  {
    id: "transmision",
    label: "Transmisión y cambios",
    description: "Cadena, platos, casete, cambios y cables.",
    items: [
      { id: "cadena", label: "Desgaste de cadena", detail: "Medí la cadena con el calibre de desgaste.", measurement: true },
      { id: "dientes", label: "Platos y casete", detail: "Dientes tipo aleta de tiburón, gastados o rotos." },
      { id: "sincronizacion", label: "Sincronización del cambio", detail: "Saltos, marchas que no entran o ruidos al pedalear." },
      { id: "patilla", label: "Pata de cambio", detail: "Revisá que el cambio trasero esté alineado con los piñones." },
      { id: "cables_transmision", label: "Cables y fundas", detail: "Cables deshilachados u oxidados; fundas agrietadas o duras." },
    ],
  },
  {
    id: "frenos",
    label: "Sistema de frenos",
    description: "Revisá por separado los frenos delantero y trasero.",
    items: [
      { id: "contaminacion_pastillas_delantera", label: "Pastillas delanteras contaminadas", detail: "¿Tienen aceite o grasa, hacen ruido fuerte o perdieron capacidad de frenado?", responseType: "yes_no" },
      { id: "contaminacion_pastillas_trasera", label: "Pastillas traseras contaminadas", detail: "¿Tienen aceite o grasa, hacen ruido fuerte o perdieron capacidad de frenado?", responseType: "yes_no" },
      { id: "desgaste_freno_delantero", label: "Desgaste del freno delantero", detail: "Pastillas sin compuesto o zapatas debajo de la marca límite." },
      { id: "desgaste_freno_trasero", label: "Desgaste del freno trasero", detail: "Pastillas sin compuesto o zapatas debajo de la marca límite." },
      { id: "disco_freno_delantero", label: "Disco o pista de frenado delantera", detail: "Revisá si el disco está doblado o delgado; en freno a llanta, si la pista está cóncava." },
      { id: "disco_freno_trasero", label: "Disco o pista de frenado trasera", detail: "Revisá si el disco está doblado o delgado; en freno a llanta, si la pista está cóncava." },
      { id: "maneta_hidraulica", label: "Tacto de la maneta hidráulica", detail: "Maneta esponjosa o que llega hasta el puño." },
    ],
  },
  {
    id: "ruedas",
    label: "Ruedas y neumáticos",
    description: "Revisá por separado la rueda delantera y la trasera.",
    items: [
      { id: "radios_delanteros", label: "Centrado y rayos de la rueda delantera", detail: "Rueda torcida, rayos flojos o rotos, tensión desigual." },
      { id: "radios_traseros", label: "Centrado y rayos de la rueda trasera", detail: "Rueda torcida, rayos flojos o rotos, tensión desigual." },
      { id: "cubierta_delantera", label: "Desgaste de la cubierta delantera", detail: "Goma agrietada, tacos gastados, cortes o deformaciones." },
      { id: "cubierta_trasera", label: "Desgaste de la cubierta trasera", detail: "Goma agrietada, tacos gastados, cortes o deformaciones." },
      { id: "buje_delantero", label: "Holgura en el buje delantero", detail: "La rueda delantera se mueve lateralmente al empujarla." },
      { id: "buje_trasero", label: "Holgura en el buje trasero", detail: "La rueda trasera se mueve lateralmente al empujarla." },
    ],
  },
  {
    id: "cuadro_suspension",
    label: "Cuadro, suspensión y dirección",
    description: "Estructura, dirección, horquilla y caja pedalera.",
    items: [
      { id: "direccion", label: "Holgura en la dirección", detail: "Juego en el manillar al frenar adelante y mover la bici." },
      { id: "cuadro", label: "Fisuras, golpes o rayones en el cuadro", detail: "Mirá especialmente soldaduras, uniones y pintura." },
      { id: "horquilla", label: "Estado de la horquilla", detail: "Fugas de aceite, barras rayadas o pérdida de presión." },
      { id: "shock", label: "Estado del shock", detail: "Fugas de aceite, daño o pérdida de presión (si tiene)." },
      { id: "pedalier", label: "Holgura en el caja pedalera", detail: "El eje de centro se mueve al empujar las bielas." },
    ],
  },
  {
    id: "seguridad",
    label: "Seguridad y otros componentes",
    description: "Puños, tornillos y ruidos estructurales.",
    items: [
      { id: "punos", label: "Puños o cinta de manillar", detail: "Roturas, metal expuesto o cinta despegada." },
      { id: "tornilleria", label: "Tornillería", detail: "Tornillos oxidados o con la cabeza barrida." },
      { id: "crujidos", label: "Crujidos", detail: "Ruidos al ponerse de pie sobre los pedales o girar el manillar." },
    ],
  },
] as const;

export const inspectionStatusOptions = [
  { id: "bueno", label: "Bueno" },
  { id: "regular", label: "Regular" },
  { id: "malo", label: "Malo" },
  { id: "no_revisado", label: "No revisado" },
] as const;

export const inspectionYesNoOptions = [
  { id: "si", label: "Sí" },
  { id: "no", label: "No" },
  { id: "no_revisado", label: "No revisado" },
] as const;

export const inspectionMeasurementOptions = [
  { id: "0.5", label: "0,5%" },
  { id: "0.75", label: "0,75%" },
  { id: "1", label: "1%" },
  { id: "no_revisado", label: "No revisado" },
] as const;

export const inspectionItems = inspectionCategories.flatMap((category) =>
  category.items.map((item) => ({ ...item, categoryId: category.id, categoryLabel: category.label })),
);

export const inspectionItemIds = inspectionItems.map((item) => item.id);

export type InspectionStatus = typeof inspectionStatusOptions[number]["id"];
export type InspectionYesNo = typeof inspectionYesNoOptions[number]["id"];
export type InspectionMeasurement = typeof inspectionMeasurementOptions[number]["id"];

export function buildInspectionResults(entries: string[], commentEntries: string[]) {
  const results = new Map(entries.map((entry) => {
    const separator = entry.indexOf(":");
    return [entry.slice(0, separator), entry.slice(separator + 1)] as const;
  }));
  const comments = new Map(commentEntries.map((entry) => {
    const separator = entry.indexOf(":");
    return [entry.slice(0, separator), entry.slice(separator + 1)] as const;
  }));

  return inspectionCategories.map((category) => ({
    categoria: category.label,
    puntos: category.items.map((item) => {
      const result = results.get(item.id);
      return {
        estado: result ?? "no_revisado",
        componente: item.label,
        resultado: "measurement" in item && item.measurement && result && result !== "no_revisado"
          ? `${result.replace(".", ",")}% de desgaste`
          : result ?? "no_revisado",
        comentario: comments.get(item.id)?.trim() || null,
      };
    }),
  }));
}
