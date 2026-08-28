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
 * Um telefone plausível: 10 a 15 dígitos.
 *
 * O piso corta id de sessão curto e o teto corta os números compridos que
 * a Evolution usa como identificador interno de dispositivo.
 */
function pareceTelefone(digitos: string): boolean {
  return digitos.length >= 10 && digitos.length <= 15;
}

/**
 * Varre o objeto inteiro atrás do dono da instância.
 *
 * A busca é por FORMA, não por nome de campo: cada versão da Evolution
 * chama isso de um jeito (`owner`, `ownerJid`, `number`, `wuid`, dentro de
 * `instance`, dentro de `connectionState`...), e caçar nome por nome é
 * garantir que a próxima versão quebre de novo. Um JID de WhatsApp é
 * reconhecível — `5549999999999@s.whatsapp.net` — então procuro por isso.
 *
 * Mesmo padrão de `postsDe` em `instagram.ts`, e pela mesma razão.
 */
function garimparNumero(valor: unknown, fundo = 0): string | null {
  if (fundo > 6 || valor == null) return null;

  if (typeof valor === "string") {
    // JID: o número vem antes do @, e o sufixo confirma que é WhatsApp.
    if (valor.includes("@")) {
      const antes = valor.split("@")[0] ?? "";
      const d = soDigitos(antes);
      if (pareceTelefone(d)) return d;
      return null;
    }
    const d = soDigitos(valor);
    return pareceTelefone(d) && d === valor.trim() ? d : null;
  }

  if (Array.isArray(valor)) {
    for (const item of valor) {
      const achado = garimparNumero(item, fundo + 1);
      if (achado) return achado;
    }
    return null;
  }

  if (typeof valor === "object") {
    const o = valor as Record<string, unknown>;
    // Os nomes conhecidos primeiro: quando existem, são a resposta certa,
    // e evitam pegar um número de telefone que esteja em outro campo.
    for (const chave of ["ownerJid", "owner", "wuid", "number", "phone"]) {
      const achado = garimparNumero(o[chave], fundo + 1);
      if (achado) return achado;
    }
    for (const [chave, v] of Object.entries(o)) {
      if (["ownerJid", "owner", "wuid", "number", "phone"].includes(chave)) {
        continue;
      }
      const achado = garimparNumero(v, fundo + 1);
      if (achado) return achado;
    }
  }

  return null;
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
  if (r.ok) {
    const achado = garimparNumero(r.data);
    if (achado) return achado;
  }

  // Algumas versões não filtram por `instanceName` e devolvem tudo; outras
  // só expõem o dono no connectionState. Uma segunda tentativa é barata e
  // evita a tela dizer "Conectado" sem dizer qual número.
  const estado = await chamar<unknown>(
    `/instance/connectionState/${encodeURIComponent(instancia)}`
  );
  return estado.ok ? garimparNumero(estado.data) : null;
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
