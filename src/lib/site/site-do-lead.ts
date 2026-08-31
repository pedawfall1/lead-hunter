const LIMITE_TEXTO = 6_000;

export type LeituraDoSite = {
  conteudo: Record<string, unknown> | null;
  erro: string | null;
};

function textoLegivel(html: string): string {
  const corpo = html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] ?? html;
  const semElementosOcultos = corpo
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ");

  return semElementosOcultos
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITE_TEXTO);
}

/**
 * Lê o texto visível do site próprio do negócio sem deixar uma página lenta
 * ou indisponível interromper a geração da demo.
 */
export async function lerSiteDoLead(url: string): Promise<LeituraDoSite> {
  let resposta: Response;

  try {
    resposta = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (erro) {
    if (erro instanceof Error && erro.name === "TimeoutError") {
      return { conteudo: null, erro: "O site demorou demais para responder." };
    }
    return { conteudo: null, erro: "Não foi possível acessar o site." };
  }

  if (!resposta.ok) {
    return { conteudo: null, erro: `O site respondeu ${resposta.status}.` };
  }

  const texto = textoLegivel(await resposta.text());
  if (!texto) {
    return { conteudo: null, erro: "Não encontrei texto legível no site." };
  }

  return { conteudo: { texto }, erro: null };
}
