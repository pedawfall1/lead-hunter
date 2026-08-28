import { soDigitos } from "./format";

/**
 * Evolution API — o WhatsApp de cada vendedor.
 *
 * O app fala direto com a Evolution para as operações de CONEXÃO: criar a
 * instância, pegar o QR e saber se está no ar. O disparo em si continua
 * indo pelo n8n, que é onde já moram o timer e a fila — aqui só se resolve
 * de qual número a mensagem sai.
 *
 * Uma instância por usuário. Sem isso os dois vendedores sairiam do mesmo
 * número, e a resposta do lead chegaria no telefone errado.
 *
 * Sem `EVOLUTION_URL` a tela de conexão some e o app segue como antes.
 */

const URL_BASE = (process.env.EVOLUTION_URL ?? "").trim().replace(/\/+$/, "");
const CHAVE = (process.env.EVOLUTION_API_KEY ?? "").trim();

export function evolutionConfigurada(): boolean {
  return !!URL_BASE && !!CHAVE;
}

/** open = conectado; connecting = esperando o QR; close = fora do ar. */
export type EstadoConexao = "open" | "connecting" | "close";

export type Conexao = {
  instancia: string;
  status: EstadoConexao;
  numero: string | null;
};

/** O QR para escanear, e o código de pareamento quando a Evolution manda. */
export type Qr = { base64: string | null; codigo: string | null };

type Resultado<T> = { ok: true; data: T } | { ok: false; erro: string };

function normalizarEstado(bruto: unknown): EstadoConexao {
  return bruto === "open" || bruto === "connecting" ? bruto : "close";
}

/**
 * Nome da instância a partir do id do usuário.
 *
 * Derivado, não sorteado: se a linha do banco sumir, o nome continua o
 * mesmo e a instância que já está no servidor é reaproveitada em vez de
 * virar órfã ocupando uma sessão.
 */
export function nomeInstancia(userId: string): string {
  return `lh-${userId.slice(0, 8)}`;
}

async function chamar<T>(
  caminho: string,
  init: RequestInit = {}
): Promise<Resultado<T>> {
  if (!evolutionConfigurada()) {
    return { ok: false, erro: "Evolution não configurada no servidor." };
  }

  try {
    const resposta = await fetch(`${URL_BASE}${caminho}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        apikey: CHAVE,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    const texto = await resposta.text();
    let corpo: unknown = null;
    try {
      corpo = texto ? JSON.parse(texto) : null;
    } catch {
      corpo = texto;
    }

    if (!resposta.ok) {
      // A Evolution devolve a explicação em `response.message` ou `message`.
      const c = corpo as Record<string, unknown> | null;
      const detalhe =
        (c?.response as Record<string, unknown> | undefined)?.message ??
        c?.message ??
        c?.error;
      const legivel = Array.isArray(detalhe)
        ? detalhe.join("; ")
        : typeof detalhe === "string"
          ? detalhe
          : `HTTP ${resposta.status}`;
      return { ok: false, erro: legivel };
    }

    return { ok: true, data: corpo as T };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "TimeoutError"
        ? "A Evolution não respondeu a tempo."
        : e instanceof Error
          ? e.message
          : "Falha ao falar com a Evolution.";
    return { ok: false, erro: msg };
  }
}

/**
 * Cria a instância. Se ela já existe, isso não é erro: é o caso normal de
 * quem clicou em conectar duas vezes, e o `connect` seguinte resolve.
 */
export async function criarInstancia(
  instancia: string
): Promise<Resultado<null>> {
  const r = await chamar<unknown>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: instancia,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });

  if (!r.ok && !/already in use|already exists|já existe/i.test(r.erro)) {
    return r as Resultado<null>;
  }
  return { ok: true, data: null };
}

/** O QR para escanear. Chame depois de `criarInstancia`. */
export async function qrDaInstancia(instancia: string): Promise<Resultado<Qr>> {
  const r = await chamar<Record<string, unknown>>(
    `/instance/connect/${encodeURIComponent(instancia)}`
  );
  if (!r.ok) return r;

  const d = r.data ?? {};
  const base64 = typeof d.base64 === "string" ? d.base64 : null;
  const codigo =
    typeof d.code === "string"
      ? d.code
      : typeof d.pairingCode === "string"
        ? d.pairingCode
        : null;

  return { ok: true, data: { base64, codigo } };
}

/** Estado atual da conexão, direto da Evolution. */
export async function estadoDaInstancia(
  instancia: string
): Promise<Resultado<EstadoConexao>> {
  const r = await chamar<Record<string, unknown>>(
    `/instance/connectionState/${encodeURIComponent(instancia)}`
  );
  if (!r.ok) {
    // Instância que ainda não existe não é falha: é "fora do ar".
    if (/not found|does not exist|não encontrad/i.test(r.erro)) {
      return { ok: true, data: "close" };
    }
    return r;
  }

  const inst = (r.data?.instance ?? r.data) as Record<string, unknown>;
  return { ok: true, data: normalizarEstado(inst?.state) };
}

/**
 * O número que atendeu ao QR.
 *
 * Vale para mostrar na tela qual WhatsApp está ligado — sem isso o vendedor
 * não tem como conferir se conectou o celular certo.
 */
export async function numeroDaInstancia(
  instancia: string
): Promise<string | null> {
  const r = await chamar<unknown>(
    `/instance/fetchInstances?instanceName=${encodeURIComponent(instancia)}`
  );
  if (!r.ok) return null;

  const lista = Array.isArray(r.data) ? r.data : [r.data];
  for (const item of lista) {
    const o = (item ?? {}) as Record<string, unknown>;
    const dentro = (o.instance ?? o) as Record<string, unknown>;
    const bruto = dentro?.owner ?? dentro?.number ?? dentro?.ownerJid;
    if (typeof bruto === "string") {
      const digitos = soDigitos(bruto.split("@")[0] ?? "");
      if (digitos) return digitos;
    }
  }
  return null;
}

/** Desliga o WhatsApp da instância, sem apagá-la. */
export async function desconectarInstancia(
  instancia: string
): Promise<Resultado<null>> {
  const r = await chamar<unknown>(
    `/instance/logout/${encodeURIComponent(instancia)}`,
    { method: "DELETE" }
  );
  if (!r.ok && !/not connected|already|não conectad/i.test(r.erro)) {
    return r as Resultado<null>;
  }
  return { ok: true, data: null };
}
