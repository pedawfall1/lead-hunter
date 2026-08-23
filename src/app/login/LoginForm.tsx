"use client";

import { useState, useTransition } from "react";
import { entrar } from "@/app/actions/auth";

export default function LoginForm({
  proximo,
  demo,
}: {
  proximo: string;
  demo?: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    iniciar(async () => {
      const r = await entrar(fd);
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <input type="hidden" name="next" value={proximo} />

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={demo ? "demo@leadhunter.app" : undefined}
          className="input"
          placeholder="voce@agencia.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required={!demo}
          defaultValue={demo ? "demo" : undefined}
          className="input"
          placeholder="••••••••"
        />
      </div>

      {erro && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {erro}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
