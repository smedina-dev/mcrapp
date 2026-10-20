import { acceptEmployeeInvitationAction } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

type AcceptInvitePageProps = { searchParams: { error?: string } };

export default function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <div className="absolute right-4 top-4 text-forest sm:right-6 sm:top-6"><ThemeToggle /></div>
      <section className="w-full max-w-lg border border-line bg-[#fbfcf8] p-6 sm:p-9">
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#111111] px-4 py-3 text-white">
          <BrandLogo width={112} height={40} className="h-10 w-28 object-contain" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Invitación al taller</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">Creá tu contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-[#65716a]">Elegí una contraseña personal para ingresar con tu cuenta.</p>
        {searchParams.error ? <p role="alert" className="mt-5 border-l-2 border-[#ba4c35] bg-white px-4 py-3 text-sm text-[#853321]">{searchParams.error === "contrasena" ? "No se pudo guardar la contraseña. Intentá nuevamente." : "Las contraseñas deben coincidir y tener al menos 8 caracteres."}</p> : null}
        <form action={acceptEmployeeInvitationAction} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-ink" htmlFor="employee-password">Contraseña
            <input id="employee-password" name="password" type="password" autoComplete="new-password" minLength={8} required className="form-input" />
          </label>
          <label className="block text-sm font-semibold text-ink" htmlFor="employee-confirm-password">Confirmar contraseña
            <input id="employee-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className="form-input" />
          </label>
          <button type="submit" className="w-full rounded-md bg-forest px-4 py-3 text-base font-bold text-white hover:bg-[#125840]">Guardar contraseña e ingresar</button>
        </form>
      </section>
    </main>
  );
}
