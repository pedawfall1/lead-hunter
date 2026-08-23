"use client";

import { useEffect } from "react";
import { IconClose } from "./icons";

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  largura?: "sm" | "md" | "lg";
};

const LARGURAS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
};

export default function Modal({
  aberto,
  aoFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  largura = "md",
}: Props) {
  useEffect(() => {
    if (!aberto) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", onKey);

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = anterior;
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
        onClick={aoFechar}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl border border-line bg-ink-800 shadow-card sm:rounded-2xl ${LARGURAS[largura]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white">
              {titulo}
            </h2>
            {subtitulo && (
              <p className="mt-0.5 truncate text-xs text-slate-400">{subtitulo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="-mr-1 -mt-1 rounded-lg p-2 text-slate-400 transition-colors hover:bg-ink-700 hover:text-slate-200"
            aria-label="Fechar"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {rodape && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-ink-900/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
