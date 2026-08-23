"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PERIODOS,
  computarRelatorio,
  type Periodo,
} from "@/lib/relatorios";
import type { Interacao, Lead, Projeto, Template } from "@/lib/types";
import Funil from "./Funil";
import SerieTemporal from "./SerieTemporal";
import Ranking from "./Ranking";
import Atividade from "./Atividade";
import Kpi from "./Kpi";

export default function PainelRelatorios({
  leads,
  interacoes,
  projetos,
  templates,
}: {
  leads: Lead[];
  interacoes: Interacao[];
  projetos: Projeto[];
  templates: Template[];
}) {
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [projetoId, setProjetoId] = useState("todos");

  const r = useMemo(
    () =>
      computarRelatorio(leads, interacoes, projetos, templates, {
        periodo,
        projetoId,
      }),
    [leads, interacoes, projetos, templates, periodo, projetoId]
  );

  const vazio = r.totalLeads === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Painel
        </h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Onde a prospecção trava e qual abordagem funciona.
        </p>
      </div>

      {/* filtros numa linha só, acima dos gráficos */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-ink-800 p-0.5">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                periodo === p.valor
                  ? "bg-brand-dim text-brand-soft"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <select
          className="input w-auto min-w-[11rem] py-1.5 text-xs"
          value={projetoId}
          onChange={(e) => setProjetoId(e.target.value)}
          aria-label="Filtrar por projeto"
        >
          <option value="todos">Todos os projetos</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      {vazio ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="text-3xl">📊</span>
          <h2 className="text-base font-semibold text-white">
            Nada para relatar ainda
          </h2>
          <p className="max-w-sm text-sm text-slate-400">
            Os números aparecem conforme você cadastra leads e dispara. Comece
            por um projeto.
          </p>
          <Link href="/projetos" className="btn-primary mt-2">
            Ir para os projetos
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              rotulo="Taxa de resposta"
              valor={r.taxaResposta}
              sufixo="%"
              detalhe={`${r.responderam} de ${r.contatados} contatados`}
              cor="#a78bfa"
              destaque
            />
            <Kpi
              rotulo="Leads no período"
              valor={r.totalLeads}
              detalhe={`${r.qualificados} qualificados`}
            />
            <Kpi
              rotulo="Fechamentos"
              valor={r.fechados}
              detalhe={`${r.taxaFechamento}% da base`}
              cor="#34d399"
            />
            <Kpi
              rotulo="Tempo até responder"
              valor={
                r.tempoMedioResposta === null
                  ? "—"
                  : r.tempoMedioResposta < 24
                    ? r.tempoMedioResposta
                    : Math.round(r.tempoMedioResposta / 24)
              }
              sufixo={
                r.tempoMedioResposta === null
                  ? undefined
                  : r.tempoMedioResposta < 24
                    ? "h"
                    : "d"
              }
              detalhe={
                r.tempoMedioResposta === null
                  ? "precisa do n8n ligado"
                  : "média das respostas"
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Funil etapas={r.funil} />
            <SerieTemporal serie={r.serie} mostrarRespostas={r.temRespostasReais} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Ranking
              titulo="Quais nichos respondem"
              ajuda="Taxa de resposta por projeto, do melhor para o pior."
              linhas={r.porProjeto}
              vazio="Nenhum lead contatado ainda no período."
            />
            <Ranking
              titulo="Qual abordagem funciona"
              ajuda="Dos leads que receberam cada texto, quantos responderam. Um lead conta uma vez por template."
              linhas={r.porTemplate}
              vazio="Ligue o n8n para medir resposta por template."
            />
          </div>

          <Atividade dados={r.atividade} />

          {r.sinais.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-white">
                O que mais qualifica seus leads
              </h2>
              <p className="mb-4 mt-0.5 text-xs text-slate-500">
                Sinais mais frequentes na base — a dor que você mais encontra.
              </p>
              <div className="flex flex-wrap gap-2">
                {r.sinais.map((s) => {
                  const forca = s.n / (r.sinais[0]?.n || 1);
                  return (
                    <span
                      key={s.label}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                      style={{
                        borderColor: `rgba(234,88,12,${0.25 + forca * 0.5})`,
                        backgroundColor: `rgba(234,88,12,${0.06 + forca * 0.14})`,
                        color: "#fdba74",
                      }}
                    >
                      {s.label}
                      <span className="font-semibold tabular-nums">{s.n}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
