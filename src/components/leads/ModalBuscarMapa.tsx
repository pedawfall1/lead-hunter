"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import { buscarNoMapa } from "@/app/actions/busca";
import { IconCheck, IconMap } from "@/components/ui/icons";
import type { Projeto } from "@/lib/types";

export default function ModalBuscarMapa({
  projeto,
  aoFechar,
}: {
  projeto: Projeto;
  aoFechar: () => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [termo, setTermo] = useState(projeto.nicho ?? "");
  const [local, setLocal] = useState(projeto.regiao ?? "");
  const [limite, setLimite] = useState(50);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await buscarNoMapa(projeto.id, { termo, local, limite });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setEnviado(true);
    });
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo="Buscar no Google Maps"
      subtitulo={projeto.nome}
      largura="sm"
    >
      {enviado ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-st-fechou/15 text-st-fechou">
            <IconCheck className="h-6 w-6" />
          </span>
          <h3 className="text-base font-semibold text-white">Busca enviada</h3>
          <p className="max-w-xs text-sm text-slate-400">
            O n8n está rodando a raspagem. Os leads aparecem neste quadro
            sozinhos quando terminar — costuma levar alguns minutos.
          </p>
          <button className="btn-primary mt-2" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label className="label" htmlFor="termo">
              O que procurar
            </label>
            <input
              id="termo"
              className="input"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="petshop"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label" htmlFor="local">
              Onde
            </label>
            <input
              id="local"
              className="input"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Caçador, SC"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="limite">
              Máximo de resultados
            </label>
            <input
              id="limite"
              type="number"
              min={1}
              max={300}
              className="input"
              value={limite}
              onChange={(e) => setLimite(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-slate-500">
              Cada resultado consome crédito do Apify. Comece baixo para medir o
              custo real antes de soltar volume.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink-900 p-3">
            <p className="text-xs leading-relaxed text-slate-400">
              Quem já está no projeto é pulado, comparando o lugar no Google e o
              telefone — rodar a mesma busca de novo não duplica. Os sinais de
              qualificação vêm marcados: sem site, nota baixa, poucas avaliações.
            </p>
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
              onClick={aoFechar}
              disabled={pendente}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={pendente}>
              <IconMap className="h-4 w-4" />
              {pendente ? "Enviando..." : "Buscar"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
