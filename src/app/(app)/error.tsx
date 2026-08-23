"use client";

import { useEffect } from "react";

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
      <button className="btn-primary mt-2" onClick={reset}>
        Tentar de novo
      </button>
    </div>
  );
}
