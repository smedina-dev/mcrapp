export type CustomerFormValues = {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  altura_cm: number | null;
  peso_kg: number | null;
};

export function CustomerFields({ customer, prefix }: { customer?: CustomerFormValues; prefix: string }) {
  const fieldId = (field: string) => `${prefix}-${field}`;
  return (
    <>
      <label className="block text-sm font-semibold" htmlFor={fieldId("name")}>Nombre<input id={fieldId("name")} name="nombre" required maxLength={255} defaultValue={customer?.nombre ?? ""} className="form-input" /></label>
      <label className="block text-sm font-semibold" htmlFor={fieldId("surname")}>Apellido<input id={fieldId("surname")} name="apellido" required maxLength={255} defaultValue={customer?.apellido ?? ""} className="form-input" /></label>
      <label className="block text-sm font-semibold" htmlFor={fieldId("dni")}>DNI <span className="text-[#a23d2d]">· único por taller</span>
        <input id={fieldId("dni")} name="dni" required inputMode="numeric" autoComplete="off" maxLength={20} defaultValue={customer?.dni ?? ""} placeholder="Ej.: 12.345.678" className="form-input" />
        <span className="mt-1 block text-xs font-normal text-[#748079]">Podés escribirlo con puntos; se guarda normalizado.</span>
      </label>
      <label className="block text-sm font-semibold" htmlFor={fieldId("phone")}>Teléfono<input id={fieldId("phone")} name="telefono" type="tel" required maxLength={50} defaultValue={customer?.telefono ?? ""} className="form-input" /></label>
      <label className="block text-sm font-semibold" htmlFor={fieldId("email")}>Correo electrónico<input id={fieldId("email")} name="email" type="email" defaultValue={customer?.email ?? ""} className="form-input" /></label>
      <label className="block text-sm font-semibold" htmlFor={fieldId("address")}>Dirección<input id={fieldId("address")} name="direccion" maxLength={1000} defaultValue={customer?.direccion ?? ""} className="form-input" /></label>
      <label className="block text-sm font-semibold" htmlFor={fieldId("birth-date")}>Fecha de nacimiento<input id={fieldId("birth-date")} name="fecha_nacimiento" type="date" defaultValue={customer?.fecha_nacimiento ?? ""} className="form-input" /></label>
      <label className="block text-sm font-semibold" htmlFor={fieldId("height")}>Altura (cm)<input id={fieldId("height")} name="altura_cm" type="number" min={50} max={260} step={1} defaultValue={customer?.altura_cm ?? ""} className="form-input" /></label>
      <label className="block text-sm font-semibold" htmlFor={fieldId("weight")}>Peso (kg)<span className="ml-1 font-normal text-[#748079]">(importante para regular la suspensión)</span><input id={fieldId("weight")} name="peso_kg" type="number" min={1} max={500} step="0.1" inputMode="decimal" defaultValue={customer?.peso_kg ?? ""} className="form-input" /></label>
    </>
  );
}
