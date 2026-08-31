"use server";

import { revalidatePath } from "next/cache";
import {
  ajustarLeadDb,
  atualizarInteracaoDb,
  criarInteracaoDb,
  listarInteracoes,
  listarNaoPerturbe,
  contarDisparosHoje,
  obterConexao,
  usuarioAtual,
} from "@/lib/db";
import { cadenciaSugerida, somarDias } from "@/lib/agenda";
import { mensagemDeErro } from "@/lib/erros";
import { enviarParaN8n } from "@/lib/n8n";
import { soDigitos, telefoneWhatsapp } from "@/lib/format";
import type { ActionResult, Lead, LeadStatus } from "@/lib/types";

const FUSO_BR = "America/Sao_Paulo";
const TETO_DIARIO_PADRAO = 40;
const JANELA_INICIO_PADRAO = "09:00";
const JANELA_FIM_PADRAO = "20:00";

function horaEmBrasilia(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: FUSO_BR,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Manda o disparo para a fila do n8n.
 *
 * A interação é criada ANTES de chamar o n8n: assim o id já vai no payload
 * e o callback consegue marcar entrega, leitura e resposta na linha certa.
 * Se o n8n recusar, a interação é marcada com erro em vez de sumir — o
 * histórico precisa mostrar a tentativa que falhou.
 */
export async function dispararPeloN8n(
  lead: Pick<Lead, "id" | "projeto_id" | "nome" | "telefone" | "status">,
  dados: {
    mensagem: string;
    templateId: string | null;
    projeto: string;
    servico: string | null;
  }
): Promise<ActionResult<Lead>> {
  const telefone = telefoneWhatsapp(lead.telefone);
  if (!telefone) return { ok: false, erro: "Lead sem telefone válido." };
  if (!dados.mensagem.trim())
    return { ok: false, erro: "A mensagem está vazia." };

  try {
    const bloqueados = await listarNaoPerturbe();
    const cauda = telefone.slice(-8);
    if (bloqueados.some((t) => soDigitos(t).endsWith(cauda))) {
      return {
        ok: false,
        erro: "Este número está na lista de não perturbe.",
      };
    }

    // De qual WhatsApp esta mensagem sai. Cada vendedor tem o seu, então
    // isto se resolve a cada disparo — não uma vez no arranque do servidor.
    const userId = await usuarioAtual();
    if (!userId) return { ok: false, erro: "Sessão expirada. Entre de novo." };
    const conexao = await obterConexao(userId);

    const horaAtual = horaEmBrasilia();
    const janelaInicio = (conexao?.janela_inicio ?? JANELA_INICIO_PADRAO).slice(0, 5);
    const janelaFim = (conexao?.janela_fim ?? JANELA_FIM_PADRAO).slice(0, 5);
    const teto = conexao?.teto_diario ?? TETO_DIARIO_PADRAO;

    if (horaAtual < janelaInicio || horaAtual > janelaFim) {
      return {
        ok: false,
        erro: `Disparo permitido somente das ${janelaInicio} às ${janelaFim}.`,
      };
    }

    const enviados = await contarDisparosHoje(userId);
    if (enviados >= teto) {
      return {
        ok: false,
        erro: `Você já mandou ${enviados} de ${teto} mensagens hoje. Volta amanhã.`,
      };
    }

    const interacao = await criarInteracaoDb(lead.id, {
      tipo: "whatsapp",
      texto: dados.mensagem,
      template_id: dados.templateId,
    });

    const envio = await enviarParaN8n(
      {
        interacao_id: interacao.id,
        lead_id: lead.id,
        projeto_id: lead.projeto_id,
        // Só manda a instância se ela está de fato no ar: nome de instância
        // desconectada faria o n8n tentar enviar por um WhatsApp desligado.
        instancia: conexao?.status === "open" ? conexao.instancia : null,
        usuario_id: userId,
        telefone,
        nome: lead.nome,
        mensagem: dados.mensagem,
        template_id: dados.templateId,
        projeto: dados.projeto,
        servico: dados.servico,
      },
      // Cada vendedor tem o fluxo dele no n8n; sem webhook próprio cai no
      // do ambiente, que era o desenho de quando havia uma conta só.
      conexao?.webhook_url
    );

    if (!envio.ok) {
      await atualizarInteracaoDb(interacao.id, { erro: envio.erro });
      return { ok: false, erro: envio.erro };
    }

    if (envio.externoId) {
      await atualizarInteracaoDb(interacao.id, { externo_id: envio.externoId });
    }

    const anteriores = await listarInteracoes(lead.id);
    const tentativas = anteriores.filter(
      (i) => i.tipo === "whatsapp" && i.direcao !== "entrada"
    ).length;

    const campos: { status?: LeadStatus; proximo_contato: string } = {
      proximo_contato: somarDias(cadenciaSugerida(tentativas)),
    };
    if (lead.status === "novo") campos.status = "contatado";

    const atualizado = await ajustarLeadDb(lead.id, campos);

    revalidatePath(`/projetos/${lead.projeto_id}`);
    revalidatePath("/hoje");
    revalidatePath("/");

    return { ok: true, data: atualizado };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function consultarFilaHoje(): Promise<
  ActionResult<{
    enviados: number;
    teto: number;
    dentroDaJanela: boolean;
    janelaInicio: string;
    janelaFim: string;
  } | null>
> {
  try {
    const userId = await usuarioAtual();
    if (!userId) return { ok: false, erro: "Sessão expirada. Entre de novo." };

    const conexao = await obterConexao(userId);
    const janelaInicio = (conexao?.janela_inicio ?? JANELA_INICIO_PADRAO).slice(0, 5);
    const janelaFim = (conexao?.janela_fim ?? JANELA_FIM_PADRAO).slice(0, 5);
    const horaAtual = horaEmBrasilia();

    return {
      ok: true,
      data: {
        enviados: await contarDisparosHoje(userId),
        teto: conexao?.teto_diario ?? TETO_DIARIO_PADRAO,
        dentroDaJanela:
          horaAtual >= janelaInicio && horaAtual <= janelaFim,
        janelaInicio,
        janelaFim,
      },
    };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
