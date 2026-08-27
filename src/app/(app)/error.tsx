"use client";

import { useEffect } from "react";

/**
 * Tela de erro da área logada.
 *
 * Em produção o Next esconde a mensagem original (só sobra o `digest`),
 * então não dá para explicar o que houve — mas dá para oferecer as duas
 * saídas que resolvem quase tudo: recarregar e entrar de novo.
 *
 * A segunda existe porque a causa mais comum aqui é sessão que o servidor
 * não conseguiu validar. Antes a tela só dizia "não consegui carregar" e
 * ficava um beco sem saída.
 */
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-3xl">⚠️</span>
      <h1 className="text-base font-semibold text-white">
        Não consegui carregar essa tela
      </h1>
      <p className="max-w-sm text-sm text-slate-400">
        {error.message || "Erro inesperado."}
      </p>
      <p className="max-w-sm text-[13px] leading-relaxed text-slate-500">
        Na maioria das vezes é a sessão que precisa ser renovada. Tente
        recarregar; se continuar, entre de novo. Nada do que você cadastrou é
        perdido.
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button className="btn-primary" onClick={reset}>
          Tentar de novo
        </button>
        <a className="btn-sub px-3 py-2 text-sm" href="/login?sessao=expirada">
          Entrar de novo
        </a>
      </div>

      {error.digest && (
        // O digest é o que liga esta tela à linha do log da Vercel. Sem ele
        // não dá para achar o erro depois.
        <p className="mt-1 font-mono text-[11px] text-slate-600">
          código: {error.digest}
        </p>
      )}
    </div>
  );
}
