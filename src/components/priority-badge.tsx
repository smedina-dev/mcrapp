import { priorityOf, workOrderPriorities } from "@/lib/presentation";

export function PriorityBadge({ priority, className = "" }: { priority: string | null | undefined; className?: string }) {
  const config = workOrderPriorities[priorityOf(priority)];
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${config.badge} ${className}`}>{config.label}</span>;
}
