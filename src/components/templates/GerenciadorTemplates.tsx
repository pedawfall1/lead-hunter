"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import {
  IconCheck,
  IconCopy,
  IconPencil,
  IconPlus,
  IconTrash,
  IconWhatsapp,
} from "@/components/ui/icons";
import {
  atualizarTemplate,
  criarTemplate,
  excluirTemplate,
} from "@/app/actions/templates";
import { preencherTemplate } from "@/lib/format";
import type { Template } from "@/lib/types";

const EXEMPLO = { nome: "Advocacia Silva", bairro: "Centro" };

export default function GerenciadorTemplates({
  templates,
}: {
  templates: Template[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Template | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  // estado do editor
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [exemplo, setExemplo] = useState(EXEMPLO);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setTexto("");
    setErro(null);
    setAberto(true);
  }

  function abrirEdicao(t: Template) {
    setEditando(t);
    setNome(t.nome);
    setTexto(t.texto);
    setErro(null);
    setAberto(true);
  }

  function inserirVariavel(v: "{nome}" | "{bairro}") {
    const el = textareaRef.current;
    if (!el) {
      setTexto((t) => t + v);
      return;
    }
    const inicio = el.selectionStart ?? texto.length;
    const fim = el.selectionEnd ?? texto.length;
    const novo = texto.slice(0, inicio) + v + texto.slice(fim);
    setTexto(novo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(inicio + v.length, inicio + v.length);
    });
  }

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("nome", nome);
    fd.set("texto", texto);
    setErro(null);

    iniciar(async () => {
      const r = editando
        ? await atualizarTemplate(editando.id, fd)
        : await criarTemplate(fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      router.refresh();
    });
  }

  function remover(t: Template) {
    if (!window.confirm(`Excluir o template "${t.nome}"?`)) return;
    iniciar(async () => {
      const r = await excluirTemplate(t.id);
      if (!r.ok) window.alert(r.erro);
      router.refresh();
    });
  }

  async function copiar(t: Template) {
    try {
      await navigator.clipboard.writeText(preencherTemplate(t.texto, exemplo));
      setCopiado(t.id);
      setTimeout(() => setCopiado(null), 1600);
    } catch {
      /* silencioso */
    }
  }

  const preview = preencherTemplate(texto, exemplo);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Templates de mensagem
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Use{" "}
            <code className="rounded bg-ink-800 px-1 py-0.5 text-brand-soft">
              {"{nome}"}
            </code>{" "}
            e{" "}
            <code className="rounded bg-ink-800 px-1 py-0.5 text-brand-soft">
              {"{bairro}"}
            </code>{" "}
            no texto.
          </p>
        </div>
        <button className="btn-primary" onClick={abrirNovo}>
          <IconPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo template</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="text-3xl">💬</span>
          <h2 className="text-base font-semibold text-white">
            Nenhum template ainda
          </h2>
          <p className="max-w-sm text-sm text-slate-400">
            Escreva a sua abordagem uma vez e reaproveite em todos os leads, com
            nome e bairro já preenchidos.
          </p>
          <button className="btn-primary mt-2" onClick={abrirNovo}>
            <IconPlus className="h-4 w-4" />
            Criar template
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => {
            const usaNome = /\{\s*nome\s*\}/i.test(t.texto);
            const usaBairro = /\{\s*bairro\s*\}/i.test(t.texto);
            return (
              <li key={t.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold text-white">
                      {t.nome}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {usaNome && (
                        <span className="chip border-line bg-ink-700 text-slate-400">
                          {"{nome}"}
                        </span>
                      )}
                      {usaBairro && (
                        <span className="chip border-line bg-ink-700 text-slate-400">
                          {"{bairro}"}
                        </span>
                      )}
                      <span className="chip border-line bg-ink-700 text-slate-500">
                        {t.texto.length} caracteres
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => copiar(t)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-ink-600 hover:text-slate-200"
                      aria-label="Copiar prévia"
                    >
                      {copiado === t.id ? (
                        <IconCheck className="h-4 w-4 text-st-fechou" />
                      ) : (
                        <IconCopy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => abrirEdicao(t)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-ink-600 hover:text-slate-200"
                      aria-label={`Editar ${t.nome}`}
                    >
                      <IconPencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remover(t)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                      aria-label={`Excluir ${t.nome}`}
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-900 p-3 text-sm leading-relaxed text-slate-300">
                  {t.texto}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---------- editor ---------- */}
      <Modal
        aberto={aberto}
        aoFechar={() => !pendente && setAberto(false)}
        titulo={editando ? "Editar template" : "Novo template"}
        largura="md"
      >
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label" htmlFor="t-nome">
              Nome do template
            </label>
            <input
              id="t-nome"
              className="input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
              placeholder="Primeira abordagem"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-end justify-between gap-2">
              <span className="label mb-0">Mensagem</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn-sub px-2 py-1 text-xs"
                  onClick={() => inserirVariavel("{nome}")}
                >
                  + {"{nome}"}
                </button>
                <button
                  type="button"
                  className="btn-sub px-2 py-1 text-xs"
                  onClick={() => inserirVariavel("{bairro}")}
                >
                  + {"{bairro}"}
                </button>
              </div>
            </div>
            <textarea
              id="t-texto"
              ref={textareaRef}
              rows={6}
              className="input resize-y"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required
              placeholder="Oi {nome}, tudo bem? Vi que vocês atendem aqui no {bairro}..."
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {texto.length} caracteres
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink-900 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                <IconWhatsapp className="h-3.5 w-3.5 text-[#25D366]" />
                Prévia
              </span>
              <div className="ml-auto flex gap-2">
                <input
                  className="input w-28 px-2 py-1 text-xs"
                  value={exemplo.nome}
                  onChange={(e) =>
                    setExemplo((x) => ({ ...x, nome: e.target.value }))
                  }
                  aria-label="Exemplo de nome"
                />
                <input
                  className="input w-24 px-2 py-1 text-xs"
                  value={exemplo.bairro}
                  onChange={(e) =>
                    setExemplo((x) => ({ ...x, bairro: e.target.value }))
                  }
                  aria-label="Exemplo de bairro"
                />
              </div>
            </div>

            <div className="rounded-lg rounded-tl-none bg-[#005c4b] px-3 py-2">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-50">
                {preview || (
                  <span className="text-slate-300/60">
                    A prévia aparece aqui.
                  </span>
                )}
              </p>
            </div>
          </div>

          {erro && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {erro}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setAberto(false)}
              disabled={pendente}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={pendente}>
              {pendente ? "Salvando..." : editando ? "Salvar" : "Criar template"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
