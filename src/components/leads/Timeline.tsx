"use client";

import { useState, useTransition } from "react";
import {
  excluirInteracao,
  registrarInteracao,
} from "@/app/actions/interacoes";
import { IconTrash, IconWhatsapp } from "@/components/ui/icons";
import { TIPOS_INTERACAO, type Interacao, type TipoInteracao } from "@/lib/types";

const ROTULOS: Record<TipoInteracao, { label: string; emoji: string; cor: string }> = {
  whatsapp: { label: "WhatsApp", emoji: "", cor: "#25D366" },
  ligacao: { label: "Ligação", emoji: "📞", cor: "#38bdf8" },
  visita: { label: "Visita", emoji: "🚶", cor: "#fbbf24" },
  email: { label: "E-mail", emoji: "✉️", cor: "#a78bfa" },
  nota: { label: "Nota", emoji: "📝", cor: "#94a3b8" },
};

function quando(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function Timeline({
  leadId,
  projetoId,
  interacoes,
  aoMudar,
}: {
  leadId: string;
  projetoId: string;
  interacoes: Interacao[];
  aoMudar: (lista: Interacao[]) => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [tipo, setTipo] = useState<TipoInteracao>("ligacao");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function registrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await registrarInteracao(leadId, projetoId, tipo, texto);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.data) aoMudar([r.data, ...interacoes]);
      setTexto("");
    });
  }

  function remover(id: string) {
    iniciar(async () => {
      const r = await excluirInteracao(id, projetoId);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aoMudar(interacoes.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={registrar} className="space-y-2">
        <div className="flex gap-2">
          <select
            className="input w-32 shrink-0"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoInteracao)}
            aria-label="Tipo de interação"
          >
            {TIPOS_INTERACAO.map((t) => (
              <option key={t} value={t}>
                {ROTULOS[t].label}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O que aconteceu?"
          />
          <button
            type="submit"
            className="btn-ghost shrink-0"
            disabled={pendente || !texto.trim()}
          >
            Anotar
          </button>
        </div>
        {erro && <p className="text-xs text-rose-300">{erro}</p>}
      </form>

      {interacoes.length === 0 ? (
        <p className="rounded-lg border border-line bg-ink-900 px-3 py-6 text-center text-xs text-slate-500">
          Nenhum contato registrado ainda. O botão de WhatsApp anota sozinho.
        </p>
      ) : (
        <ol className="space-y-0">
          {interacoes.map((i, idx) => {
            const meta = ROTULOS[i.tipo];
            const entrada = i.direcao === "entrada";
            return (
              <li key={i.id} className="group relative flex gap-3 pb-4">
                <div className="flex flex-col items-center">
                  <span
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]"
                    style={
                      entrada
                        ? { backgroundColor: "#34d39922", color: "#34d399" }
                        : { backgroundColor: `${meta.cor}22`, color: meta.cor }
                    }
                  >
                    {i.tipo === "whatsapp" ? (
                      <IconWhatsapp className="h-3.5 w-3.5" />
                    ) : (
                      meta.emoji
                    )}
                  </span>
                  {idx < interacoes.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-line" />
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span
                      className="text-xs font-medium"
                      style={{ color: entrada ? "#34d399" : meta.cor }}
                    >
                      {entrada ? "Resposta do lead" : meta.label}
                    </span>
                    {!entrada && i.lido_em && (
                      <span className="text-[10px] text-st-contatado">✓✓ lido</span>
                    )}
                    {!entrada && !i.lido_em && i.entregue_em && (
                      <span className="text-[10px] text-slate-500">✓ entregue</span>
                    )}
                    {i.erro && (
                      <span
                        className="text-[10px] text-st-descartado"
                        title={i.erro}
                      >
                        falhou
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">{quando(i.criado_em)}</span>
                    <button
                      type="button"
                      onClick={() => remover(i.id)}
                      disabled={pendente}
                      className="ml-auto rounded p-1 text-slate-600 opacity-0 transition-opacity hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label="Excluir registro"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {i.texto && (
                    <p
                      className={`mt-1 whitespace-pre-wrap break-words text-[13px] leading-snug ${
                        entrada
                          ? "rounded-lg rounded-tl-none bg-[#005c4b] px-3 py-2 text-slate-50"
                          : "text-slate-300"
                      }`}
                    >
                      {i.texto}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
