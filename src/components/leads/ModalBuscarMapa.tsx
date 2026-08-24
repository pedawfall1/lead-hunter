"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { conferirBusca, iniciarBusca } from "@/app/actions/busca";
import { IconCheck, IconMap } from "@/components/ui/icons";
import type { Busca, Projeto } from "@/lib/types";

/** De quanto em quanto tempo perguntamos ao Apify se já terminou. */
const INTERVALO = 5000;

function decorrido(desde: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(desde).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}min ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

export default function ModalBuscarMapa({
  projeto,
  buscaInicial,
  aoFechar,
}: {
  projeto: Projeto;
  buscaInicial: Busca | null;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const [termo, setTermo] = useState(projeto.nicho ?? "");
  const [local, setLocal] = useState(projeto.regiao ?? "");
  const [limite, setLimite] = useState(50);
  const [soSemSite, setSoSemSite] = useState(false);
  const [buscarContatos, setBuscarContatos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState<Busca | null>(
    buscaInicial?.status === "rodando" ? buscaInicial : null
  );
  const [tique, setTique] = useState(0);

  const rodando = busca?.status === "rodando";
  const buscaId = busca?.id;

  const conferir = useCallback(async () => {
    if (!buscaId) return;
    const r = await conferirBusca(buscaId);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    if (r.data) {
      setBusca(r.data);
      if (r.data.status === "concluida") router.refresh();
    }
  }, [buscaId, router]);

  // enquanto roda: pergunta de tempos em tempos e atualiza o cronômetro
  const guardaConferir = useRef(conferir);
  guardaConferir.current = conferir;

  useEffect(() => {
    if (!rodando) return;
    const relogio = setInterval(() => setTique((n) => n + 1), 1000);
    const consulta = setInterval(() => void guardaConferir.current(), INTERVALO);
    return () => {
      clearInterval(relogio);
      clearInterval(consulta);
    };
  }, [rodando]);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await iniciarBusca(projeto.id, {
        termo,
        local,
        limite,
        soSemSite,
        buscarContatos,
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.data) setBusca(r.data);
    });
  }

  /* ------------------------- rodando ------------------------- */
  if (rodando && busca) {
    return (
      <Modal
        aberto
        aoFechar={aoFechar}
        titulo="Buscando no Google Maps"
        subtitulo={`${busca.termo} · ${busca.local}`}
        largura="sm"
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="relative grid h-14 w-14 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
            <span className="relative grid h-14 w-14 place-items-center rounded-full bg-brand/15 text-brand-soft">
              <IconMap className="h-6 w-6" />
            </span>
          </span>

          <div>
            <p className="text-base font-semibold text-white">
              Raspagem em andamento
            </p>
            <p className="mt-1 text-sm tabular-nums text-slate-400" key={tique}>
              {decorrido(busca.criado_em)} rodando
            </p>
          </div>

          <p className="max-w-xs text-xs leading-relaxed text-slate-500">
            Costuma levar de um a cinco minutos. Pode fechar esta janela e até
            sair da tela — a busca continua no Apify e os leads entram sozinhos
            quando terminar.
          </p>

          {erro && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {erro}
            </p>
          )}

          <div className="flex gap-2">
            <button className="btn-ghost" onClick={aoFechar}>
              Fechar
            </button>
            <button className="btn-primary" onClick={() => void conferir()}>
              Conferir agora
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  /* ------------------------ terminou ------------------------- */
  if (busca && busca.status !== "rodando") {
    const deuErro = busca.status === "erro";
    return (
      <Modal
        aberto
        aoFechar={aoFechar}
        titulo={deuErro ? "A busca falhou" : "Busca concluída"}
        subtitulo={`${busca.termo} · ${busca.local}`}
        largura="sm"
      >
        <div className="flex flex-col items-center gap-3 py-5 text-center">
          {deuErro ? (
            <>
              <span className="text-3xl">⚠️</span>
              <p className="max-w-xs text-sm text-slate-400">
                {busca.erro ?? "O Apify não concluiu a corrida."}
              </p>
            </>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-st-fechou/15 text-st-fechou">
                <IconCheck className="h-6 w-6" />
              </span>
              <p className="text-2xl font-semibold tabular-nums text-white">
                {busca.inseridos}{" "}
                <span className="text-base font-medium text-slate-400">
                  {busca.inseridos === 1 ? "lead novo" : "leads novos"}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {busca.encontrados} encontrados · {busca.duplicados} já estavam
                no projeto
              </p>

              {busca.inseridos > 0 && busca.qualificados > 0 && (
                <p className="max-w-xs text-xs leading-relaxed text-slate-500">
                  <span className="text-brand-soft">
                    {busca.qualificados} com sinal marcado
                  </span>{" "}
                  — entraram na coluna{" "}
                  <span className="text-slate-300">Novo</span>, prontos para
                  abordar.
                </p>
              )}

              {busca.inseridos > 0 && busca.qualificados === 0 && (
                <div className="max-w-xs rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-left">
                  <p className="text-xs leading-relaxed text-amber-200">
                    Nenhum sinal foi marcado. Os critérios deste projeto são
                    coisas que o Google Maps não enxerga — como &ldquo;controla
                    tudo no papel&rdquo;.
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    Marque na mão ao abrir cada lead, ou adicione ao projeto
                    critérios que a busca consegue provar: sem site, sem Google
                    Meu Negócio, nota baixa, poucas avaliações.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="mt-1 flex gap-2">
            <button
              className="btn-ghost"
              onClick={() => {
                setBusca(null);
                setErro(null);
              }}
            >
              Buscar de novo
            </button>
            <button className="btn-primary" onClick={aoFechar}>
              Ver os leads
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  /* ----------------------- formulário ------------------------ */
  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo="Buscar no Google Maps"
      subtitulo={projeto.nome}
      largura="sm"
    >
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

        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-ink-900 px-3 py-2.5 transition-colors hover:border-slate-600">
            <input
              type="checkbox"
              checked={soSemSite}
              onChange={(e) => setSoSemSite(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
            />
            <span className="leading-snug">
              <span className="block text-sm text-slate-200">
                Só quem não tem site
              </span>
              <span className="block text-xs text-slate-500">
                Filtra no Google, antes de gastar crédito com quem já tem.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-ink-900 px-3 py-2.5 transition-colors hover:border-slate-600">
            <input
              type="checkbox"
              checked={buscarContatos}
              onChange={(e) => setBuscarContatos(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
            />
            <span className="leading-snug">
              <span className="block text-sm text-slate-200">
                Buscar e-mail e redes sociais
              </span>
              <span className="block text-xs text-slate-500">
                Abre o site de cada lugar atrás de contato. Traz mais, custa
                mais e demora mais.
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-lg border border-line bg-ink-900 p-3">
          <p className="text-xs leading-relaxed text-slate-400">
            Quem já está no projeto é pulado, comparando o lugar no Google e o
            telefone — rodar a mesma busca de novo não duplica. Os sinais vêm
            marcados: sem site, nota baixa, poucas avaliações.
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
            {pendente ? "Iniciando..." : "Buscar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
