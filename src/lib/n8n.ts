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
const N8N_TOKEN = process.env.N8N_TOKEN ?? "";

/** Token que o n8n precisa mandar de volta para o callback ser aceito. */
export const TOKEN_CALLBACK = process.env.LH_WEBHOOK_TOKEN ?? "";

export function n8nConfigurado(): boolean {
  return !!N8N_URL;
}

export type PayloadDisparo = {
  /** id da interação já criada aqui — devolva no callback para correlacionar */
  interacao_id: string;
  lead_id: string;
  projeto_id: string;
  /**
   * De qual WhatsApp esta mensagem sai.
   *
   * É o nome da instância na Evolution, do vendedor que apertou o botão.
   * Sem isto os dois sairiam do mesmo número e a resposta do lead cairia
   * no telefone errado. Vem `null` quando a pessoa ainda não conectou o
   * WhatsApp dela — aí cabe ao fluxo do n8n decidir se usa uma instância
   * padrão ou recusa.
   */
  instancia: string | null;
  /** quem disparou, para o n8n registrar e para você auditar depois */
  usuario_id: string;
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

/**
 * Só https, e só para fora.
 *
 * A URL do webhook é digitada por quem usa o app e vira um `fetch` feito
 * pelo servidor. Sem esta checagem, um endereço interno (`localhost`, um
 * IP de rede privada) faria o servidor bater em algo que ninguém de fora
 * alcança — que é o desenho clássico de SSRF.
 */
export function webhookValido(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;

    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost")) return false;
    if (/^\[?::1\]?$/.test(host)) return false;
    if (/^127\./.test(host)) return false;
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Manda um disparo para a fila do n8n.
 *
 * `url` é o webhook de quem está disparando — cada vendedor tem o seu, para
 * o disparo de um não cair na fila do outro. Sem ele cai no
 * `N8N_WEBHOOK_URL` do ambiente, que é o comportamento de quando havia uma
 * conta só.
 */
export async function enviarParaN8n(
  payload: PayloadDisparo,
  url?: string | null
): Promise<RespostaDisparo> {
  const destino = (url ?? "").trim() || N8N_URL;
  if (!destino) return { ok: false, erro: "n8n não configurado." };
  if (url && !webhookValido(url)) {
    return { ok: false, erro: "Webhook inválido: use uma URL https pública." };
  }

  try {
    const resposta = await fetch(destino, {
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
