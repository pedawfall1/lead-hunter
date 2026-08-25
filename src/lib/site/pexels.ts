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

async function buscarUma(consulta: string, quantas: number): Promise<FotoPexels[]> {
  const params = new URLSearchParams({
    query: consulta,
    per_page: String(Math.min(quantas, 20)),
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
 * elas e a LLM, no campo `busca_imagens`.
 */
export async function buscarImagens(
  consultas: string[],
  quantidade = 4
): Promise<ImagemSite[]> {
  if (!CHAVE || !consultas.length) return [];

  try {
    // Uma consulta por vez, em paralelo. Se uma falhar, as outras valem.
    const listas = await Promise.all(
      consultas.slice(0, 3).map((c) => buscarUma(c, 3).catch(() => []))
    );

    const vistas = new Set<number>();
    const imagens: ImagemSite[] = [];

    // Intercala: pega a 1a de cada consulta, depois a 2a, e assim por
    // diante. Enfileirar consulta por consulta encheria a pagina com tres
    // fotos quase iguais da primeira busca.
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
