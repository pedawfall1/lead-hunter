/**
 * Busca de imagens no Pexels.
 *
 * Por que Pexels e nao as fotos do Instagram do lead: as URLs do Instagram
 * sao assinadas e expiram em dias. A demo ficaria quebrada justo quando o
 * cliente resolvesse abrir o link. As do Pexels sao CDN estavel, entao dao
 * pra referenciar direto, sem baixar e sem storage.
 *
 * Falha em silencio de proposito: sem chave, sem resultado ou com a API
 * fora do ar, o site renderiza com gradiente e tipografia — que e como ele
 * ja funcionava. Imagem e melhoria, nao requisito.
 */

const CHAVE = process.env.PEXELS_API_KEY ?? "";

export function pexelsConfigurado(): boolean {
  return !!CHAVE;
}

export type ImagemSite = {
  /** versao grande, para o topo */
  url: string;
  /** versao media, para os cartoes */
  urlMedia: string;
  alt: string;
  autor: string;
  autorUrl: string;
  /** cor media da foto: pinta o espaco enquanto ela carrega */
  cor: string;
};

type FotoPexels = {
  id: number;
  alt: string | null;
  avg_color: string | null;
  photographer: string;
  photographer_url: string;
  src: { large2x?: string; large?: string; medium?: string; landscape?: string };
};

/* --------------------------- escolha da foto --------------------------- */

/**
 * Palavras que nao dizem nada sobre o assunto: aparecem em qualquer `alt` e
 * fariam qualquer foto "combinar" com qualquer busca.
 */
const VAZIAS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "with", "and", "or",
  "his", "her", "their", "photo", "image", "picture", "free", "stock",
  "person", "people", "man", "woman", "business", "professional", "modern",
]);

/**
 * O que o Pexels adora devolver e nao serve numa pagina de venda: foto de
 * catalogo de equipamento, esquema tecnico, coisa industrial. Foi assim que
 * uma clinica de estetica ganhou um autoclave no topo do site.
 */
const REPROVADAS = [
  "equipment", "machinery", "machine", "industrial", "factory", "laboratory",
  "diagram", "chart", "screenshot", "sign", "signage", "text", "logo",
  "circuit", "engine part", "warehouse",
];

function palavras(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Quanto esta foto tem a ver com a busca que a LLM escreveu.
 *
 * O `alt` do Pexels descreve a cena ("woman getting a facial treatment at a
 * spa"), entao cruzar as palavras da busca com ele separa a foto certa da
 * que so caiu no resultado por proximidade. Sem isto o servidor aceitava a
 * primeira que viesse.
 */
export function pontuar(alt: string, consulta: string): number {
  const texto = alt.toLowerCase();

  // Catalogo de equipamento reprova na hora, por melhor que seja o resto.
  if (REPROVADAS.some((r) => texto.includes(r))) return -1;

  // `alt` vazio nao e culpa da foto: aceita, mas fica atras de qualquer
  // uma que tenha combinado de verdade.
  if (!texto.trim()) return 0.5;

  const doAlt = new Set(palavras(texto));
  const daBusca = palavras(consulta).filter((p) => !VAZIAS.has(p));
  if (!daBusca.length) return 0.5;

  const acertos = daBusca.filter((p) => doAlt.has(p)).length;

  // Gente em cena vende mais que sala vazia — desempata a favor.
  const temGente = /\b(woman|man|person|people|client|customer|hands?)\b/.test(
    texto
  );

  return acertos / daBusca.length + (temGente ? 0.15 : 0);
}

/** Abaixo disto a foto tem pouco a ver com o pedido e fica de fora. */
const NOTA_MINIMA = 0.34;

async function buscarUma(consulta: string): Promise<FotoPexels[]> {
  const params = new URLSearchParams({
    query: consulta,
    // Pede mais do que vai usar: sobra material para o filtro descartar.
    per_page: "10",
    orientation: "landscape",
    size: "large",
  });

  const resposta = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { authorization: CHAVE },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!resposta.ok) return [];

  const dados = (await resposta.json()) as { photos?: FotoPexels[] };
  return dados.photos ?? [];
}

function converter(f: FotoPexels): ImagemSite | null {
  const grande = f.src.large2x ?? f.src.large ?? f.src.landscape;
  if (!grande) return null;
  return {
    url: grande,
    urlMedia: f.src.medium ?? f.src.large ?? grande,
    alt: f.alt ?? "",
    autor: f.photographer,
    autorUrl: f.photographer_url,
    cor: f.avg_color ?? "#334155",
  };
}

/**
 * Roda as consultas que a LLM escreveu e devolve as imagens sem repetir.
 *
 * As consultas vao em ingles porque o acervo do Pexels e indexado assim:
 * "barbearia" devolve muito menos e pior que "barber shop". Quem escreve
 * elas e a LLM, no campo `busca_imagens`, e a ordem tem papel: ambiente,
 * atendimento, detalhe.
 */
export async function buscarImagens(
  consultas: string[],
  quantidade = 4
): Promise<ImagemSite[]> {
  if (!CHAVE || !consultas.length) return [];

  try {
    // Uma consulta por vez, em paralelo. Se uma falhar, as outras valem.
    const listas = await Promise.all(
      consultas.slice(0, 3).map(async (consulta) => {
        const fotos = await buscarUma(consulta).catch(() => []);
        const notadas = fotos
          .map((f) => ({ f, nota: pontuar(f.alt ?? "", consulta) }))
          // Nota negativa e catalogo de equipamento: essa nunca volta, nem
          // no afrouxamento abaixo.
          .filter((x) => x.nota >= 0)
          .sort((a, b) => b.nota - a.nota);

        const boas = notadas.filter((x) => x.nota >= NOTA_MINIMA);

        // Se o corte nao deixou nada, fica com as duas melhores mesmo
        // abaixo da nota. Foto morna e melhor que buraco: sem isto,
        // apertar o filtro viraria "nunca mais teve imagem".
        return (boas.length ? boas : notadas.slice(0, 2)).map((x) => x.f);
      })
    );

    const vistas = new Set<number>();
    const imagens: ImagemSite[] = [];

    // Intercala: a melhor de cada consulta, depois a segunda de cada, e
    // assim por diante. Enfileirar consulta por consulta encheria a pagina
    // com tres fotos quase iguais da primeira busca — e a ordem das
    // consultas (ambiente, atendimento, detalhe) e justamente a ordem em
    // que as secoes da pagina querem as fotos.
    const maior = Math.max(...listas.map((l) => l.length), 0);
    for (let i = 0; i < maior && imagens.length < quantidade; i++) {
      for (const lista of listas) {
        const foto = lista[i];
        if (!foto || vistas.has(foto.id)) continue;
        vistas.add(foto.id);
        const img = converter(foto);
        if (img) imagens.push(img);
        if (imagens.length >= quantidade) break;
      }
    }

    return imagens;
  } catch {
    return [];
  }
}
