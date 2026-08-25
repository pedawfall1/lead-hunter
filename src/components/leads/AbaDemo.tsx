"use client";

import { useEffect, useState, useTransition } from "react";
import { IconCheck, IconCopy, IconTrash } from "@/components/ui/icons";
import {
  excluirDemo,
  gerarDemo,
  reestilizarDemo,
  publicarDemo,
} from "@/app/actions/site";
import { montarBriefing, promptParaColar } from "@/lib/site/briefing";
import { dataCurta } from "@/lib/format";
import { ESTILOS, LAYOUTS, PALETAS } from "@/lib/site/tipos";
import PreviaDemo from "./PreviaDemo";
import type { Demo, Lead, Projeto } from "@/lib/types";

type Props = {
  lead: Lead;
  projeto: Projeto;
  /** OPENAI_API_KEY existe no servidor? sem ela sobra o caminho manual */
  openaiAtivo?: boolean;
  /** a lista vive no ModalLead: a aba WhatsApp tambem precisa dela */
  demos: Demo[];
  aoMudarDemos: (lista: Demo[]) => void;
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

/**
 * As etapas por onde a geração passa, na ordem real: a LLM escreve o texto,
 * o Pexels acha as fotos, o `render.ts` monta a página.
 *
 * Os tempos são estimativa, não medição — a server action é uma chamada só
 * e não reporta progresso. Por isso a última etapa não tem prazo: ela fica
 * na tela até a resposta chegar, em vez de fingir que terminou.
 */
const ETAPAS: [string, number][] = [
  ["Lendo o que sabemos do lead", 900],
  ["Escrevendo o texto do site", 4200],
  ["Escolhendo as fotos", 2600],
  ["Montando a página", 0],
];

/**
 * Muda sempre que a aparência muda. Serve de `key` do editor e de cache
 * buster do iframe da prévia.
 */
function versaoDemo(d: Demo): string {
  const c = d.conteudo;
  return `${c?.paleta ?? ""}-${c?.estilo ?? ""}-${c?.layout ?? ""}-${c?.cor_marca ?? ""}`;
}

function Progresso() {
  const [etapa, setEtapa] = useState(0);

  useEffect(() => {
    if (etapa >= ETAPAS.length - 1) return;
    const t = setTimeout(() => setEtapa((n) => n + 1), ETAPAS[etapa][1]);
    return () => clearTimeout(t);
  }, [etapa]);

  return (
    <ol className="mt-3 space-y-1.5">
      {ETAPAS.map(([texto], i) => {
        const feita = i < etapa;
        const agora = i === etapa;
        return (
          <li
            key={texto}
            className={`flex items-center gap-2 text-[13px] transition-colors ${
              feita ? "text-slate-500" : agora ? "text-white" : "text-slate-600"
            }`}
          >
            <span className="grid h-4 w-4 shrink-0 place-items-center">
              {feita ? (
                <IconCheck className="h-3.5 w-3.5 text-emerald-400" />
              ) : agora ? (
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
              )}
            </span>
            {texto}
          </li>
        );
      })}
    </ol>
  );
}

const NOME_PALETA: Record<string, string> = {
  sobrio_azul: "Azul sóbrio",
  preto_dourado: "Preto e dourado",
  verde_natural: "Verde natural",
  quente_terra: "Terra quente",
  clinico_claro: "Clínico claro",
  vibrante_roxo: "Roxo vibrante",
};

const NOME_LAYOUT: Record<string, string> = {
  classico: "Foto ao fundo",
  dividido: "Texto e foto lado a lado",
  centrado: "Centrado, foto abaixo",
};

const NOME_ESTILO: Record<string, string> = {
  escuro: "Escuro",
  claro: "Claro",
  elegante: "Elegante (serifada)",
};

/**
 * Editor de aparência de uma demo já gerada.
 *
 * Re-renderiza em cima do JSON que já está salvo, então mexer na cor **não
 * gasta token**. É o caminho para quando você abre o Instagram do cliente e
 * vê que a marca dele não é nada do que a LLM chutou.
 */
function Aparencia({
  demo,
  pendente,
  aoAplicar,
}: {
  demo: Demo;
  pendente: boolean;
  aoAplicar: (a: {
    paleta: string;
    estilo: string;
    layout: string;
    corMarca: string | null;
  }) => void;
}) {
  const [paleta, setPaleta] = useState<string>(
    demo.conteudo?.paleta ?? "sobrio_azul"
  );
  const [estilo, setEstilo] = useState<string>(
    demo.conteudo?.estilo ?? "escuro"
  );
  const [layout, setLayout] = useState<string>(
    demo.conteudo?.layout ?? "classico"
  );
  const [usarCor, setUsarCor] = useState(!!demo.conteudo?.cor_marca);
  const [cor, setCor] = useState(demo.conteudo?.cor_marca ?? "#f97316");

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line bg-ink-950 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`pal-${demo.id}`}>Paleta</label>
          <select
            id={`pal-${demo.id}`}
            className="input"
            value={paleta}
            onChange={(e) => setPaleta(e.target.value)}
          >
            {PALETAS.map((p) => (
              <option key={p} value={p}>{NOME_PALETA[p] ?? p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`est-${demo.id}`}>Estilo</label>
          <select
            id={`est-${demo.id}`}
            className="input"
            value={estilo}
            onChange={(e) => setEstilo(e.target.value)}
          >
            {ESTILOS.map((e) => (
              <option key={e} value={e}>{NOME_ESTILO[e] ?? e}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`lay-${demo.id}`}>
          Layout do topo
        </label>
        <select
          id={`lay-${demo.id}`}
          className="input"
          value={layout}
          onChange={(e) => setLayout(e.target.value)}
        >
          {LAYOUTS.map((l) => (
            <option key={l} value={l}>
              {NOME_LAYOUT[l] ?? l}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2 text-[13px] text-slate-300">
          <input
            type="checkbox"
            checked={usarCor}
            onChange={(e) => setUsarCor(e.target.checked)}
          />
          Usar a cor da marca do cliente
        </label>

        {usarCor && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(cor) ? cor : "#f97316"}
              onChange={(e) => setCor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-line bg-ink-900"
              aria-label="Cor da marca"
            />
            <input
              type="text"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              placeholder="#f97316"
              className="input flex-1 font-mono text-[13px]"
            />
          </div>
        )}
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">
          Pegue a cor no Instagram do cliente quando o palpite não bater. O
          texto do botão vira preto ou branco sozinho, pelo contraste.
        </p>
      </div>

      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          aoAplicar({ paleta, estilo, layout, corMarca: usarCor ? cor : null })
        }
        className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
      >
        {pendente ? "Aplicando…" : "Aplicar (não gasta crédito)"}
      </button>
    </div>
  );
}

export default function AbaDemo({
  lead,
  projeto,
  openaiAtivo,
  demos,
  aoMudarDemos,
}: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [verPrompt, setVerPrompt] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const briefing = montarBriefing(lead, projeto);
  const prompt = promptParaColar(briefing);

  // A URL so existe no browser: o mesmo app roda em localhost e na Vercel,
  // e a demo tem que ser copiavel dos dois.
  const origem = typeof window === "undefined" ? "" : window.location.origin;

  function gerar() {
    setErro(null);
    iniciar(async () => {
      const r = await gerarDemo(lead.id);
      if (r.ok && r.data) aoMudarDemos([r.data as Demo, ...demos]);
      else if (!r.ok) setErro(r.erro);
    });
  }

  function alternar(demo: Demo) {
    iniciar(async () => {
      const r = await publicarDemo(demo.id, !demo.publicado);
      if (r.ok && r.data)
        aoMudarDemos(
          demos.map((d) => (d.id === demo.id ? (r.data as Demo) : d))
        );
      else if (!r.ok) setErro(r.erro);
    });
  }

  function reestilizar(
    demo: Demo,
    ajuste: {
      paleta: string;
      estilo: string;
      layout: string;
      corMarca: string | null;
    }
  ) {
    setErro(null);
    iniciar(async () => {
      const r = await reestilizarDemo(demo.id, ajuste);
      if (r.ok && r.data)
        aoMudarDemos(
          demos.map((d) => (d.id === demo.id ? (r.data as Demo) : d))
        );
      else if (!r.ok) setErro(r.erro);
    });
  }

  function remover(demo: Demo) {
    iniciar(async () => {
      const r = await excluirDemo(demo.id);
      if (r.ok) aoMudarDemos(demos.filter((d) => d.id !== demo.id));
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
          <strong className="font-semibold text-slate-300">Gerar demo</strong>{" "}
          monta a página aqui mesmo e devolve o link pronto pra mandar — a IA
          escreve só o texto, o layout é nosso, então sai por frações de
          centavo.
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
            {verPrompt ? "Esconder prompt" : "Prompt pro v0 / Lovable"}
          </button>
          <Copiar texto={prompt} label="Copiar prompt" />
        </div>

        {pendente && !editando && <Progresso />}

        {!openaiAtivo && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Sem <code>OPENAI_API_KEY</code> no servidor a geração automática
            fica desligada. O prompt manual continua funcionando: copie e cole
            no v0, Lovable ou Claude.
          </p>
        )}

        {verPrompt && (
          <>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
              Caminho alternativo: cole no v0, Lovable ou Claude quando quiser
              um layout diferente do nosso. Este pede HTML porque quem monta a
              página é a ferramenta do outro lado — não gasta seu crédito da
              OpenAI, e o resultado não volta pra cá.
            </p>
            <textarea
              readOnly
              value={prompt}
              rows={12}
              className="input mt-2 font-mono text-[11.5px] leading-relaxed"
            />
          </>
        )}
      </div>

      {demos.length === 0 ? (
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
                    onClick={() => setEditando(editando === d.id ? null : d.id)}
                    className="btn-sub px-2.5 py-1.5 text-xs"
                  >
                    {editando === d.id ? "Fechar" : "Aparência"}
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

                {editando === d.id && (
                  <>
                    <Aparencia
                      // remonta o editor quando a demo muda, para os campos
                      // refletirem o que acabou de ser aplicado
                      key={`${d.id}-${versaoDemo(d)}`}
                      demo={d}
                      pendente={pendente}
                      aoAplicar={(a) => reestilizar(d, a)}
                    />
                    {d.publicado ? (
                      <PreviaDemo slug={d.slug} versao={versaoDemo(d)} />
                    ) : (
                      <p className="mt-3 rounded-lg border border-line bg-ink-900 px-3 py-3 text-[12.5px] text-slate-400">
                        A prévia mostra a página pública, e esta demo está fora
                        do ar. Republique para ver.
                      </p>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
