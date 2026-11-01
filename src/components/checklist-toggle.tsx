"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItemAction } from "@/app/actions";

type Props = {
  orderId: string;
  processId: string;
  name: string;
  initialDone: boolean;
  initialDoneAt: string | null;
};

function formatShort(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ChecklistToggle({ orderId, processId, name, initialDone, initialDoneAt }: Props) {
  const [done, setDone] = useState(initialDone);
  const [doneAt, setDoneAt] = useState(initialDoneAt);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !done;
    const previous = { done, doneAt };
    setDone(next);
    setDoneAt(next ? new Date().toISOString() : null);
    setFailed(false);
    startTransition(async () => {
      const result = await toggleChecklistItemAction(orderId, processId, next);
      if (!result.ok) {
        setDone(previous.done);
        setDoneAt(previous.doneAt);
        setFailed(true);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={done}
        disabled={pending}
        className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left transition disabled:opacity-70 ${done ? "bg-[#f2f7f1]" : "hover:bg-[#fafbf9]"}`}
      >
        <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 text-base font-bold ${done ? "border-forest bg-forest text-white" : "border-[#b9c4bc] bg-white text-transparent"}`}>✓</span>
        <span className={`min-w-0 flex-1 text-base font-semibold ${done ? "text-[#65716a] line-through" : "text-ink"}`}>{name}</span>
        {done && doneAt ? <span className="shrink-0 text-xs text-[#748079]">{formatShort(doneAt)}</span> : null}
      </button>
      {failed ? <p role="alert" className="px-3 pb-1 text-sm text-[#853321]">No se pudo guardar. Probá de nuevo.</p> : null}
    </div>
  );
}
