"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type WorkOrderListItemProps = {
  orderId: string;
  orderLabel: string;
  summary: ReactNode;
  children: ReactNode;
};

export function WorkOrderListItem({ orderId, orderLabel, summary, children }: WorkOrderListItemProps) {
  const [open, setOpen] = useState(false);
  const detailId = `order-detail-${orderId}`;

  return (
    <article className="rounded-2xl border border-[#e2e7e1] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">{summary}</div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/dashboard/ordenes/${orderId}`} aria-label={`Ingresar a ${orderLabel}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#125840]">Ingresar</Link>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={`${open ? "Ocultar" : "Ver"} detalle de ${orderLabel}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cddbcf] px-5 text-sm font-bold text-forest hover:bg-[#f2f7f1]"
          >
            {open ? "Ocultar" : "Detalle"}
          </button>
        </div>
      </div>
      {open ? (
        <div id={detailId} className="mt-4 border-t border-[#edf0ec] pt-4">
          {children}
          <button type="button" onClick={() => setOpen(false)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cddbcf] px-5 text-sm font-bold text-forest hover:bg-[#f2f7f1]">Ocultar detalle</button>
        </div>
      ) : null}
    </article>
  );
}
