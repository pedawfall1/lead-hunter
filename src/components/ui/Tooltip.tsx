"use client";

/**
 * Tooltip simples via CSS (funciona no hover no desktop e no focus no teclado).
 * No mobile o texto tambem aparece ao tocar, pois o botao recebe foco.
 */
export default function Tooltip({
  texto,
  children,
}: {
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-1 left-1/2 z-30 w-max max-w-[12rem] -translate-x-1/2 -translate-y-full
                   rounded-md border border-line bg-ink-700 px-2 py-1 text-[11px] font-medium text-slate-200 opacity-0
                   shadow-card transition-opacity group-hover/tt:opacity-100 group-focus-within/tt:opacity-100"
      >
        {texto}
      </span>
    </span>
  );
}
