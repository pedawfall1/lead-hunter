"use server";

import { revalidatePath } from "next/cache";
import { criarInteracaoDb, excluirInteracaoDb } from "@/lib/db";
import { mensagemDeErro } from "@/lib/erros";
import type { ActionResult, Interacao, TipoInteracao } from "@/lib/types";
import { TIPOS_INTERACAO } from "@/lib/types";

function revalidar(projetoId: string) {
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/hoje");
}

export async function registrarInteracao(
  leadId: string,
  projetoId: string,
  tipo: TipoInteracao,
  texto: string
): Promise<ActionResult<Interacao>> {
  if (!TIPOS_INTERACAO.includes(tipo))
    return { ok: false, erro: "Tipo de interação inválido." };
  if (!texto.trim()) return { ok: false, erro: "Escreva o que aconteceu." };

  try {
    const interacao = await criarInteracaoDb(leadId, {
      tipo,
      texto: texto.trim(),
      template_id: null,
    });
    revalidar(projetoId);
    return { ok: true, data: interacao };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function excluirInteracao(
  id: string,
  projetoId: string
): Promise<ActionResult> {
  try {
    await excluirInteracaoDb(id);
    revalidar(projetoId);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
