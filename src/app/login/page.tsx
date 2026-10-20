import { signInAction, signUpAction } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { SignUpForm } from "@/components/sign-up-form";
import { ThemeToggle } from "@/components/theme-toggle";

type LoginPageProps = {
  searchParams: { error?: string; message?: string };
};

const errorMessages: Record<string, string> = {
  datos: "Revisá el correo y la contraseña. Debe tener al menos 8 caracteres y coincidir con su confirmación.",
  credenciales: "El correo o la contraseña no son correctos.",
  acceso: "Tu acceso al taller está desactivado. Contactá a un administrador.",
  registro: "No se pudo crear la cuenta. Probá con otro correo.",
  confirmacion: "El enlace de confirmación no es válido o ya venció. Solicitá uno nuevo.",
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorMessage = searchParams.error ? errorMessages[searchParams.error] : undefined;

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(400px,0.85fr)]">
      <section className="relative flex min-h-[32vh] flex-col justify-between overflow-hidden bg-[#111111] px-7 py-8 text-[#f4f5f0] sm:px-12 lg:min-h-screen lg:px-16 lg:py-12">
        <div className="absolute inset-0 opacity-25" aria-hidden="true" style={{ backgroundImage: "linear-gradient(135deg, transparent 48%, #c8c8c8 48.2%, transparent 48.6%), linear-gradient(45deg, transparent 72%, #c8c8c8 72.2%, transparent 72.5%)", backgroundSize: "64px 64px" }} />
        <div className="relative flex items-center gap-3">
          <BrandLogo width={150} height={52} priority className="h-12 w-36 object-contain" />
        </div>
        <div className="relative max-w-xl py-12 lg:py-0">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-lime">Gestión de taller</p>
          <h1 className="max-w-lg text-4xl font-bold leading-[1.06] sm:text-5xl">Cada bicicleta, en buenas manos.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#cad5ce]">Clientes, turnos y órdenes de trabajo en un solo lugar.</p>
        </div>
        <p className="relative hidden text-xs text-[#cad5ce] lg:block">Organizá el taller. Cuidá cada detalle.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-5 flex items-center justify-between">
            <ThemeToggle className="ml-auto text-forest" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Ingresar a tu cuenta</h2>
          <p className="mt-2 text-sm text-[#65716a]">Accedé al espacio de tu taller.</p>
          {errorMessage ? <p role="alert" className="mt-5 border-l-2 border-[#ba4c35] bg-white px-4 py-3 text-sm text-[#853321]">{errorMessage}</p> : null}
          {searchParams.message === "confirmacion" ? <p role="status" className="mt-5 border-l-2 border-forest bg-white px-4 py-3 text-sm text-forest">Revisá tu correo para confirmar la cuenta y luego ingresá.</p> : null}
          <form action={signInAction} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold text-ink" htmlFor="login-email">Correo electrónico
              <input id="login-email" name="email" type="email" autoComplete="email" required className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-3 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15" />
            </label>
            <label className="block text-sm font-semibold text-ink" htmlFor="login-password">Contraseña
              <input id="login-password" name="password" type="password" autoComplete="current-password" minLength={8} required className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-3 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15" />
            </label>
            <button type="submit" className="flex w-full items-center justify-center rounded-md bg-forest px-4 py-3 text-sm font-bold text-white transition hover:bg-[#125840]">Ingresar</button>
          </form>
          <div className="my-7 border-t border-line" />
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-forest">Crear una cuenta de taller</summary>
            <SignUpForm action={signUpAction} />
          </details>
        </div>
      </section>
    </main>
  );
}