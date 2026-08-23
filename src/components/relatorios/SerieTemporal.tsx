"use client";

import { useState } from "react";
import type { PontoSerie } from "@/lib/relatorios";

/* Par validado para superfície escura #111823:
   ΔE 23.4 em protanopia, 34.4 em tritanopia, contraste acima de 3:1. */
const ENVIADOS = "#ea580c";
const RESPOSTAS = "#0284c7";

const L = 34; // espaço do eixo Y
const A = 168; // altura da área de plotagem
const T = 8;

function caminho(pontos: [number, number][], fechar: boolean, base: number) {
  if (!pontos.length) return "";
  const d = pontos.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  if (!fechar) return d;
  const [x0] = pontos[0];
  const [xn] = pontos[pontos.length - 1];
  return `${d} L${xn},${base} L${x0},${base} Z`;
}

export default function SerieTemporal({
  serie,
  mostrarRespostas,
}: {
  serie: PontoSerie[];
  mostrarRespostas: boolean;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);

  const larg = 640;
  const max = Math.max(
    4,
    ...serie.map((p) => Math.max(p.enviados, mostrarRespostas ? p.respostas : 0))
  );
  const passo = serie.length > 1 ? (larg - L - T) / (serie.length - 1) : 0;
  const x = (i: number) => L + i * passo;
  const y = (v: number) => T + A - (v / max) * A;

  const pEnv = serie.map((p, i) => [x(i), y(p.enviados)] as [number, number]);
  const pResp = serie.map((p, i) => [x(i), y(p.respostas)] as [number, number]);

  const marcas = [0, Math.round(max / 2), max];
  const ponto = ativo === null ? null : serie[ativo];

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Atividade no período</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Disparos por dia{mostrarRespostas ? " e respostas recebidas" : ""}
          </p>
        </div>
        {mostrarRespostas && (
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: ENVIADOS }}
              />
              Enviados
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: RESPOSTAS }}
              />
              Respostas
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${larg} ${A + T + 22}`}
          className="w-full"
          role="img"
          aria-label="Disparos por dia no período"
          onMouseLeave={() => setAtivo(null)}
        >
          {marcas.map((m) => (
            <g key={m}>
              <line
                x1={L}
                x2={larg - T}
                y1={y(m)}
                y2={y(m)}
                stroke="#243044"
                strokeWidth="1"
              />
              <text
                x={L - 7}
                y={y(m) + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {m}
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id="grad-env" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ENVIADOS} stopOpacity="0.34" />
              <stop offset="100%" stopColor={ENVIADOS} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <path d={caminho(pEnv, true, T + A)} fill="url(#grad-env)" />
          <path
            d={caminho(pEnv, false, 0)}
            fill="none"
            stroke={ENVIADOS}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {mostrarRespostas && (
            <path
              d={caminho(pResp, false, 0)}
              fill="none"
              stroke={RESPOSTAS}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {ativo !== null && (
            <line
              x1={x(ativo)}
              x2={x(ativo)}
              y1={T}
              y2={T + A}
              stroke="#33415c"
              strokeWidth="1"
            />
          )}
          {ativo !== null && (
            <circle
              cx={x(ativo)}
              cy={y(serie[ativo].enviados)}
              r="4"
              fill={ENVIADOS}
              stroke="#111823"
              strokeWidth="2"
            />
          )}
          {ativo !== null && mostrarRespostas && (
            <circle
              cx={x(ativo)}
              cy={y(serie[ativo].respostas)}
              r="4"
              fill={RESPOSTAS}
              stroke="#111823"
              strokeWidth="2"
            />
          )}

          {/* alvos de hover: mais largos que a marca */}
          {serie.map((p, i) => (
            <rect
              key={p.dia}
              x={x(i) - passo / 2}
              y={T}
              width={Math.max(passo, 6)}
              height={A}
              fill="transparent"
              onMouseEnter={() => setAtivo(i)}
            />
          ))}

          {serie.map((p, i) =>
            i % Math.ceil(serie.length / 6) === 0 ? (
              <text
                key={p.dia}
                x={x(i)}
                y={A + T + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {p.dia.slice(8, 10)}/{p.dia.slice(5, 7)}
              </text>
            ) : null
          )}
        </svg>

        {ponto && (
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-line bg-ink-700 px-3 py-1.5 text-xs shadow-card">
            <span className="text-slate-400">
              {ponto.dia.slice(8, 10)}/{ponto.dia.slice(5, 7)}
            </span>
            <span className="ml-2 tabular-nums text-white">
              {ponto.enviados} enviados
            </span>
            {mostrarRespostas && (
              <span className="ml-2 tabular-nums" style={{ color: RESPOSTAS }}>
                {ponto.respostas} resp.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
