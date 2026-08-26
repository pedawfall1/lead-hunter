"use client";

import { useState } from "react";
import type { Demo } from "@/lib/types";

/**
 * Editor do texto de uma demo já gerada.
 *
 * A LLM acerta o tom mas erra o negócio às vezes — chama de "clínica" o que
 * é consultório, lista um serviço que eles não fazem. Sem isto a única saída
 * era gerar de novo e torcer, e o erro costuma aparecer justo na frente do
 * cliente. Salvar re-renderiza em cima do JSON salvo: **não gasta token**.
 *
 * Fica fora do editor de aparência de propósito: você quase sempre quer um
 * ou outro, e os dois juntos deixariam o painel comprido demais no celular.
 */

type Props = {
  demo: Demo;
  pendente: boolean;
  aoSalvar: (texto: Record<string, unknown>) => void;
};

function Campo({
  rotulo,
  valor,
  aoMudar,
  linhas = 1,
  dica,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  linhas?: number;
  dica?: string;
}) {
  return (
    <div>
      <label className="label">{rotulo}</label>
      {linhas > 1 ? (
        <textarea
          className="input text-[13px] leading-relaxed"
          rows={linhas}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        />
      ) : (
        <input
          className="input text-[13px]"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        />
      )}
      {dica && (
        <p className="mt-1 text-[11px] text-slate-500">{dica}</p>
      )}
    </div>
  );
}

export default function TextoDemo({ demo, pendente, aoSalvar }: Props) {
  const c = demo.conteudo;
  const [titulo, setTitulo] = useState(c?.titulo ?? "");
  const [chamada, setChamada] = useState(c?.chamada ?? "");
  const [subchamada, setSubchamada] = useState(c?.subchamada ?? "");
  const [sobreTitulo, setSobreTitulo] = useState(c?.sobre_titulo ?? "");
  const [sobre, setSobre] = useState((c?.sobre ?? []).join("\n\n"));
  const [servicosTitulo, setServicosTitulo] = useState(c?.servicos_titulo ?? "");
  const [servicos, setServicos] = useState(c?.servicos ?? []);
  const [ctaTitulo, setCtaTitulo] = useState(c?.cta_titulo ?? "");
  const [ctaTexto, setCtaTexto] = useState(c?.cta_texto ?? "");
  const [ctaBotao, setCtaBotao] = useState(c?.cta_botao ?? "");

  function trocarServico(i: number, campo: "nome" | "descricao", v: string) {
    setServicos((lista) =>
      lista.map((s, j) => (j === i ? { ...s, [campo]: v } : s))
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line bg-ink-950 p-3">
      <Campo rotulo="Nome no topo" valor={titulo} aoMudar={setTitulo} />
      <Campo
        rotulo="Chamada (o título grande)"
        valor={chamada}
        aoMudar={setChamada}
        linhas={2}
      />
      <Campo
        rotulo="Subchamada"
        valor={subchamada}
        aoMudar={setSubchamada}
        linhas={2}
      />

      <Campo rotulo="Título do sobre" valor={sobreTitulo} aoMudar={setSobreTitulo} />
      <Campo
        rotulo="Sobre"
        valor={sobre}
        aoMudar={setSobre}
        linhas={6}
        dica="Uma linha em branco separa os parágrafos."
      />

      <Campo
        rotulo="Título dos serviços"
        valor={servicosTitulo}
        aoMudar={setServicosTitulo}
      />
      <div className="space-y-2">
        <span className="label mb-0 block">Serviços</span>
        {servicos.map((s, i) => (
          <div key={i} className="rounded-lg border border-line bg-ink-900 p-2">
            <input
              className="input mb-1.5 text-[13px] font-semibold"
              value={s.nome}
              onChange={(e) => trocarServico(i, "nome", e.target.value)}
              placeholder="Nome do serviço"
            />
            <textarea
              className="input text-[12.5px] leading-relaxed"
              rows={2}
              value={s.descricao}
              onChange={(e) => trocarServico(i, "descricao", e.target.value)}
              placeholder="Descrição"
            />
          </div>
        ))}
        {/* Serviço sem nome é descartado no servidor: esvaziar o nome é
            como se apaga um que o cliente disse que não faz. */}
        <p className="text-[11px] text-slate-500">
          Apague o nome de um serviço para tirá-lo da página.
        </p>
      </div>

      <Campo rotulo="Título do fechamento" valor={ctaTitulo} aoMudar={setCtaTitulo} />
      <Campo rotulo="Texto do fechamento" valor={ctaTexto} aoMudar={setCtaTexto} linhas={3} />
      <Campo rotulo="Texto do botão" valor={ctaBotao} aoMudar={setCtaBotao} />

      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          aoSalvar({
            titulo,
            chamada,
            subchamada,
            sobre_titulo: sobreTitulo,
            // Parágrafo é separado por linha em branco, como se escreve
            // texto — não por um campo por parágrafo, que ninguém preenche.
            sobre: sobre
              .split(/\n\s*\n/)
              .map((p) => p.trim())
              .filter(Boolean),
            servicos_titulo: servicosTitulo,
            servicos,
            cta_titulo: ctaTitulo,
            cta_texto: ctaTexto,
            cta_botao: ctaBotao,
          })
        }
        className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
      >
        {pendente ? "Salvando…" : "Salvar texto (não gasta crédito)"}
      </button>
    </div>
  );
}
