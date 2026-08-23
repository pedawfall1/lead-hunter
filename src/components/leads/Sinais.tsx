"use client";

import type { Criterio, Sinais as TSinais } from "@/lib/types";

/** Checkboxes dos critérios do projeto, dentro de um <form>. */
export function EditorSinais({
  criterios,
  valor,
}: {
  criterios: Criterio[];
  valor: TSinais;
}) {
  if (!criterios.length) {
    return (
      <p className="rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
        Este projeto ainda não tem critérios de qualificação. Defina o serviço e
        os sinais na edição do projeto — é o que faz a abordagem se adaptar.
      </p>
    );
  }

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {criterios.map((c) => (
        <label
          key={c.chave}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600"
        >
          <input
            type="checkbox"
            name={`sinal:${c.chave}`}
            defaultChecked={!!valor[c.chave]}
            className="h-4 w-4 shrink-0 accent-brand"
          />
          <span className="leading-snug">{c.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Só leitura: as etiquetas dos sinais ativos. */
export function TagsSinais({
  rotulos,
  max = 3,
  compacto,
}: {
  rotulos: string[];
  max?: number;
  compacto?: boolean;
}) {
  if (!rotulos.length) return null;
  const mostrar = rotulos.slice(0, max);
  const resto = rotulos.length - mostrar.length;

  return (
    <div className="flex flex-wrap gap-1">
      {mostrar.map((r) => (
        <span
          key={r}
          className={`rounded border border-brand/25 bg-brand/10 text-brand-soft ${
            compacto ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
          }`}
        >
          {r}
        </span>
      ))}
      {resto > 0 && (
        <span
          className={`rounded border border-line bg-ink-700 text-slate-400 ${
            compacto ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
          }`}
        >
          +{resto}
        </span>
      )}
    </div>
  );
}
