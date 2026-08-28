"use server";

import { revalidatePath } from "next/cache";
import {
  atribuirLeadDb,
  obterConexao,
  salvarConexaoDb,
  salvarWebhookDb,
  usuarioAtual,
} from "@/lib/db";
import {
  criarInstancia,
  desconectarInstancia,
  estadoDaInstancia,
  evolutionConfigurada,
  nomeInstancia,
  numeroDaInstancia,
  qrDaInstancia,
  type EstadoConexao,
  type Qr,
} from "@/lib/evolution";
import { webhookValido } from "@/lib/n8n";
import { mensagemDeErro } from "@/lib/erros";
import type { ActionResult } from "@/lib/types";

export type EstadoWhatsapp = {
  status: EstadoConexao;
  numero: string | null;
  qr: Qr | null;
};

async function euOuErro(): Promise<
  { ok: true; userId: string } | { ok: false; erro: string }
> {
  const userId = await usuarioAtual();
  if (!userId) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  return { ok: true, userId };
}

/**
 * Começa (ou refaz) a conexão do WhatsApp de quem está logado.
 *
 * Cria a instância na Evolution e devolve o QR. Chamar de novo com a
 * instância já criada é o caso normal — quem abre a tela duas vezes — e
 * por isso "já existe" não é tratado como erro lá na `criarInstancia`.
 */
export async function conectarWhatsapp(): Promise<
  ActionResult<EstadoWhatsapp>
> {
  if (!evolutionConfigurada()) {
    return {
      ok: false,
      erro: "Evolution não configurada. Falta EVOLUTION_URL e EVOLUTION_API_KEY.",
    };
  }

  const eu = await euOuErro();
  if (!eu.ok) return eu;

  const instancia = nomeInstancia(eu.userId);

  try {
    const criada = await criarInstancia(instancia);
    if (!criada.ok) return { ok: false, erro: criada.erro };

    // Já conectado: não adianta mostrar QR, mostra o número.
    const estado = await estadoDaInstancia(instancia);
    if (estado.ok && estado.data === "open") {
      const numero = await numeroDaInstancia(instancia);
      await salvarConexaoDb({
        user_id: eu.userId,
        instancia,
        status: "open",
        numero,
      });
      revalidatePath("/equipe");
      return { ok: true, data: { status: "open", numero, qr: null } };
    }

    const qr = await qrDaInstancia(instancia);
    if (!qr.ok) return { ok: false, erro: qr.erro };

    await salvarConexaoDb({
      user_id: eu.userId,
      instancia,
      status: "connecting",
    });
    revalidatePath("/equipe");

    return { ok: true, data: { status: "connecting", numero: null, qr: qr.data } };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/**
 * Como está a conexão agora.
 *
 * A tela chama isto de tempos em tempos enquanto o QR está na frente: a
 * Evolution não avisa ninguém quando o celular lê o código, então quem
 * pergunta somos nós.
 */
export async function estadoWhatsapp(): Promise<ActionResult<EstadoWhatsapp>> {
  if (!evolutionConfigurada()) {
    return { ok: true, data: { status: "close", numero: null, qr: null } };
  }

  const eu = await euOuErro();
  if (!eu.ok) return eu;

  const instancia = nomeInstancia(eu.userId);

  try {
    const estado = await estadoDaInstancia(instancia);
    if (!estado.ok) return { ok: false, erro: estado.erro };

    const numero =
      estado.data === "open" ? await numeroDaInstancia(instancia) : null;

    const antes = await obterConexao(eu.userId);
    // Só escreve quando algo mudou: a tela consulta em laço, e gravar a
    // cada volta encheria o banco de escrita à toa.
    if (!antes || antes.status !== estado.data || antes.numero !== numero) {
      await salvarConexaoDb({
        user_id: eu.userId,
        instancia,
        status: estado.data,
        numero,
      });
      revalidatePath("/equipe");
    }

    return { ok: true, data: { status: estado.data, numero, qr: null } };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/** Desliga o WhatsApp desta conta. A instância continua lá, vazia. */
export async function desconectarWhatsapp(): Promise<ActionResult> {
  const eu = await euOuErro();
  if (!eu.ok) return eu;

  const instancia = nomeInstancia(eu.userId);

  try {
    const r = await desconectarInstancia(instancia);
    if (!r.ok) return { ok: false, erro: r.erro };

    await salvarConexaoDb({
      user_id: eu.userId,
      instancia,
      status: "close",
      numero: null,
    });
    revalidatePath("/equipe");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/** Passa o lead para alguém da equipe. `null` solta o lead. */
export async function atribuirLead(
  leadId: string,
  responsavelId: string | null
): Promise<ActionResult> {
  try {
    await atribuirLeadDb(leadId, responsavelId);
    revalidatePath("/projetos");
    revalidatePath("/hoje");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/**
 * Guarda o webhook do n8n desta pessoa.
 *
 * Cada vendedor aponta para o fluxo dele, para o disparo de um não cair na
 * fila do outro. Vazio limpa e faz voltar ao webhook do ambiente.
 */
export async function salvarWebhook(url: string): Promise<ActionResult> {
  const eu = await euOuErro();
  if (!eu.ok) return eu;

  const limpo = url.trim();
  if (limpo && !webhookValido(limpo)) {
    return {
      ok: false,
      erro: "Use uma URL https pública (endereço interno não vale).",
    };
  }

  try {
    await salvarWebhookDb(eu.userId, nomeInstancia(eu.userId), limpo || null);
    revalidatePath("/equipe");
    revalidatePath("/hoje");
    revalidatePath("/projetos");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
