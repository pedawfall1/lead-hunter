import { soDigitos, telefoneWhatsapp } from "./format";

/**
 * Integração com n8n.
 *
 * O Lead Hunter decide quem abordar, com que texto e quando. O n8n recebe
 * isso num webhook e cuida do envio pela Evolution — timer, fila e conexão
 * ficam lá, que é onde já funcionam. Depois ele devolve os eventos.
 *
 * Sem N8N_WEBHOOK_URL configurada a integração fica invisível na interface
 * e o app segue funcionando só com o link wa.me.
 */

export const N8N_URL = process.env.N8N_WEBHOOK_URL ?? "";
/** Fluxo separado: dispara a busca no mapa (Apify) e devolve em /api/importar. */
export const N8N_BUSCA_URL = process.env.N8N_BUSCA_URL ?? "";
const N8N_TOKEN = process.env.N8N_TOKEN ?? "";

/** Token que o n8n precisa mandar de volta para o callback ser aceito. */
export const TOKEN_CALLBACK = process.env.LH_WEBHOOK_TOKEN ?? "";

export function n8nConfigurado(): boolean {
  return !!N8N_URL;
}

export function buscaConfigurada(): boolean {
  return !!N8N_BUSCA_URL;
}

export type PedidoBusca = {
  projeto_id: string;
  projeto: string;
  /** o que procurar: "petshop", "advogado"... */
  termo: string;
  /** onde: "Videira, SC" */
  local: string;
  /** teto de resultados, para não torrar credito do Apify de uma vez */
  limite: number;
};

/** Pede ao n8n que rode a busca. O resultado volta em /api/importar. */
export async function pedirBusca(
  pedido: PedidoBusca
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!N8N_BUSCA_URL) return { ok: false, erro: "Busca não configurada." };

  try {
    const resposta = await fetch(N8N_BUSCA_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(N8N_TOKEN ? { "x-lh-token": N8N_TOKEN } : {}),
      },
      body: JSON.stringify(pedido),
      // scraping demora: aqui só esperamos o n8n aceitar o trabalho
      signal: AbortSignal.timeout(20_000),
    });

    if (!resposta.ok) {
      return { ok: false, erro: `n8n respondeu ${resposta.status}.` };
    }
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "TimeoutError"
        ? "O n8n não respondeu a tempo."
        : e instanceof Error
          ? e.message
          : "Falha ao falar com o n8n.";
    return { ok: false, erro: msg };
  }
}

export type PayloadDisparo = {
  /** id da interação já criada aqui — devolva no callback para correlacionar */
  interacao_id: string;
  lead_id: string;
  projeto_id: string;
  /** DDI + DDD + número, só dígitos, pronto para a Evolution */
  telefone: string;
  nome: string;
  mensagem: string;
  template_id: string | null;
  projeto: string;
  servico: string | null;
};

export type RespostaDisparo =
  | { ok: true; externoId: string | null }
  | { ok: false; erro: string };

/** Manda um disparo para a fila do n8n. */
export async function enviarParaN8n(
  payload: PayloadDisparo
): Promise<RespostaDisparo> {
  if (!N8N_URL) return { ok: false, erro: "n8n não configurado." };

  try {
    const resposta = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(N8N_TOKEN ? { "x-lh-token": N8N_TOKEN } : {}),
      },
      body: JSON.stringify(payload),
      // o n8n só precisa aceitar o job; o envio em si é assíncrono
      signal: AbortSignal.timeout(15_000),
    });

    if (!resposta.ok) {
      return { ok: false, erro: `n8n respondeu ${resposta.status}.` };
    }

    // Se o fluxo devolver um id da Evolution, guardamos para correlacionar.
    let externoId: string | null = null;
    try {
      const corpo = (await resposta.json()) as Record<string, unknown>;
      const bruto = corpo?.externo_id ?? corpo?.messageId ?? corpo?.id;
      if (typeof bruto === "string") externoId = bruto;
    } catch {
      // resposta vazia ou não-JSON: tudo bem, o callback resolve depois
    }

    return { ok: true, externoId };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "TimeoutError"
        ? "O n8n não respondeu a tempo."
        : e instanceof Error
          ? e.message
          : "Falha ao falar com o n8n.";
    return { ok: false, erro: msg };
  }
}

/* ------------------------- eventos que voltam ------------------------- */

export const EVENTOS = ["entregue", "lido", "resposta", "falha", "bloqueado"] as const;
export type EventoN8n = (typeof EVENTOS)[number];

export type Callback = {
  evento: EventoN8n;
  /** o id que mandamos no disparo — o caminho mais confiável */
  interacao_id?: string;
  /** alternativa: id da mensagem na Evolution */
  externo_id?: string;
  /** alternativa: telefone, para quando o evento não tem referência */
  telefone?: string;
  /** texto da resposta do lead */
  texto?: string;
  erro?: string;
  /** ISO; se vier vazio usamos a hora de agora */
  em?: string;
};

export function ehEvento(v: unknown): v is EventoN8n {
  return typeof v === "string" && (EVENTOS as readonly string[]).includes(v);
}

/** Normaliza o telefone que o n8n mandar (aceita 5549..., @s.whatsapp.net etc). */
export function telefoneDoCallback(bruto: string | undefined): string {
  if (!bruto) return "";
  const limpo = bruto.split("@")[0] ?? "";
  const digitos = soDigitos(limpo);
  return telefoneWhatsapp(digitos) || digitos;
}
