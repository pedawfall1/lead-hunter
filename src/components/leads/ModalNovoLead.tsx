"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import { criarLead } from "@/app/actions/leads";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { Criterio, Lead } from "@/lib/types";
import { EditorSinais } from "./Sinais";

export default function ModalNovoLead({
  projetoId,
  criterios,
  aoFechar,
  aoCriado,
}: {
  projetoId: string;
  criterios: Criterio[];
  aoFechar: () => void;
  aoCriado: (lead: Lead) => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [continuar, setContinuar] = useState(true);
  const [ultimo, setUltimo] = useState<string | null>(null);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setErro(null);

    iniciar(async () => {
      const r = await criarLead(projetoId, fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.data) aoCriado(r.data);

      if (continuar) {
        setUltimo(r.data?.nome ?? null);
        form.reset();
        const primeiro = form.querySelector<HTMLInputElement>('input[name="nome"]');
        primeiro?.focus();
      } else {
        aoFechar();
      }
    });
  }

  return (
    <Modal aberto aoFechar={aoFechar} titulo="Adicionar lead" largura="md">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="label" htmlFor="novo-nome">
            Nome da empresa / pessoa
          </label>
          <input
            id="novo-nome"
            name="nome"
            className="input"
            required
            autoFocus
            placeholder="Advocacia Silva"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="novo-telefone">
              Telefone
            </label>
            <input
              id="novo-telefone"
              name="telefone"
              className="input"
              inputMode="tel"
              placeholder="(49) 99999-9999"
            />
          </div>
          <div>
            <label className="label" htmlFor="novo-instagram">
              Instagram
            </label>
            <input
              id="novo-instagram"
              name="instagram"
              className="input"
              placeholder="@perfil"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="novo-endereco">
            Endereço
          </label>
          <input
            id="novo-endereco"
            name="endereco"
            className="input"
            placeholder="Rua Brasil, 120 - Centro"
          />
        </div>

        <div>
          <span className="label">Sinais de qualificação</span>
          <EditorSinais criterios={criterios} valor={{}} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="novo-status">
              Status
            </label>
            <select
              id="novo-status"
              name="status"
              className="input"
              defaultValue="novo"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="novo-retorno">
              Próximo contato
            </label>
            <input
              id="novo-retorno"
              name="proximo_contato"
              type="date"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="novo-nota">
            Nota
          </label>
          <textarea
            id="novo-nota"
            name="nota"
            rows={3}
            className="input resize-y"
            placeholder="Onde achei, horário bom pra ligar..."
          />
        </div>

        {erro && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {erro}
          </p>
        )}

        {ultimo && !erro && (
          <p className="rounded-lg border border-st-fechou/30 bg-st-fechou/10 px-3 py-2 text-sm text-st-fechou">
            &ldquo;{ultimo}&rdquo; adicionado. Pode cadastrar o próximo.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={continuar}
              onChange={(e) => setContinuar(e.target.checked)}
              className="h-3.5 w-3.5 accent-brand"
            />
            Continuar adicionando
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={aoFechar}
              disabled={pendente}
            >
              Fechar
            </button>
            <button type="submit" className="btn-primary" disabled={pendente}>
              {pendente ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
