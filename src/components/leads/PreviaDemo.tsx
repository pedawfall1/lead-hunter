"use client";

import { useState } from "react";

/**
 * A demo dentro do app, num aparelho de mentira.
 *
 * É um iframe da própria rota pública, então o que aparece aqui é
 * exatamente o que o cliente vai abrir — não uma reconstrução que pode
 * divergir do HTML gravado.
 *
 * O iframe carrega em tamanho real e encolhe por `transform: scale`. Usar
 * largura pequena de verdade dispararia os media queries do template e você
 * veria o layout de celular achando que é o de desktop.
 */

type Modo = "celular" | "desktop";

const APARELHOS: Record<
  Modo,
  { largura: number; altura: number; escala: number; raio: number }
> = {
  celular: { largura: 390, altura: 780, escala: 0.56, raio: 28 },
  desktop: { largura: 1280, altura: 800, escala: 0.34, raio: 8 },
};

export default function PreviaDemo({
  slug,
  /** muda quando a demo é re-renderizada, para o iframe recarregar */
  versao,
}: {
  slug: string;
  versao: string | number;
}) {
  const [modo, setModo] = useState<Modo>("celular");
  const a = APARELHOS[modo];

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-1 rounded-lg bg-ink-900 p-1">
        {(["celular", "desktop"] as Modo[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`flex-1 rounded-md px-2 py-1 text-[12px] font-medium capitalize transition-colors ${
              modo === m
                ? "bg-ink-700 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex justify-center rounded-lg border border-line bg-ink-950 p-4">
        <div
          className="relative overflow-hidden border-4 border-ink-700 bg-white shadow-card"
          style={{
            width: a.largura * a.escala,
            height: a.altura * a.escala,
            borderRadius: a.raio,
          }}
        >
          <iframe
            // `versao` no src força o recarregamento depois de trocar a
            // cor: sem isso o iframe mostra o HTML antigo em cache.
            src={`/demo/${encodeURIComponent(slug)}?v=${versao}`}
            title="Prévia da demo"
            className="origin-top-left border-0"
            style={{
              width: a.largura,
              height: a.altura,
              transform: `scale(${a.escala})`,
            }}
            // A demo é nossa e do mesmo domínio, mas ela roda script
            // nenhum — o sandbox some com qualquer surpresa futura.
            sandbox=""
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
