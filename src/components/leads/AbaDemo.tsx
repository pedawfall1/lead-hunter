"use client";

import { useEffect, useState, useTransition } from "react";
import { IconCheck, IconCopy, IconTrash } from "@/components/ui/icons";
import {
  excluirDemo,
  gerarDemo,
  listarDemos,
  publicarDemo,
} from "@/app/actions/site";
import { montarBriefing, promptParaColar } from "@/lib/site/briefing";
import { dataCurta } from "@/lib/format";
import type { Demo, Lead, Projeto } from "@/lib/types";

type Props = {
  lead: Lead;
  projeto: Projeto;
  /** OPENAI_API_KEY existe no servidor? sem ela sobra o caminho manual */
  openaiAtivo?: boolean;
};

function Copiar({ texto, label }: { texto: string; label: string }) {
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    if (!feito) return;
    const t = setTimeout(() => setFeito(false), 1600);
    return () => clearTimeout(t);
  }, [feito]);

  return (
    <button
      type="button"
      className="btn-sub px-2.5 py-1.5 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setFeito(true);
        } catch {
          setFeito(false);
        }
      }}
    >
      {feito ? (
        <IconCheck className="h-3.5 w-3.5" />
      ) : (
        <IconCopy className="h-3.5 w-3.5" />
      )}
      {feito ? "Copiado" : label}
    </button>
  );
}

export default function AbaDemo({ lead, projeto, openaiAtivo }: Props) {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [verPrompt, setVerPrompt] = useState(false);

  const briefing = montarBriefing(lead, projeto);
  const prompt = promptParaColar(briefing);

  useEffect(() => {
    let vivo = true;
    listarDemos(lead.id).then((r) => {
      if (!vivo) return;
      if (r.ok) setDemos(r.data ?? []);
      else setErro(r.erro);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [lead.id]);

  // A URL so existe no browser: o mesmo app roda em localhost e na Vercel,
  // e a demo tem que ser copiavel dos dois.
  const origem = typeof window === "undefined" ? "" : window.location.origin;

  function gerar() {
    setErro(null);
    iniciar(async () => {
      const r = await gerarDemo(lead.id);
      if (r.ok && r.data) setDemos((d) => [r.data as Demo, ...d]);
      else if (!r.ok) setErro(r.erro);
    });
  }

  function alternar(demo: Demo) {
    iniciar(async () => {
      const r = await publicarDemo(demo.id, !demo.publicado);
      if (r.ok && r.data)
        setDemos((lista) =>
          lista.map((d) => (d.id === demo.id ? (r.data as Demo) : d))
        );
      else if (!r.ok) setErro(r.erro);
    });
  }

  function remover(demo: Demo) {
    iniciar(async () => {
      const r = await excluirDemo(demo.id);
      if (r.ok) setDemos((lista) => lista.filter((d) => d.id !== demo.id));
      else setErro(r.erro);
    });
  }

  return (
    <div className="space-y-4">
      {erro && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {erro}
        </p>
      )}

      <div className="rounded-lg border border-line bg-ink-900 p-4">
        <p className="mb-1 text-sm font-semibold text-white">
          Demo de site para {briefing.nomeCurto}
        </p>
        <p className="mb-3 text-[13px] leading-relaxed text-slate-400">
          Gera uma página de proposta com os dados deste lead e devolve um
          link pra você mandar junto da abordagem.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={gerar}
            disabled={pendente || !openaiAtivo}
            className="btn-primary px-3 py-2 text-sm disabled:opacity-50"
          >
            {pendente ? "Gerando…" : "Gerar demo"}
          </button>

          <button
            type="button"
            onClick={() => setVerPrompt((v) => !v)}
            className="btn-sub px-2.5 py-1.5 text-xs"
          >
            {verPrompt ? "Esconder prompt" : "Ver prompt manual"}
          </button>
          <Copiar texto={prompt} label="Copiar prompt" />
        </div>

        {!openaiAtivo && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Sem <code>OPENAI_API_KEY</code> no servidor a geração automática
            fica desligada. O prompt manual continua funcionando: copie e cole
            no v0, Lovable ou Claude.
          </p>
        )}

        {verPrompt && (
          <textarea
            readOnly
            value={prompt}
            rows={12}
            className="input mt-3 font-mono text-[11.5px] leading-relaxed"
          />
        )}
      </div>

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando demos…</p>
      ) : demos.length === 0 ? (
        <p className="rounded-lg border border-line bg-ink-900 px-3 py-4 text-sm text-slate-400">
          Nenhuma demo gerada para este lead ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {demos.map((d) => {
            const url = `${origem}/demo/${d.slug}`;
            return (
              <li
                key={d.id}
                className="rounded-lg border border-line bg-ink-900 p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {d.titulo}
                    </p>
                    <p className="text-[11.5px] text-slate-500">
                      {dataCurta(d.criado_em)} · {d.conteudo?.estilo ?? "—"} ·{" "}
                      {d.tokens_entrada + d.tokens_saida} tokens
                      {d.modelo ? ` · ${d.modelo}` : ""}
                    </p>
                  </div>
                  <span
                    className={`chip shrink-0 ${
                      d.publicado
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-line bg-ink-700 text-slate-400"
                    }`}
                  >
                    {d.publicado ? "no ar" : "fora do ar"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/demo/${d.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-sub px-2.5 py-1.5 text-xs"
                  >
                    Abrir
                  </a>
                  <Copiar texto={url} label="Copiar link" />
                  <button
                    type="button"
                    onClick={() => alternar(d)}
                    disabled={pendente}
                    className="btn-sub px-2.5 py-1.5 text-xs disabled:opacity-50"
                  >
                    {d.publicado ? "Tirar do ar" : "Republicar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remover(d)}
                    disabled={pendente}
                    className="btn-sub ml-auto px-2 py-1.5 text-xs text-rose-300 disabled:opacity-50"
                    aria-label="Excluir demo"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
