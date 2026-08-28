"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  conectarWhatsapp,
  desconectarWhatsapp,
  estadoWhatsapp,
  type EstadoWhatsapp,
} from "@/app/actions/equipe";
import { formatarTelefone } from "@/lib/format";
import type { Membro } from "@/lib/types";
import { IconCheck, IconWhatsapp } from "@/components/ui/icons";

/** De quanto em quanto tempo perguntamos se o QR já foi lido. */
const INTERVALO_MS = 3000;
/** Depois disto o QR da Evolution vence e não adianta continuar olhando. */
const LIMITE_MS = 120_000;

function Etiqueta({ conectado }: { conectado: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        conectado
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-slate-500/10 text-slate-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          conectado ? "bg-emerald-400" : "bg-slate-500"
        }`}
      />
      {conectado ? "Conectado" : "Desconectado"}
    </span>
  );
}

export default function PainelEquipe({
  membros,
  euId,
  evolutionPronta,
}: {
  membros: Membro[];
  euId: string | null;
  evolutionPronta: boolean;
}) {
  const [estado, setEstado] = useState<EstadoWhatsapp | null>(null);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const desdeRef = useRef(0);

  const eu = membros.find((m) => m.user_id === euId);

  /**
   * Enquanto o QR está na tela, pergunta à Evolution se já leram.
   *
   * A Evolution não avisa ninguém quando o celular escaneia, então a
   * consulta em laço é o único jeito de a tela virar sozinha. Para quando
   * conecta ou quando o QR vence — deixar o laço vivo depois disso seria
   * bater no servidor à toa.
   */
  useEffect(() => {
    if (estado?.status !== "connecting") return;

    const id = setInterval(async () => {
      if (Date.now() - desdeRef.current > LIMITE_MS) {
        clearInterval(id);
        setErro("O QR venceu. Clique em conectar de novo.");
        setEstado(null);
        return;
      }

      const r = await estadoWhatsapp();
      if (r.ok && r.data && r.data.status !== "connecting") {
        clearInterval(id);
        setEstado(r.data);
      }
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, [estado?.status]);

  const conectar = useCallback(() => {
    setErro("");
    iniciar(async () => {
      const r = await conectarWhatsapp();
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      desdeRef.current = Date.now();
      setEstado(r.data ?? null);
    });
  }, []);

  const desconectar = useCallback(() => {
    setErro("");
    iniciar(async () => {
      const r = await desconectarWhatsapp();
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setEstado({ status: "close", numero: null, qr: null });
    });
  }, []);

  const conectado = estado ? estado.status === "open" : !!eu?.conectado;
  const numero = estado?.numero ?? eu?.numero ?? null;
  const qr = estado?.status === "connecting" ? estado.qr : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Equipe</h1>
        <p className="mt-1 text-sm text-slate-400">
          Quem vende com você, e de qual WhatsApp cada um dispara.
        </p>
      </header>

      {/* ------------------------- meu WhatsApp ------------------------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <IconWhatsapp className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-medium text-slate-100">Meu WhatsApp</h2>
              <p className="text-sm text-slate-400">
                {conectado && numero
                  ? formatarTelefone(numero)
                  : conectado
                    ? "Conectado"
                    : "Nenhum número conectado"}
              </p>
            </div>
          </div>

          {!evolutionPronta ? (
            <span className="text-sm text-slate-500">
              Evolution não configurada
            </span>
          ) : conectado ? (
            <button
              onClick={desconectar}
              disabled={pendente}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 disabled:opacity-50"
            >
              Desconectar
            </button>
          ) : (
            <button
              onClick={conectar}
              disabled={pendente}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {pendente ? "Gerando QR..." : "Conectar WhatsApp"}
            </button>
          )}
        </div>

        {erro && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {erro}
          </p>
        )}

        {qr?.base64 && (
          <div className="mt-5 flex flex-col items-center gap-4 rounded-lg border border-slate-800 bg-white p-5 sm:flex-row sm:items-start">
            <Image
              src={qr.base64}
              alt="QR code para conectar o WhatsApp"
              width={220}
              height={220}
              unoptimized
              className="h-[220px] w-[220px] shrink-0"
            />
            <ol className="space-y-2 text-sm text-slate-700">
              <li>1. Abra o WhatsApp no celular</li>
              <li>2. Toque nos três pontos, Aparelhos conectados</li>
              <li>3. Conectar um aparelho</li>
              <li>4. Aponte a câmera para este código</li>
              <li className="pt-2 text-slate-500">
                A tela vira sozinha assim que o celular ler.
              </li>
            </ol>
          </div>
        )}

        {qr && !qr.base64 && qr.codigo && (
          <p className="mt-4 text-sm text-slate-300">
            Código de pareamento:{" "}
            <code className="rounded bg-slate-800 px-2 py-1 font-mono">
              {qr.codigo}
            </code>
          </p>
        )}
      </section>

      {/* --------------------------- membros --------------------------- */}
      <section>
        <h2 className="mb-3 font-medium text-slate-100">
          Vendedores ({membros.length})
        </h2>

        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
          {membros.map((m) => (
            <li
              key={m.user_id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">
                  {m.email ?? m.user_id}
                  {m.user_id === euId && (
                    <span className="ml-2 text-xs text-slate-500">você</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {m.papel === "dono" ? "Dono" : "Vendedor"}
                  {m.numero ? ` · ${formatarTelefone(m.numero)}` : ""}
                </p>
              </div>
              <Etiqueta conectado={m.user_id === euId ? conectado : m.conectado} />
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          <p className="flex items-start gap-2">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Para adicionar alguém: convide o e-mail pelo painel do Supabase
              (Authentication, Users, Invite user). A pessoa define a própria
              senha e você a inclui na equipe. Leads e projetos são
              compartilhados; o WhatsApp de disparo é de cada um.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
