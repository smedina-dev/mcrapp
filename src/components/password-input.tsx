"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  id: string;
  name: string;
  autoComplete?: string;
  minLength?: number;
  className?: string;
  hideOnChangeOf?: string;
};

export function PasswordInput({ id, name, autoComplete, minLength, className, hideOnChangeOf }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hideOnChangeOf) return;
    const field = document.getElementById(hideOnChangeOf);
    if (!field) return;
    const hide = () => setVisible(false);
    field.addEventListener("input", hide);
    return () => field.removeEventListener("input", hide);
  }, [hideOnChangeOf]);

  return (
    <span className="relative mt-2 block">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className={className ?? "block w-full rounded-md border border-line bg-white py-3 pl-3 pr-11 font-normal outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#65716a] hover:text-forest"
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </span>
  );
}
