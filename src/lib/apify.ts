import type { LugarBruto } from "./mapas";

/**
 * Cliente do Apify, chamado direto pelo servidor do app.
 *
 * Raspagem leva minutos e função serverless não vive tanto, então o fluxo é
 * em duas partes: `iniciarCorrida` dispara e volta na hora com um id;
 * `estadoDaCorrida` e `itensDaCorrida` conferem depois. Nada aqui bloqueia
 * esperando o scraper terminar.
 */

const TOKEN = process.env.APIFY_TOKEN ?? "";

/** Actor de Google Maps. Trocável sem mexer no código. */
const ATOR = process.env.APIFY_ACTOR ?? "compass~crawler-google-places";

const BASE = "https://api.apify.com/v2";

export function apifyConfigurado(): boolean {
  return !!TOKEN;
}

export type StatusCorrida =
  | "rodando"
  | "concluida"
  | "erro";

/** Estados que o Apify devolve, traduzidos para os três que nos importam. */
function traduzir(status: string): StatusCorrida {
  if (status === "SUCCEEDED") return "concluida";
  if (["FAILED", "ABORTED", "TIMED-OUT", "TIMED_OUT"].includes(status))
    return "erro";
  return "rodando";
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const separador = caminho.includes("?") ? "&" : "?";
  const resposta = await fetch(`${BASE}${caminho}${separador}token=${TOKEN}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    const detalhe = corpo.slice(0, 200);
    if (resposta.status === 401 || resposta.status === 403) {
      throw new Error("Token do Apify recusado. Confira APIFY_TOKEN.");
    }
    if (resposta.status === 404) {
      throw new Error(`Actor "${ATOR}" não encontrado no Apify.`);
    }
    throw new Error(`Apify respondeu ${resposta.status}. ${detalhe}`);
  }

  return (await resposta.json()) as T;
}

export type Corrida = {
  runId: string;
  datasetId: string | null;
  status: StatusCorrida;
  /** o que o Apify diz sobre a corrida — vira a mensagem de erro na tela */
  recado: string | null;
};

export type OpcoesBusca = {
  termo: string;
  local: string;
  limite: number;
  /** filtra na origem: não gasta crédito com quem já tem site */
  soSemSite?: boolean;
  /** raspa o site do negócio atrás de e-mail e redes; custa mais por lugar */
  buscarContatos?: boolean;
};

/**
 * Entrada do actor de Google Maps.
 *
 * Os nomes seguem o compass~crawler-google-places. Campo opcional só entra
 * quando está ligado: actor costuma validar a entrada, e mandar chave que
 * ele não conhece é o jeito mais fácil de a corrida falhar na largada.
 */
function entradaDoAtor(dados: OpcoesBusca) {
  const entrada: Record<string, unknown> = {
    searchStringsArray: [dados.termo],
    locationQuery: dados.local,
    maxCrawledPlacesPerSearch: dados.limite,
    language: "pt-BR",
    skipClosedPlaces: true,
    scrapePlaceDetailPage: true,
  };

  if (dados.soSemSite) entrada.website = "withoutWebsite";
  if (dados.buscarContatos) entrada.scrapeContacts = true;

  return entrada;
}

export async function iniciarCorrida(dados: OpcoesBusca): Promise<Corrida> {
  if (!TOKEN) throw new Error("APIFY_TOKEN não configurado.");

  const r = await chamar<{
    data: {
      id: string;
      defaultDatasetId?: string;
      status: string;
      statusMessage?: string;
    };
  }>(`/acts/${ATOR}/runs`, {
    method: "POST",
    body: JSON.stringify(entradaDoAtor(dados)),
  });

  return {
    runId: r.data.id,
    datasetId: r.data.defaultDatasetId ?? null,
    status: traduzir(r.data.status),
    recado: r.data.statusMessage ?? null,
  };
}

/**
 * Actor de perfil do Instagram. Trocável sem mexer no código, igual ao de
 * mapas — o normalizador em `instagram.ts` aceita apelidos de campo, então
 * a maioria dos scrapers de perfil funciona sem ajuste.
 */
const ATOR_IG = process.env.APIFY_ACTOR_IG ?? "apify~instagram-profile-scraper";

/**
 * Dispara a leitura de um perfil.
 *
 * Mesmo vaivém do mapa: volta na hora com o id e quem acompanha é a tela.
 * Um perfil sozinho costuma levar de 15 a 40 segundos — mais do que uma
 * função serverless vive.
 */
export async function iniciarCorridaIg(usuario: string): Promise<Corrida> {
  if (!TOKEN) throw new Error("APIFY_TOKEN não configurado.");

  const limpo = usuario.trim().replace(/^@/, "");
  if (!limpo) throw new Error("Instagram vazio.");

  const r = await chamar<{
    data: {
      id: string;
      defaultDatasetId?: string;
      status: string;
      statusMessage?: string;
    };
  }>(`/acts/${ATOR_IG}/runs`, {
    method: "POST",
    body: JSON.stringify({ usernames: [limpo] }),
  });

  return {
    runId: r.data.id,
    datasetId: r.data.defaultDatasetId ?? null,
    status: traduzir(r.data.status),
    recado: r.data.statusMessage ?? null,
  };
}

export async function estadoDaCorrida(runId: string): Promise<Corrida> {
  if (!TOKEN) throw new Error("APIFY_TOKEN não configurado.");

  const r = await chamar<{
    data: {
      id: string;
      defaultDatasetId?: string;
      status: string;
      statusMessage?: string;
    };
  }>(`/actor-runs/${runId}`);

  return {
    runId: r.data.id,
    datasetId: r.data.defaultDatasetId ?? null,
    status: traduzir(r.data.status),
    recado: r.data.statusMessage ?? null,
  };
}

export async function itensDaCorrida(
  datasetId: string,
  limite: number
): Promise<LugarBruto[]> {
  return itensBrutos<LugarBruto>(datasetId, limite);
}

/** O mesmo dataset, sem presumir o formato de quem chamou. */
export async function itensBrutos<T>(
  datasetId: string,
  limite: number
): Promise<T[]> {
  if (!TOKEN) throw new Error("APIFY_TOKEN não configurado.");

  const itens = await chamar<T[]>(
    `/datasets/${datasetId}/items?clean=true&format=json&limit=${Math.min(limite, 1000)}`
  );

  return Array.isArray(itens) ? itens : [];
}
