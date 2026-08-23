"use client";

import type { LinhaRanking } from "@/lib/relatorios";

/**
 * Barras horizontais para categorias nominais (projeto, template).
 *
 * Todas as barras usam a MESMA cor de propósito: a categoria não tem ordem
 * natural, então colorir por valor gastaria o canal de identidade
 * re-encodando o que o comprimento da barra já mostra.
 */
const HUE = "#ea580c";

export default function Ranking({
  titulo,
  ajuda,
  linhas,
  vazio,
}: {
  titulo: string;
  ajuda: string;
  linhas: LinhaRanking[];
  vazio: string;
}) {
  const max = Math.max(1, ...linhas.map((l) => l.taxa));

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-white">{titulo}</h2>
      <p className="mb-4 mt-0.5 text-xs text-slate-500">{ajuda}</p>

      {linhas.length === 0 ? (
        <p className="rounded-lg border border-line bg-ink-900 px-3 py-6 text-center text-xs text-slate-500">
          {vazio}
        </p>
      ) : (
        <ol className="space-y-3">
          {linhas.map((l) => (
            <li key={l.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] text-slate-200">{l.nome}</span>
                <span className="flex shrink-0 items-baseline gap-2 text-xs">
                  <span className="text-slate-500">{l.detalhe}</span>
                  <span className="font-semibold tabular-nums text-white">
                    {l.taxa}%
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((l.taxa / max) * 100, l.taxa > 0 ? 3 : 0)}%`,
                    backgroundColor: HUE,
                  }}
                  title={`${l.nome}: ${l.respostas} de ${l.enviados} responderam`}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
