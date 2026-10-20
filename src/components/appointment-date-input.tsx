"use client";

import { useState } from "react";

export function AppointmentDateInput() {
  const [value, setValue] = useState("");
  const [isoValue, setIsoValue] = useState("");

  function updateValue(nextValue: string) {
    setValue(nextValue);
    const [datePart, timePart] = nextValue.split("T");
    if (!datePart || !timePart) {
      setIsoValue("");
      return;
    }

    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    const date = new Date(year, month - 1, day, hours, minutes);
    setIsoValue(Number.isNaN(date.getTime()) ? "" : date.toISOString());
  }

  return (
    <>
      <input
        aria-label="Fecha y hora del turno"
        type="datetime-local"
        value={value}
        onChange={(event) => updateValue(event.target.value)}
        required
        className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
      />
      <input type="hidden" name="fecha_hora" value={isoValue} />
    </>
  );
}