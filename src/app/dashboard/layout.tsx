import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireWorkshop } from "@/lib/workshop";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { workshop, displayName, accessRole } = await requireWorkshop();

  return <AppShell workshopName={workshop.nombre} userName={displayName} accessRole={accessRole}>{children}</AppShell>;
}