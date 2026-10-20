import { Bike, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { MainNavigation } from "@/components/main-navigation";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  children: ReactNode;
  workshopName: string;
  userName: string;
  accessRole: "admin" | "jefe_taller" | "empleado";
};

export function AppShell({ children, workshopName, userName, accessRole }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between gap-3 bg-[#111111] px-4 py-3 text-white shadow-md sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo width={120} height={44} priority className="h-10 w-24 shrink-0 object-contain sm:h-11 sm:w-[120px]" />
        </div>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold sm:text-base">¡Hola, {userName}!</p>
        <ThemeToggle />
      </header>
      <div className="xl:grid xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-[#e0e5df] bg-white xl:sticky xl:top-[76px] xl:h-[calc(100vh-76px)] xl:border-b-0 xl:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-[#e8ece7] px-5 py-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-forest text-lime">
              <Bike size={21} strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{workshopName}</p>
              <p className="mt-0.5 text-sm text-[#748079]">Espacio de trabajo</p>
            </div>
            <form action={signOutAction} className="ml-auto xl:hidden">
              <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className="grid h-12 w-12 place-items-center rounded-xl text-[#56635c] hover:bg-[#edf2e9]"><LogOut size={19} /></button>
            </form>
          </div>
          <MainNavigation accessRole={accessRole} />
          <form action={signOutAction} className="hidden border-t border-[#e8ece7] p-3 xl:block">
            <button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#56635c] hover:bg-[#edf2e9]" type="submit">
              <LogOut size={17} aria-hidden="true" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-7 sm:py-8 xl:px-10 xl:py-10">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
      </div>
      <ScrollToTopButton />
    </div>
  );
}