"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type SignUpFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function SignUpForm({ action }: SignUpFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const hasConfirmation = confirmPassword.length > 0;
  const passwordsMatch = hasConfirmation && password === confirmPassword;
  const showMismatch = hasConfirmation && !passwordsMatch;

  return (
    <form action={action} className="mt-5 space-y-4">
      <label className="block text-sm font-semibold text-ink" htmlFor="signup-email">Correo electrónico
        <input id="signup-email" name="email" type="email" autoComplete="email" required className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-3 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15" />
      </label>
      <label className="block text-sm font-semibold text-ink" htmlFor="signup-password">Contraseña (mínimo 8 caracteres)
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-3 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
        />
      </label>
      <label className="block text-sm font-semibold text-ink" htmlFor="signup-confirm-password">Confirmar contraseña
        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={showMismatch}
          aria-describedby={showMismatch ? "signup-password-mismatch" : passwordsMatch ? "signup-password-match" : undefined}
          className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-3 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
        />
      </label>
      {passwordsMatch ? (
        <p id="signup-password-match" role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-forest">
          <Check size={16} aria-hidden="true" />
          Las contraseñas coinciden.
        </p>
      ) : null}
      {showMismatch ? (
        <p id="signup-password-mismatch" role="alert" aria-live="polite" className="text-sm text-[#853321]">
          Las contraseñas no coinciden.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!password || !passwordsMatch}
        className="w-full rounded-md border border-forest px-4 py-3 text-sm font-bold text-forest hover:bg-[#e8efe8] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Crear cuenta
      </button>
    </form>
  );
}
