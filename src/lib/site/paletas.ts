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
  /** o `<link>` do Google Fonts deste estilo, ou "" se não usar nenhuma */
  fontesLink: string;
  /** peso dos títulos: cada família pede um peso diferente para o mesmo peso visual */
  pesoTitulo: number;
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
 * Tipografia.
 *
 * A versão anterior usava só fonte de sistema, com medo de fonte externa
 * atrasar a página no 4G do cliente. O medo estava mal calibrado: com
 * `display=swap` o texto aparece na hora, na fonte de sistema, e troca
 * quando a outra chega — não existe momento em branco. E a fonte é o que
 * mais denuncia "template pronto": Arial no título entrega o jogo antes de
 * a pessoa ler a primeira palavra.
 *
 * Uma família por estilo, só os pesos usados, e a pilha de sistema fica de
 * fallback. Se o Google Fonts estiver fora do ar, a página sai como saía.
 */
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", "Iowan Old Style", serif';

function googleFonts(familias: string): string {
  return (
    `<link rel="preconnect" href="https://fonts.googleapis.com">` +
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${familias}&amp;display=swap">`
  );
}

/**
 * Cada estilo tem sua letra:
 * - escuro: Sora, geométrica e firme, boa em corpo grande
 * - claro: Plus Jakarta Sans, redonda e amigável
 * - elegante: Fraunces, serifada com contraste alto
 *
 * O corpo é Inter nos três: ela some, que é o trabalho de uma fonte de
 * texto. Quem carrega a personalidade é o título.
 */
const TIPOGRAFIA: Record<
  Estilo,
  { titulo: string; corpo: string; link: string; peso: number }
> = {
  escuro: {
    titulo: `Sora, ${SANS}`,
    corpo: `Inter, ${SANS}`,
    link: googleFonts("family=Sora:wght@600;700&family=Inter:wght@400;500;600"),
    peso: 700,
  },
  claro: {
    titulo: `"Plus Jakarta Sans", ${SANS}`,
    corpo: `Inter, ${SANS}`,
    link: googleFonts(
      "family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600"
    ),
    peso: 800,
  },
  elegante: {
    titulo: `Fraunces, ${SERIF}`,
    corpo: `Inter, ${SANS}`,
    link: googleFonts(
      "family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600"
    ),
    peso: 600,
  },
};

/** "#RGB" ou "#RRGGBB" -> os três canais. Devolve null se não for cor. */
function canais(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, "");
  const cheio =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-f]{6}$/i.test(cheio)) return null;
  return [
    parseInt(cheio.slice(0, 2), 16),
    parseInt(cheio.slice(2, 4), 16),
    parseInt(cheio.slice(4, 6), 16),
  ];
}

export function ehCorValida(hex: string | null | undefined): boolean {
  return !!hex && canais(hex) !== null;
}

/**
 * Preto ou branco sobre esta cor?
 *
 * Luminância relativa da WCAG. Sem isto, escolher a cor da marca pelo
 * Instagram traria texto branco sobre amarelo — ilegível justo no botão
 * principal, que é o único lugar da página que precisa ser clicado.
 */
function textoSobre(hex: string): string {
  const rgb = canais(hex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luz = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luz > 0.45 ? "#111111" : "#ffffff";
}

/** Normaliza para "#rrggbb", ou null se não for cor. */
export function normalizarCor(hex: string | null | undefined): string | null {
  const rgb = canais(String(hex ?? ""));
  if (!rgb) return null;
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * O estilo define o "chão" (fundo, texto, tipografia) e a paleta define a
 * marca. Seis paletas × três estilos = dezoito caras diferentes, sem
 * dezoito templates para manter.
 *
 * `corMarca` atropela a paleta: é a cor que você pegou do Instagram do
 * cliente quando o palpite da LLM não bateu com a marca real.
 */
export function cores(
  paleta: Paleta,
  estilo: Estilo,
  corMarca?: string | null
): Cores {
  const escolhida = normalizarCor(corMarca);
  if (escolhida) {
    const base = cores(paleta, estilo);
    return { ...base, marca: escolhida, marcaTexto: textoSobre(escolhida) };
  }

  const marca = MARCAS[paleta] ?? MARCAS.sobrio_azul;
  const t = TIPOGRAFIA[estilo] ?? TIPOGRAFIA.escuro;
  const letra = {
    fonteTitulo: t.titulo,
    fonteCorpo: t.corpo,
    fontesLink: t.link,
    pesoTitulo: t.peso,
  };

  if (estilo === "escuro") {
    return {
      fundo: "#0b1017",
      superficie: "#141b26",
      borda: "#243040",
      texto: "#f1f5f9",
      suave: "#94a3b8",
      marca: marca.escuro,
      marcaTexto: "#0b1017",
      ...letra,
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
      ...letra,
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
    ...letra,
  };
}
