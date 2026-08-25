"use server";

import { revalidatePath } from "next/cache";
import {
  criarDemoDb,
  excluirDemoDb,
  listarDemosDoLead,
  obterDemoDb,
  reestilizarDemoDb,
  obterLead,
  obterProjeto,
  publicarDemoDb,
  slugEmUso,
} from "@/lib/db";
import { montarBriefing } from "@/lib/site/briefing";
import { ehCorValida } from "@/lib/site/paletas";
import {
  ESTILOS,
  PALETAS,
  type ConteudoSite,
  type Estilo,
  type Paleta,
} from "@/lib/site/tipos";
import { gerarConteudo, openaiConfigurado } from "@/lib/site/gerar";
import { renderizarSite } from "@/lib/site/render";
import { montarSlug } from "@/lib/site/slug";
import { mensagemDeErro } from "@/lib/erros";
import type { ActionResult, Demo } from "@/lib/types";

/**
 * Gera a demo de site do lead.
 *
 * O caminho inteiro: lead do banco -> briefing -> OpenAI (só o texto) ->
 * `renderizarSite` (o HTML) -> uma linha em `lh_demos`. Roda em segundos,
 * então aqui não tem o vaivém de corrida que a busca do Apify precisa.
 */
export async function gerarDemo(leadId: string): Promise<ActionResult<Demo>> {
  if (!openaiConfigurado()) {
    return {
      ok: false,
      erro: "OPENAI_API_KEY não configurada no servidor.",
    };
  }

  try {
    // Lê do banco em vez de aceitar o lead da tela: com RLS ligado, isto é
    // o que garante que ninguém gere demo de lead de outra conta.
    const lead = await obterLead(leadId);
    if (!lead) return { ok: false, erro: "Lead não encontrado." };

    const projeto = await obterProjeto(lead.projeto_id);
    if (!projeto) return { ok: false, erro: "Projeto não encontrado." };

    const briefing = montarBriefing(lead, projeto);
    const { conteudo, modelo, tokens } = await gerarConteudo(briefing);
    const html = renderizarSite(conteudo, briefing);

    // Colisão de slug é improvável (8 caracteres aleatórios), mas o slug é
    // a URL: se colidir, a demo nova apareceria no link da antiga.
    let slug = montarSlug(briefing.nomeCurto);
    if (await slugEmUso(slug)) slug = montarSlug(briefing.nomeCurto);

    const demo = await criarDemoDb({
      lead_id: lead.id,
      projeto_id: lead.projeto_id,
      slug,
      titulo: conteudo.titulo,
      conteudo,
      html,
      modelo,
      tokens_entrada: tokens.entrada,
      tokens_saida: tokens.saida,
    });

    revalidatePath(`/projetos/${lead.projeto_id}`);
    return { ok: true, data: demo };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/**
 * As demos do lead. A aba busca sob demanda em vez de o quadro carregar
 * demo de todo mundo: quase nenhum lead tem demo, e o kanban já puxa
 * leads e interações.
 */
export async function listarDemos(leadId: string): Promise<ActionResult<Demo[]>> {
  try {
    return { ok: true, data: await listarDemosDoLead(leadId) };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/**
 * Muda a cara da demo sem gerar de novo.
 *
 * Re-renderiza em cima do `conteudo` que já está salvo, então **não gasta
 * token nenhum** — dá pra ficar testando cor à vontade. É o caminho pra
 * quando você abre o Instagram do cliente e vê que a marca dele não é nada
 * do que a LLM chutou.
 */
export async function reestilizarDemo(
  id: string,
  ajuste: { paleta?: string; estilo?: string; corMarca?: string | null }
): Promise<ActionResult<Demo>> {
  try {
    const demo = await obterDemoDb(id);
    if (!demo) return { ok: false, erro: "Demo não encontrada." };

    const lead = await obterLead(demo.lead_id);
    if (!lead) return { ok: false, erro: "Lead não encontrado." };

    const projeto = await obterProjeto(lead.projeto_id);
    if (!projeto) return { ok: false, erro: "Projeto não encontrado." };

    const cor = ajuste.corMarca?.trim() ? ajuste.corMarca.trim() : null;
    if (cor && !ehCorValida(cor)) {
      return { ok: false, erro: "Cor inválida. Use o formato #RRGGBB." };
    }

    const conteudo: ConteudoSite = {
      ...demo.conteudo,
      paleta: (PALETAS as readonly string[]).includes(ajuste.paleta ?? "")
        ? (ajuste.paleta as Paleta)
        : demo.conteudo.paleta,
      estilo: (ESTILOS as readonly string[]).includes(ajuste.estilo ?? "")
        ? (ajuste.estilo as Estilo)
        : demo.conteudo.estilo,
      cor_marca: cor,
    };

    const html = renderizarSite(conteudo, montarBriefing(lead, projeto));
    const atualizada = await reestilizarDemoDb(id, { conteudo, html });

    revalidatePath(`/demo/${demo.slug}`);
    return { ok: true, data: atualizada };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/** Tira do ar (ou devolve) sem perder o que já foi gerado e pago. */
export async function publicarDemo(
  id: string,
  publicado: boolean
): Promise<ActionResult<Demo>> {
  try {
    const demo = await publicarDemoDb(id, publicado);
    revalidatePath(`/demo/${demo.slug}`);
    revalidatePath(`/projetos/${demo.projeto_id}`);
    return { ok: true, data: demo };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function excluirDemo(id: string): Promise<ActionResult> {
  try {
    await excluirDemoDb(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
