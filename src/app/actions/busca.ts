"use server";

import { pedirBusca } from "@/lib/n8n";
import { mensagemDeErro } from "@/lib/erros";
import { obterProjeto } from "@/lib/db";
import type { ActionResult } from "@/lib/types";

export async function buscarNoMapa(
  projetoId: string,
  dados: { termo: string; local: string; limite: number }
): Promise<ActionResult> {
  const termo = dados.termo.trim();
  const local = dados.local.trim();

  if (!termo) return { ok: false, erro: "Diga o que procurar." };
  if (!local) return { ok: false, erro: "Diga a cidade ou região." };

  // Teto para o crédito do Apify não sumir numa busca só.
  const limite = Math.min(Math.max(Math.round(dados.limite) || 50, 1), 300);

  try {
    const projeto = await obterProjeto(projetoId);
    if (!projeto) return { ok: false, erro: "Projeto não encontrado." };

    const r = await pedirBusca({
      projeto_id: projetoId,
      projeto: projeto.nome,
      termo,
      local,
      limite,
    });

    if (!r.ok) return { ok: false, erro: r.erro };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
