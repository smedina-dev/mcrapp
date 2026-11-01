"use client";

import { useRef } from "react";
import { assignMechanicAction } from "@/app/actions";

type Props = {
  orderId: string;
  processId: string;
  processName: string;
  currentId: string;
  emptyLabel: string;
  options: { id: string; label: string }[];
};

export function ProcessMechanicSelect({ orderId, processId, processName, currentId, emptyLabel, options }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={assignMechanicAction} className="mt-1 px-3 pb-1">
      <input type="hidden" name="orden_id" value={orderId} />
      <input type="hidden" name="proceso_id" value={processId} />
      <label className="flex items-center gap-2 text-xs font-semibold text-[#65716a]">
        Mecánico
        <select
          name="mecanico_id"
          defaultValue={currentId}
          aria-label={`Mecánico de ${processName}`}
          onChange={() => formRef.current?.requestSubmit()}
          className="min-h-10 rounded-lg border border-[#cddbcf] bg-white px-2 text-sm font-normal text-ink"
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
    </form>
  );
}
