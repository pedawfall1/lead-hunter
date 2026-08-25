import type { Estilo, Paleta } from "./tipos";

/**
 * As cores são nossas, não da LLM.
 *
 * A LLM escolhe um nome de paleta e um estilo; o par vira este conjunto de
 * cores. Pedir hex para a LLM seria uma linha a menos de código e um site
 * feio a cada três gerações — cinza sobre cinza, texto que não lê, marca
 * que some no fundo. Aqui o contraste já está resolvido de antemão.
 */

export type Cores = {
  fundo: string;
  superficie: string;
  borda: string;
  texto: string;
  suave: string;
  marca: string;
  /** cor do texto EM CIMA da marca */
  marcaTexto: string;
  /** família tipográfica do título */
  fonteTitulo: string;
  fonteCorpo: string;
};

/** O tom de cada paleta: o que muda entre um ramo e outro. */
const MARCAS: Record<Paleta, { claro: string; escuro: string }> = {
  sobrio_azul: { claro: "#1d4ed8", escuro: "#60a5fa" },
  preto_dourado: { claro: "#a16207", escuro: "#e0b44a" },
  verde_natural: { claro: "#15803d", escuro: "#4ade80" },
  quente_terra: { claro: "#c2410c", escuro: "#fb923c" },
  clinico_claro: { claro: "#0e7490", escuro: "#22d3ee" },
  vibrante_roxo: { claro: "#7c3aed", escuro: "#a78bfa" },
};

/*
 * Pilhas de fonte do sistema, sem Google Fonts de propósito: a página é
 * aberta pelo celular do dono do negócio, muitas vezes em 4G ruim, e fonte
 * externa é a diferença entre carregar em 1s e piscar em branco por 3s.
 */
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", "Iowan Old Style", serif';

/**
 * O estilo define o "chão" (fundo, texto, tipografia) e a paleta define a
 * marca. Seis paletas × três estilos = dezoito caras diferentes, sem
 * dezoito templates para manter.
 */
export function cores(paleta: Paleta, estilo: Estilo): Cores {
  const marca = MARCAS[paleta] ?? MARCAS.sobrio_azul;

  if (estilo === "escuro") {
    return {
      fundo: "#0b1017",
      superficie: "#141b26",
      borda: "#243040",
      texto: "#f1f5f9",
      suave: "#94a3b8",
      marca: marca.escuro,
      marcaTexto: "#0b1017",
      fonteTitulo: SANS,
      fonteCorpo: SANS,
    };
  }

  if (estilo === "elegante") {
    return {
      fundo: "#faf7f2",
      superficie: "#f2ece2",
      borda: "#e0d6c6",
      texto: "#1c1917",
      suave: "#6b6259",
      marca: marca.claro,
      marcaTexto: "#ffffff",
      fonteTitulo: SERIF,
      fonteCorpo: SANS,
    };
  }

  return {
    fundo: "#ffffff",
    superficie: "#f6f8fa",
    borda: "#e2e8f0",
    texto: "#0f172a",
    suave: "#64748b",
    marca: marca.claro,
    marcaTexto: "#ffffff",
    fonteTitulo: SANS,
    fonteCorpo: SANS,
  };
}
