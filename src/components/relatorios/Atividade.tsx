"use client";

/**
 * Calendário de disparos das últimas 12 semanas.
 *
 * Magnitude numa grade = sequencial de uma cor só, do escuro ao claro.
 * Nada de arco-íris: mais claro é mais.
 */
const RAMPA = ["#161e2b", "#7c2d12", "#c2410c", "#ea580c", "#fb923c"];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

function nivel(n: number, max: number): number {
  if (n === 0) return 0;
  if (max <= 1) return 4;
  const r = n / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

export default function Atividade({
  dados,
}: {
  dados: { dia: string; n: number }[];
}) {
  const max = Math.max(1, ...dados.map((d) => d.n));
  const total = dados.reduce((a, d) => a + d.n, 0);

  // 12 colunas de 7 dias, alinhadas pelo dia da semana
  const primeiro = dados[0];
  const deslocamento = primeiro
    ? new Date(primeiro.dia + "T00:00:00").getDay()
    : 0;
  const celulas: ({ dia: string; n: number } | null)[] = [
    ...Array(deslocamento).fill(null),
    ...dados,
  ];

  return (
    <div className="card p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Ritmo de prospecção</h2>
        <span className="text-xs text-slate-500">
          {total} disparos em 12 semanas
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Cada quadrado é um dia. Mais claro, mais disparos.
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          <div className="mr-1 grid shrink-0 grid-rows-7 gap-[3px]">
            {DIAS.map((d, i) => (
              <span
                key={i}
                className="flex h-[13px] items-center text-[9px] leading-none text-slate-600"
              >
                {i % 2 === 1 ? d : ""}
              </span>
            ))}
          </div>

          {Array.from({ length: Math.ceil(celulas.length / 7) }).map((_, col) => (
            <div key={col} className="grid shrink-0 grid-rows-7 gap-[3px]">
              {celulas.slice(col * 7, col * 7 + 7).map((c, i) =>
                c ? (
                  <span
                    key={c.dia}
                    className="h-[13px] w-[13px] rounded-[3px]"
                    style={{ backgroundColor: RAMPA[nivel(c.n, max)] }}
                    title={`${c.dia.slice(8, 10)}/${c.dia.slice(5, 7)}: ${c.n} ${
                      c.n === 1 ? "disparo" : "disparos"
                    }`}
                  />
                ) : (
                  <span key={`v${col}-${i}`} className="h-[13px] w-[13px]" />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-500">
        <span>menos</span>
        {RAMPA.map((c) => (
          <span
            key={c}
            className="h-[11px] w-[11px] rounded-[3px]"
            style={{ backgroundColor: c }}
          />
        ))}
        <span>mais</span>
      </div>
    </div>
  );
}
