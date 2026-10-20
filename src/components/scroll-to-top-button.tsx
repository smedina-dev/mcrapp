"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 300);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      aria-label="Volver al inicio"
      title="Volver al inicio"
      onClick={() => window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      })}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-30 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-forest text-lime shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest/30 sm:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:right-6"
    >
      <ArrowUp size={24} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
