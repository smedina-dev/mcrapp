"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, CalendarDays, ClipboardList, ClipboardPlus, LayoutDashboard, Shield, UsersRound, Wrench } from "lucide-react";

const baseNavigation = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/clientes", label: "Clientes", icon: UsersRound },
  { href: "/dashboard/bicicletas", label: "Bicicletas", icon: Bike },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/recepcion", label: "Recepción", icon: ClipboardPlus },
  { href: "/dashboard/ordenes", label: "Órdenes de trabajo", icon: ClipboardList },
];

type MainNavigationProps = { accessRole: "admin" | "jefe_taller" | "empleado" };

export function MainNavigation({ accessRole }: MainNavigationProps) {
  const pathname = usePathname();
  const navigation = [
    ...baseNavigation,
    ...(accessRole === "admin" || accessRole === "jefe_taller"
      ? [{ href: "/dashboard/servicios", label: "Servicios", icon: Wrench }]
      : []),
    ...(accessRole === "admin"
      ? [{ href: "/dashboard/equipo", label: "Equipo", icon: Shield }]
      : []),
  ];

  return (
    <nav aria-label="Navegación principal" className="grid grid-cols-2 gap-2 px-3 py-3 sm:grid-cols-3 md:grid-cols-4 xl:flex xl:flex-1 xl:flex-col">
      {navigation.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition sm:px-4 xl:min-h-12 ${isActive ? "bg-[#e8efe8] text-forest ring-1 ring-inset ring-[#d5d5d5]" : "text-[#56635c] hover:bg-[#f2f5f1] hover:text-ink"}`}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}