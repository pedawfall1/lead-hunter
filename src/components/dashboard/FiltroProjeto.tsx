"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Projeto } from "@/lib/types";

export default function FiltroProjeto({
  projetos,
  selecionado,
}: {
  projetos: Pick<Projeto, "id" | "nome">[];
  selecionado: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-slate-400 sm:inline">Projeto</span>
      <select
        className={`input w-full sm:w-56 ${pendente ? "opacity-60" : ""}`}
        value={selecionado}
        onChange={(e) => {
          const v = e.target.value;
          iniciar(() => {
            router.push(v === "todos" ? "/" : `/?projeto=${v}`);
          });
        }}
      >
        <option value="todos">Todos os projetos</option>
        {projetos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
