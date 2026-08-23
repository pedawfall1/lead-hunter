import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { LeadStatus } from "@/lib/types";

export default function GraficoStatus({
  contagem,
}: {
  contagem: Record<LeadStatus, number>;
}) {
  const maior = Math.max(1, ...STATUS_ORDER.map((s) => contagem[s]));
  const total = STATUS_ORDER.reduce((acc, s) => acc + contagem[s], 0);

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-white">Leads por status</h2>
        <span className="text-xs text-slate-500">{total} no total</span>
      </div>

      <div className="space-y-3">
        {STATUS_ORDER.map((s) => {
          const meta = STATUS_META[s];
          const n = contagem[s];
          const pct = Math.round((n / maior) * 100);
          return (
            <div key={s} className="flex items-center gap-3">
              <span className="w-[5.5rem] shrink-0 text-xs text-slate-400">
                {meta.label}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${n === 0 ? 0 : Math.max(pct, 3)}%`,
                    backgroundColor: meta.cor,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-300">
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
