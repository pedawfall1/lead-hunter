"use server";

import { revalidatePath } from "next/cache";
import { obterLead, obterProjeto, salvarInstagramDb } from "@/lib/db";
import {
  estadoDaCorrida,
  iniciarCorridaIg,
  itensBrutos,
  apifyConfigurado,
} from "@/lib/apify";
import {
  normalizarPerfil,
  sinaisDoPerfil,
  type PerfilBruto,
} from "@/lib/instagram";
import { mensagemDeErro } from "@/lib/erros";
import type { ActionResult, Lead } from "@/lib/types";

/**
 * Análise do Instagram do lead.
 *
 * Mesmo vaivém da busca no Google Maps, e pelo mesmo motivo: a raspagem de
 * um perfil leva de 15 a 40 segundos e função serverless morre antes.
 * `analisarInstagram` dispara e volta na hora com a corrida registrada no
 * próprio lead; `conferirInstagram` é chamada pela tela até terminar.
 *
 * Fechar a janela não perde nada — a corrida segue no Apify e o
 * `ig_run_id` continua no lead.
 */

/** Quantos leads o projeto considera "sem site", para o sinal so_linktree. */
function temSite(lead: Lead): boolean {
  return !lead.sinais?.sem_site;
}

export async function analisarInstagram(
  leadId: string
): Promise<ActionResult<Lead>> {
  if (!apifyConfigurado()) {
    return { ok: false, erro: "APIFY_TOKEN não configurado no servidor." };
  }

  try {
    const lead = await obterLead(leadId);
    if (!lead) return { ok: false, erro: "Lead não encontrado." };

    const usuario = (lead.instagram ?? "").trim().replace(/^@/, "");
    if (!usuario) {
      return {
        ok: false,
        erro: "Esse lead não tem Instagram. Preencha o @ na aba Detalhes.",
      };
    }

    const corrida = await iniciarCorridaIg(usuario);

    const atualizado = await salvarInstagramDb(leadId, {
      ig_run_id: corrida.runId,
      ig_bruto: null,
      ig_erro: null,
    });

    return { ok: true, data: atualizado };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/**
 * Confere a corrida. Quando o Apify termina, normaliza, marca os sinais e
 * fecha — então chamar de novo depois é barato e não refaz nada.
 */
export async function conferirInstagram(
  leadId: string
): Promise<ActionResult<Lead>> {
  try {
    const lead = await obterLead(leadId);
    if (!lead) return { ok: false, erro: "Lead não encontrado." };
    if (!lead.ig_run_id) return { ok: true, data: lead };

    const corrida = await estadoDaCorrida(lead.ig_run_id);
    if (corrida.status === "rodando") return { ok: true, data: lead };

    if (corrida.status === "erro") {
      const atualizado = await salvarInstagramDb(leadId, {
        ig_run_id: null,
        ig_erro:
          corrida.recado ??
          "O Apify terminou a corrida sem sucesso. Veja o log no painel dele.",
      });
      return { ok: true, data: atualizado };
    }

    const datasetId = corrida.datasetId;
    if (!datasetId) {
      const atualizado = await salvarInstagramDb(leadId, {
        ig_run_id: null,
        ig_erro: "A corrida terminou mas não devolveu resultado.",
      });
      return { ok: true, data: atualizado };
    }

    const brutos = await itensBrutos<PerfilBruto>(datasetId, 1);
    const perfil = brutos[0] ? normalizarPerfil(brutos[0]) : null;

    const projeto = await obterProjeto(lead.projeto_id);
    const sinais = sinaisDoPerfil(
      perfil,
      projeto?.criterios ?? [],
      temSite(lead)
    );

    const atualizado = await salvarInstagramDb(
      leadId,
      {
        ig_dados: perfil,
        // O item cru fica guardado: e a unica forma de saber depois se um
        // campo faltou porque o actor nao trouxe ou porque o normalizador
        // perdeu no caminho. Mesma ideia de lh_buscas.amostra.
        ig_bruto: (brutos[0] as Record<string, unknown> | undefined) ?? null,
        ig_run_id: null,
        ig_em: new Date().toISOString(),
        // Perfil nao encontrado nao e falha da corrida: e a resposta.
        ig_erro: perfil
          ? null
          : brutos[0]?.error ??
            "Perfil não encontrado. Confira o @ ou veja se a conta ainda existe.",
      },
      sinais
    );

    revalidatePath(`/projetos/${lead.projeto_id}`);
    return { ok: true, data: atualizado };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
