"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { analisarInstagram, conferirInstagram } from "@/app/actions/instagram";
import { linkInstagram } from "@/lib/format";
import { dataCurta } from "@/lib/format";
import type { Lead } from "@/lib/types";

type Props = {
  lead: Lead;
  /** APIFY_TOKEN existe no servidor? sem ele não há como raspar */
  buscaAtiva?: boolean;
  aoAtualizar: (lead: Lead) => void;
};

/** Um número grande com rótulo embaixo. */
function Numero({
  valor,
  rotulo,
  alerta,
}: {
  valor: string;
  rotulo: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-ink-900 px-3 py-2.5">
      <p
        className={`text-[19px] font-semibold leading-tight ${
          alerta ? "text-amber-300" : "text-white"
        }`}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">
        {rotulo}
      </p>
    </div>
  );
}

function milhar(n: number): string {
  return n.toLocaleString("pt-BR");
}

export default function AbaInstagram({ lead, buscaAtiva, aoAtualizar }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const rodando = !!lead.ig_run_id;
  const perfil = lead.ig_dados;
  const arroba = (lead.instagram ?? "").replace(/^@/, "");

  // `aoAtualizar` costuma vir como função nova a cada render do pai; guardar
  // numa ref evita que o efeito de polling se reinicie a cada tick.
  const avisar = useRef(aoAtualizar);
  useEffect(() => {
    avisar.current = aoAtualizar;
  }, [aoAtualizar]);

  const conferir = useCallback(async () => {
    const r = await conferirInstagram(lead.id);
    if (r.ok && r.data) avisar.current(r.data);
    else if (!r.ok) setErro(r.erro);
  }, [lead.id]);

  // Enquanto a corrida não termina, a tela pergunta de cinco em cinco
  // segundos — mesmo ritmo da busca no Google Maps. Fechar o modal não
  // cancela nada: a corrida segue no Apify e o run_id está no lead.
  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(conferir, 5000);
    return () => clearInterval(t);
  }, [rodando, conferir]);

  function analisar() {
    setErro(null);
    iniciar(async () => {
      const r = await analisarInstagram(lead.id);
      if (r.ok && r.data) avisar.current(r.data);
      else if (!r.ok) setErro(r.erro);
    });
  }

  if (!arroba) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
        Esse lead não tem Instagram. Preencha o @ na aba Detalhes para poder
        analisar o perfil.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {erro && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={linkInstagram(arroba)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-sub px-2.5 py-1.5 text-xs"
        >
          Abrir @{arroba}
        </a>
        <button
          type="button"
          onClick={analisar}
          disabled={pendente || rodando || !buscaAtiva}
          className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {rodando
            ? "Analisando…"
            : perfil
              ? "Analisar de novo"
              : "Analisar perfil"}
        </button>
        {lead.ig_em && !rodando && (
          <span className="text-[11.5px] text-slate-500">
            lido em {dataCurta(lead.ig_em)}
          </span>
        )}
      </div>

      {!buscaAtiva && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Sem <code>APIFY_TOKEN</code> no servidor a análise fica desligada.
        </p>
      )}

      {rodando && (
        <p className="rounded-lg border border-line bg-ink-900 px-3 py-4 text-sm text-slate-400">
          Lendo o perfil no Apify. Leva de 15 a 40 segundos — pode fechar essa
          janela, a análise continua e o resultado fica salvo no lead.
        </p>
      )}

      {lead.ig_erro && !rodando && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {lead.ig_erro}
        </p>
      )}

      {perfil && !rodando && (
        <div className="space-y-3">
          {perfil.privado && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Perfil privado: dá para ver seguidores, mas não os posts. Ritmo e
              engajamento ficam de fora, e nenhum sinal foi marcado por eles.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Numero
              valor={perfil.seguidores === null ? "—" : milhar(perfil.seguidores)}
              rotulo="seguidores"
              alerta={perfil.seguidores !== null && perfil.seguidores < 500}
            />
            <Numero
              valor={
                perfil.diasSemPostar === null
                  ? "—"
                  : `${perfil.diasSemPostar}d`
              }
              rotulo="sem postar"
              alerta={perfil.diasSemPostar !== null && perfil.diasSemPostar >= 30}
            />
            <Numero
              valor={
                perfil.engajamento === null ? "—" : `${perfil.engajamento}%`
              }
              rotulo="engajamento"
              alerta={perfil.engajamento !== null && perfil.engajamento < 1}
            />
            <Numero
              valor={perfil.postsPorMes === null ? "—" : `${perfil.postsPorMes}`}
              rotulo="posts/mês"
              alerta={perfil.postsPorMes !== null && perfil.postsPorMes < 4}
            />
          </div>

          {perfil.bio && (
            <div className="rounded-lg border border-line bg-ink-900 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                Bio
              </p>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-300">
                {perfil.bio}
              </p>
              {perfil.link && (
                <p className="mt-2 break-all text-[12px] text-brand-soft">
                  {perfil.link}
                  {perfil.soLinkNaBio && (
                    <span className="ml-1 text-slate-500">
                      (agregador — sem site próprio)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {perfil.posts.length > 0 && (
            <div className="rounded-lg border border-line bg-ink-900 p-3">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">
                Últimos posts
              </p>
              <ul className="space-y-1.5">
                {perfil.posts.slice(0, 5).map((p, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-3 text-[12.5px]"
                  >
                    <span className="truncate text-slate-400">
                      {p.legenda ? p.legenda.slice(0, 70) : "(sem legenda)"}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {p.curtidas}❤ {p.comentarios}💬
                      {p.quando ? ` · ${dataCurta(p.quando)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11.5px] leading-relaxed text-slate-500">
            Os sinais de qualificação do lead já foram atualizados com isso, e a
            bio entra no briefing quando você gerar a demo de site.
          </p>

          {/* Um campo em branco pode ser do actor ou do normalizador. Só o
              item cru responde qual dos dois — mesma saída da busca no Maps. */}
          {lead.ig_bruto && (
            <details className="rounded-lg border border-line bg-ink-900 p-3">
              <summary className="cursor-pointer text-[12px] text-slate-400">
                Ver o que o scraper devolveu
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-slate-500">
                {JSON.stringify(lead.ig_bruto, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {!perfil && !rodando && !lead.ig_erro && (
        <p className="rounded-lg border border-line bg-ink-900 px-3 py-4 text-sm text-slate-400">
          Perfil ainda não analisado. A leitura preenche sozinha os sinais de
          Instagram parado, poucos seguidores e link na bio.
        </p>
      )}
    </div>
  );
}
