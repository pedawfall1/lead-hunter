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
};

/**
 * Entrada do actor de Google Maps. Os nomes seguem o
 * compass~crawler-google-places, que é o mais usado; outro actor pode
 * precisar de ajuste aqui.
 */
function entradaDoAtor(dados: { termo: string; local: string; limite: number }) {
  return {
    searchStringsArray: [dados.termo],
    locationQuery: dados.local,
    maxCrawledPlacesPerSearch: dados.limite,
    language: "pt-BR",
    skipClosedPlaces: true,
    scrapePlaceDetailPage: true,
  };
}

export async function iniciarCorrida(dados: {
  termo: string;
  local: string;
  limite: number;
}): Promise<Corrida> {
  if (!TOKEN) throw new Error("APIFY_TOKEN não configurado.");

  const r = await chamar<{
    data: { id: string; defaultDatasetId?: string; status: string };
  }>(`/acts/${ATOR}/runs`, {
    method: "POST",
    body: JSON.stringify(entradaDoAtor(dados)),
  });

  return {
    runId: r.data.id,
    datasetId: r.data.defaultDatasetId ?? null,
    status: traduzir(r.data.status),
  };
}

export async function estadoDaCorrida(runId: string): Promise<Corrida> {
  if (!TOKEN) throw new Error("APIFY_TOKEN não configurado.");

  const r = await chamar<{
    data: { id: string; defaultDatasetId?: string; status: string };
  }>(`/actor-runs/${runId}`);

  return {
    runId: r.data.id,
    datasetId: r.data.defaultDatasetId ?? null,
    status: traduzir(r.data.status),
  };
}

export async function itensDaCorrida(
  datasetId: string,
  limite: number
): Promise<LugarBruto[]> {
  if (!TOKEN) throw new Error("APIFY_TOKEN não configurado.");

  const itens = await chamar<LugarBruto[]>(
    `/datasets/${datasetId}/items?clean=true&format=json&limit=${Math.min(limite, 1000)}`
  );

  return Array.isArray(itens) ? itens : [];
}
