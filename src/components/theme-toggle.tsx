"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const themeStorageKey = "taller-theme";

type ThemeToggleProps = { className?: string };

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const dark = document.documentElement.dataset.theme === "dark";
    setIsDark(dark);
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;
    document.documentElement.dataset.theme = nextIsDark ? "dark" : "light";
    window.localStorage.setItem(themeStorageKey, nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Cambiar a tema ${isDark ? "claro" : "oscuro"}`}
      aria-pressed={isDark}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-current px-3 text-sm font-semibold text-current transition hover:bg-black/5 sm:px-4 ${className}`}
    >
      {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
      <span className="hidden sm:inline">{isDark ? "Tema claro" : "Tema oscuro"}</span>
    </button>
  );
}
