"use server";

import { DEMO } from "@/lib/config";
import { obterLead, obterProjeto } from "@/lib/db";
import { enviarLeadParaArium } from "@/lib/arium";
import { mensagemDeErro } from "@/lib/erros";
import type { ActionResult } from "@/lib/types";

export async function enviarParaArium(
  leadId: string,
  projetoId: string
): Promise<ActionResult<{ contactId: string; jaExistia: boolean }>> {
  if (DEMO) {
    return { ok: false, erro: "Envio pro Arium não funciona no modo demo." };
  }

  try {
    const [lead, projeto] = await Promise.all([
      obterLead(leadId),
      obterProjeto(projetoId),
    ]);
    if (!lead) return { ok: false, erro: "Lead não encontrado." };
    if (!projeto) return { ok: false, erro: "Projeto não encontrado." };

    const resultado = await enviarLeadParaArium(lead, projeto);
    return { ok: true, data: resultado };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
