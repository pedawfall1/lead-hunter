"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import {
  IconCheck,
  IconCopy,
  IconInstagram,
  IconTrash,
  IconWhatsapp,
} from "@/components/ui/icons";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import {
  dataCurta,
  extrairBairro,
  formatarTelefone,
  linkInstagram,
  linkWhatsapp,
  nomeCurto,
  preencherTemplate,
  telefoneWhatsapp,
} from "@/lib/format";
import {
  atualizarLead,
  excluirLead,
  marcarContatado,
} from "@/app/actions/leads";
import type { Lead, Projeto, Template } from "@/lib/types";

type Props = {
  lead: Lead;
  projeto: Projeto;
  templates: Template[];
  abaInicial: "detalhes" | "whatsapp";
  aoFechar: () => void;
  aoAtualizar: (lead: Lead) => void;
  aoExcluir: (id: string) => void;
};

export default function ModalLead({
  lead,
  projeto,
  templates,
  abaInicial,
  aoFechar,
  aoAtualizar,
  aoExcluir,
}: Props) {
  const [aba, setAba] = useState<"detalhes" | "whatsapp">(abaInicial);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);

  const bairro = useMemo(
    () => extrairBairro(lead.endereco, projeto.regiao),
    [lead.endereco, projeto.regiao]
  );

  const templateAtual = templates.find((t) => t.id === templateId) ?? null;

  // Recalcula a previa sempre que o template ou o lead mudarem.
  useEffect(() => {
    if (!templateAtual) {
      setMensagem("");
      return;
    }
    setMensagem(
      preencherTemplate(templateAtual.texto, {
        nome: nomeCurto(lead.nome),
        bairro,
      })
    );
  }, [templateAtual, lead.nome, bairro]);

  const numero = telefoneWhatsapp(lead.telefone);
  const link = numero ? linkWhatsapp(lead.telefone, mensagem) : "";

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    iniciar(async () => {
      const r = await atualizarLead(lead.id, lead.projeto_id, fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.data) aoAtualizar(r.data);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1800);
    });
  }

  function remover() {
    if (!window.confirm(`Excluir o lead "${lead.nome}"?`)) return;
    iniciar(async () => {
      const r = await excluirLead(lead.id, lead.projeto_id);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aoExcluir(lead.id);
      aoFechar();
    });
  }

  function aoAbrirWhatsapp() {
    if (lead.status !== "novo") return;
    // otimista: o card ja vai para "Contatado"
    aoAtualizar({ ...lead, status: "contatado" });
    iniciar(async () => {
      const r = await marcarContatado(lead.id, lead.projeto_id);
      if (!r.ok) setErro(r.erro);
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      setErro("Nao consegui copiar. Selecione o texto manualmente.");
    }
  }

  const meta = STATUS_META[lead.status];

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={lead.nome}
      subtitulo={`${projeto.nome} · atualizado em ${dataCurta(lead.atualizado_em)}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className={`chip ${meta.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        {!lead.tem_site && (
          <span className="chip border-brand/30 bg-brand/10 text-brand-soft">
            sem site
          </span>
        )}
        {lead.instagram && (
          <a
            href={linkInstagram(lead.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="chip border-line bg-ink-700 text-slate-300 hover:bg-ink-600"
          >
            <IconInstagram className="h-3.5 w-3.5" />@
            {lead.instagram.replace(/^@/, "")}
          </a>
        )}
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-ink-900 p-1">
        {(
          [
            ["detalhes", "Detalhes"],
            ["whatsapp", "WhatsApp"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              aba === id
                ? "bg-ink-700 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {erro && (
        <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {erro}
        </p>
      )}

      {aba === "detalhes" ? (
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
              defaultValue={lead.nome}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="telefone">
                Telefone
              </label>
              <input
                id="telefone"
                name="telefone"
                className="input"
                inputMode="tel"
                defaultValue={lead.telefone ?? ""}
                placeholder="(49) 99999-9999"
              />
            </div>
            <div>
              <label className="label" htmlFor="instagram">
                Instagram
              </label>
              <input
                id="instagram"
                name="instagram"
                className="input"
                defaultValue={lead.instagram ?? ""}
                placeholder="@perfil"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="endereco">
              Endereco
            </label>
            <input
              id="endereco"
              name="endereco"
              className="input"
              defaultValue={lead.endereco ?? ""}
              placeholder="Rua Brasil, 120 - Centro"
            />
            {bairro && (
              <p className="mt-1 text-xs text-slate-500">
                {"{bairro}"} ={" "}
                <span className="text-brand-soft">{bairro}</span>
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="input"
                defaultValue={lead.status}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-3 self-end rounded-lg border border-line bg-ink-900 px-3 py-2.5">
              <input
                type="checkbox"
                name="tem_site"
                defaultChecked={lead.tem_site}
                className="h-4 w-4 accent-brand"
              />
              <span className="text-sm text-slate-300">Tem site</span>
            </label>
          </div>

          <div>
            <label className="label" htmlFor="nota">
              Nota
            </label>
            <textarea
              id="nota"
              name="nota"
              rows={4}
              className="input resize-y"
              defaultValue={lead.nota ?? ""}
              placeholder="O que rolou na conversa, objecoes, quando dar follow-up..."
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={remover}
              className="btn-danger"
              disabled={pendente}
            >
              <IconTrash className="h-4 w-4" />
              Excluir
            </button>

            <div className="flex items-center gap-2">
              {salvo && (
                <span className="flex items-center gap-1 text-xs text-st-fechou">
                  <IconCheck className="h-4 w-4" /> salvo
                </span>
              )}
              <button type="submit" className="btn-primary" disabled={pendente}>
                {pendente ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <p className="rounded-lg border border-line bg-ink-900 px-3 py-4 text-sm text-slate-400">
              Voce ainda nao tem templates. Crie um em{" "}
              <span className="text-brand-soft">Templates</span> para montar a
              mensagem automaticamente.
            </p>
          ) : (
            <div>
              <label className="label" htmlFor="template">
                Template
              </label>
              <select
                id="template"
                className="input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-end justify-between">
              <span className="label mb-0">Mensagem</span>
              <button
                type="button"
                onClick={copiar}
                className="btn-sub px-2 py-1 text-xs"
                disabled={!mensagem}
              >
                {copiado ? (
                  <>
                    <IconCheck className="h-3.5 w-3.5" /> copiado
                  </>
                ) : (
                  <>
                    <IconCopy className="h-3.5 w-3.5" /> copiar
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={6}
              className="input resize-y"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva a mensagem ou escolha um template."
            />
            <p className="mt-1 text-xs text-slate-500">
              Da pra ajustar o texto antes de enviar. Variaveis preenchidas:{" "}
              <span className="text-slate-400">{nomeCurto(lead.nome)}</span>
              {bairro && (
                <>
                  {" · "}
                  <span className="text-slate-400">{bairro}</span>
                </>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink-900 p-3">
            <p className="text-xs text-slate-400">
              Abre o WhatsApp com a mensagem pronta para{" "}
              <span className="tabular-nums text-slate-200">
                {formatarTelefone(lead.telefone) || "—"}
              </span>
              . O envio continua sendo manual (um clique seu no WhatsApp), sem
              risco de bloqueio do numero.
            </p>
          </div>

          {numero ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={aoAbrirWhatsapp}
              className={`btn-wa w-full ${!mensagem ? "pointer-events-none opacity-45" : ""}`}
            >
              <IconWhatsapp className="h-4 w-4" />
              Enviar WhatsApp
            </a>
          ) : (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              Esse lead nao tem um telefone valido. Adicione o numero na aba
              Detalhes.
            </p>
          )}

          {lead.status === "novo" && numero && (
            <p className="text-center text-xs text-slate-500">
              Ao abrir o WhatsApp, o lead vai automaticamente para{" "}
              <span className="text-st-contatado">Contatado</span>.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
