"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import {
  IconChevron,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";
import {
  atualizarProjeto,
  criarProjeto,
  excluirProjeto,
} from "@/app/actions/projetos";
import { dataCurta } from "@/lib/format";
import { SERVICOS, acharServico, criteriosSugeridos } from "@/lib/servicos";
import type { Projeto } from "@/lib/types";

export type ProjetoResumo = Projeto & {
  total: number;
  qualificados: number;
  fechou: number;
};

export default function ListaProjetos({
  projetos,
}: {
  projetos: ProjetoResumo[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Projeto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [servico, setServico] = useState<string>("site");

  function abrirNovo() {
    setEditando(null);
    setServico("site");
    setErro(null);
    setAberto(true);
  }

  function abrirEdicao(p: Projeto) {
    setEditando(p);
    setServico(p.servico ?? "site");
    setErro(null);
    setAberto(true);
  }

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setErro(null);
    iniciar(async () => {
      if (editando) {
        const r = await atualizarProjeto(editando.id, formData);
        if (!r.ok) {
          setErro(r.erro);
          return;
        }
        setAberto(false);
        setEditando(null);
        router.refresh();
        return;
      }

      const r = await criarProjeto(formData);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      router.refresh();
      if (r.data) router.push("/projetos/" + r.data.id);
    });
  }

  function remover(p: Projeto) {
    const ok = window.confirm(
      `Excluir o projeto "${p.nome}"? Todos os leads dele serão apagados. Essa ação não tem volta.`
    );
    if (!ok) return;
    iniciar(async () => {
      const r = await excluirProjeto(p.id);
      if (!r.ok) window.alert(r.erro);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Projetos
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {projetos.length} {projetos.length === 1 ? "projeto" : "projetos"}
          </p>
        </div>
        <button className="btn-primary" onClick={abrirNovo}>
          <IconPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo projeto</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {projetos.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="text-3xl">📁</span>
          <h2 className="text-base font-semibold text-white">
            Nenhum projeto ainda
          </h2>
          <p className="max-w-sm text-sm text-slate-400">
            Crie um projeto por nicho + região. Ex.: &ldquo;Advogados -
            Videira&rdquo;, &ldquo;Petshops - Caçador&rdquo;.
          </p>
          <button className="btn-primary mt-2" onClick={abrirNovo}>
            <IconPlus className="h-4 w-4" />
            Criar o primeiro
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projetos.map((p) => (
            <li key={p.id} className="card group relative overflow-hidden">
              <Link
                href={`/projetos/${p.id}`}
                className="block p-4 pr-20 transition-colors hover:bg-ink-700/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate text-[15px] font-semibold text-white">
                    {p.nome}
                  </h2>
                </div>

                <p className="mt-1 truncate text-xs text-slate-400">
                  {[acharServico(p.servico)?.label, p.nicho, p.regiao]
                    .filter(Boolean)
                    .join(" · ") || "sem serviço definido"}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="chip border-line bg-ink-700 text-slate-300">
                    {p.total} {p.total === 1 ? "lead" : "leads"}
                  </span>
                  {p.qualificados > 0 && (
                    <span className="chip border-brand/30 bg-brand/10 text-brand-soft">
                      {p.qualificados} qualificados
                    </span>
                  )}
                  {p.fechou > 0 && (
                    <span className="chip border-st-fechou/30 bg-st-fechou/10 text-st-fechou">
                      {p.fechou} fechou
                    </span>
                  )}
                </div>

                <p className="mt-3 text-[11px] text-slate-500">
                  criado em {dataCurta(p.criado_em)}
                </p>

                <IconChevron className="absolute bottom-4 right-4 h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" />
              </Link>

              <div className="absolute right-3 top-3 flex gap-1">
                <button
                  onClick={() => abrirEdicao(p)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-ink-600 hover:text-slate-200"
                  aria-label={`Editar ${p.nome}`}
                >
                  <IconPencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remover(p)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                  aria-label={`Excluir ${p.nome}`}
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={aberto}
        aoFechar={() => !pendente && setAberto(false)}
        titulo={editando ? "Editar projeto" : "Novo projeto"}
        largura="sm"
      >
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label" htmlFor="nome">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              className="input"
              required
              autoFocus
              defaultValue={editando?.nome ?? ""}
              placeholder="Advogados - Videira"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="nicho">
                Nicho
              </label>
              <input
                id="nicho"
                name="nicho"
                className="input"
                defaultValue={editando?.nicho ?? ""}
                placeholder="Advocacia"
              />
            </div>
            <div>
              <label className="label" htmlFor="regiao">
                Região
              </label>
              <input
                id="regiao"
                name="regiao"
                className="input"
                defaultValue={editando?.regiao ?? ""}
                placeholder="Videira - SC"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="servico">
              O que você vende neste projeto
            </label>
            <select
              id="servico"
              name="servico"
              className="input"
              value={servico}
              onChange={(e) => setServico(e.target.value)}
            >
              {SERVICOS.map((s) => (
                <option key={s.chave} value={s.chave}>
                  {s.label} — {s.resumo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="label">
              Sinais que qualificam um lead
              <span className="ml-1 font-normal normal-case tracking-normal text-slate-500">
                · marque os que interessam
              </span>
            </span>
            <div className="grid max-h-52 gap-1.5 overflow-y-auto rounded-lg border border-line bg-ink-900/60 p-2 sm:grid-cols-2">
              {criteriosSugeridos(servico).map((c) => {
                const jaTinha = editando?.criterios?.some(
                  (x) => x.chave === c.chave
                );
                const padrao = editando ? !!jaTinha : true;
                return (
                  <label
                    key={c.chave}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-ink-700"
                  >
                    <input
                      type="checkbox"
                      name={`criterio:${c.chave}`}
                      defaultChecked={padrao}
                      className="h-4 w-4 shrink-0 accent-brand"
                    />
                    <span className="leading-snug">{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="criterios_extras">
              Outros sinais (um por linha)
            </label>
            <textarea
              id="criterios_extras"
              name="criterios_extras"
              rows={2}
              className="input resize-y"
              placeholder={"Cardápio sem foto\nNão aceita Pix"}
              defaultValue={(editando?.criterios ?? [])
                .filter(
                  (c) =>
                    !criteriosSugeridos(editando?.servico).some(
                      (x) => x.chave === c.chave
                    )
                )
                .map((c) => c.label)
                .join("\n")}
            />
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Os sinais viram filtro no quadro e alimentam a variável{" "}
            <code className="rounded bg-ink-900 px-1 py-0.5 text-brand-soft">
              {"{motivo}"}
            </code>{" "}
            da mensagem. A região vira o padrão de{" "}
            <code className="rounded bg-ink-900 px-1 py-0.5 text-brand-soft">
              {"{bairro}"}
            </code>{" "}
            quando o endereço do lead não tiver bairro.
          </p>

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
              {pendente ? "Salvando..." : editando ? "Salvar" : "Criar projeto"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
