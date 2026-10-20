"use client";

import { useMemo, useState } from "react";
import { linkBicycleToCustomerAction } from "@/app/actions";

type UnassignedBicycle = {
  id: string;
  marca_modelo: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
};

export function UnassignedBicycleLinker({
  customerId,
  bicycles,
}: {
  customerId: string;
  bicycles: UnassignedBicycle[];
}) {
  const [query, setQuery] = useState("");
  const [bicycleId, setBicycleId] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("es-AR");
  const matches = useMemo(() => bicycles.filter((bicycle) => {
    if (!normalizedQuery) return true;
    return [
      bicycle.id,
      bicycle.marca,
      bicycle.modelo,
      bicycle.marca_modelo,
      bicycle.numero_serie,
    ].filter(Boolean).join(" ").toLocaleLowerCase("es-AR").includes(normalizedQuery);
  }), [bicycles, normalizedQuery]);

  if (!bicycles.length) return null;

  return (
    <details className="mt-4 border-t border-[#edf0ec] pt-3">
      <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-forest">Vincular bicicleta existente</summary>
      <form action={linkBicycleToCustomerAction} className="mt-3 space-y-3 rounded-xl bg-[#f8faf7] p-4">
        <input type="hidden" name="cliente_id" value={customerId} />
        <label className="block text-sm font-semibold" htmlFor={`unassigned-bike-search-${customerId}`}>
          Buscar por marca, modelo o número de cuadro
          <input
            id={`unassigned-bike-search-${customerId}`}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setBicycleId("");
            }}
            className="form-input"
            placeholder="Ej.: ZENITH o 0424060940"
          />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`unassigned-bike-${customerId}`}>
          Bicicleta sin asignar
          <select
            id={`unassigned-bike-${customerId}`}
            name="bicicleta_id"
            required
            value={bicycleId}
            onChange={(event) => setBicycleId(event.target.value)}
            className="form-input"
          >
            <option value="">Seleccionar bicicleta</option>
            {matches.map((bicycle) => (
              <option key={bicycle.id} value={bicycle.id}>
                {[bicycle.marca ?? bicycle.marca_modelo, bicycle.modelo, bicycle.numero_serie ? `Cuadro ${bicycle.numero_serie}` : null]
                  .filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </label>
        {!matches.length ? <p className="text-sm text-[#65716a]">No hay bicicletas sin asignar que coincidan con la búsqueda.</p> : null}
        <button type="submit" disabled={!bicycleId} className="min-h-11 rounded-xl bg-forest px-4 text-sm font-bold text-white hover:bg-[#125840] disabled:cursor-not-allowed disabled:opacity-50">
          Vincular al cliente
        </button>
      </form>
    </details>
  );
}
