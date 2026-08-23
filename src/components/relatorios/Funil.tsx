"use client";

import type { EtapaFunil } from "@/lib/relatorios";

/**
 * Funil de conversão.
 *
 * As etapas usam as cores de status do app — é a mesma paleta reservada que
 * o kanban já ensinou ao usuário ("verde = fechou"). A ordem fica legível
 * pela largura decrescente e pelo rótulo, não pela cor.
 */
export default function Funil({ etapas }: { etapas: EtapaFunil[] }) {
  const topo = etapas[0]?.valor || 1;

  return (
    <div className="card p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Funil de conversão</h2>
        <span className="text-xs text-slate-500">
          {etapas[0]?.valor ?? 0} leads no topo
        </span>
      </div>
      <p className="mb-5 text-xs text-slate-500">
        Cada etapa conta quem chegou até ali, incluindo quem já passou adiante.
      </p>

      <div className="space-y-2.5">
        {etapas.map((e, i) => {
          const largura = Math.max((e.valor / topo) * 100, e.valor > 0 ? 4 : 0.8);
          return (
            <div key={e.chave}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: e.cor }}
                  />
                  {e.label}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-semibold tabular-nums text-white">
                    {e.valor}
                  </span>
                  {e.conversao !== null && (
                    <span
                      className="tabular-nums text-slate-500"
                      title={`${e.conversao}% de quem chegou em ${etapas[i - 1].label}`}
                    >
                      {e.conversao}%
                    </span>
                  )}
                </span>
              </div>

              <div className="h-7 w-full overflow-hidden rounded-md bg-ink-900">
                <div
                  className="h-full rounded-md transition-[width] duration-500"
                  style={{ width: `${largura}%`, backgroundColor: e.cor }}
                  title={`${e.label}: ${e.valor} leads (${e.doTopo}% do topo)`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
