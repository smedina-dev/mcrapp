import { redirect } from "next/navigation";
import { createWorkshopAction } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

type OnboardingPageProps = {
  searchParams: { error?: string };
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workshop } = await supabase.from("taller").select("id").eq("user_id", user.id).maybeSingle();
  if (workshop) redirect("/dashboard");

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <div className="absolute right-4 top-4 text-forest sm:right-6 sm:top-6"><ThemeToggle /></div>
      <section className="w-full max-w-xl border border-line bg-[#fbfcf8] p-6 sm:p-9">
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#111111] px-4 py-3 text-white">
          <BrandLogo width={112} height={40} className="h-10 w-28 object-contain" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Configuración inicial</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">Contanos sobre tu taller</h1>
        <p className="mt-2 text-sm leading-6 text-[#65716a]">Estos datos identifican tu espacio de trabajo.</p>
        {searchParams.error ? <p role="alert" className="mt-5 text-sm text-[#853321]">No pudimos guardar los datos. Revisá el formulario e intentá de nuevo.</p> : null}
        <form action={createWorkshopAction} className="mt-7 space-y-4">
          <label className="block text-sm font-semibold" htmlFor="workshop-name">Nombre del taller
            <input id="workshop-name" name="nombre" required maxLength={255} className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-3 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="workshop-tax-id">CUIT / RUT <span className="font-normal text-[#748079]">(opcional)</span>
            <input id="workshop-tax-id" name="cuit_rut" maxLength={50} className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-3 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="workshop-phone">Teléfono <span className="font-normal text-[#748079]">(opcional)</span>
            <input id="workshop-phone" name="telefono" type="tel" maxLength={50} className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-3 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15" />
          </label>
          <button type="submit" className="w-full rounded-md bg-forest px-4 py-3 text-sm font-bold text-white hover:bg-[#125840]">Crear mi taller</button>
        </form>
      </section>
    </main>
  );
}