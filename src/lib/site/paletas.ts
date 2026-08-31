import type { Estilo, Paleta, Tom } from "./tipos";

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
  /** o `<link>` do Google Fonts deste tom, ou "" se não usar nenhuma */
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
 * Uma família por tom, só os pesos usados, e a pilha de sistema fica de
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
 * A letra sai do **tom**, não do estilo. Esta é a diferença que faz um
 * escritório de advocacia não sair irmão de uma clínica de estética.
 *
 * Antes a fonte vinha do estilo (claro/escuro/elegante). O estilo é só a
 * luz da página — e como a LLM escolhia estilo quase por sorteio, dois
 * ramos opostos que caíssem em "claro" saíam com a mesma tipografia, o
 * mesmo fundo branco e a mesma cara. Cor e cantos mudavam, mas o olho não
 * vê 8px contra 22px de raio; vê a letra do título, que é a primeira coisa
 * que denuncia o ramo.
 *
 * Agora o tom manda na letra e o estilo manda no chão. As duas coisas são
 * independentes de verdade, como deviam ser desde o começo.
 *
 * - sobrio: Lora, serifada e séria. Advocacia com serifa lê como escritório
 * - caloroso: Plus Jakarta Sans, redonda e acolhedora
 * - robusto: Archivo, larga e sólida — casa com a caixa alta do tom
 * - tecnico: Sora, geométrica e precisa
 *
 * O corpo é Inter nos quatro: ela some, que é o trabalho de uma fonte de
 * texto. Quem carrega a personalidade é o título.
 */
const TIPOGRAFIA: Record<
  Tom,
  { titulo: string; corpo: string; link: string; peso: number }
> = {
  sobrio: {
    titulo: `"Crimson Pro", ${SERIF}`,
    corpo: `Inter, ${SANS}`,
    link: googleFonts(
      "family=Crimson+Pro:wght@600;700&family=Inter:wght@400;500;600"
    ),
    peso: 700,
  },
  caloroso: {
    titulo: `"Plus Jakarta Sans", ${SANS}`,
    corpo: `Inter, ${SANS}`,
    link: googleFonts(
      "family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600"
    ),
    peso: 800,
  },
  robusto: {
    titulo: `Archivo, ${SANS}`,
    corpo: `Inter, ${SANS}`,
    link: googleFonts(
      "family=Archivo:wght@700;800&family=Inter:wght@400;500;600"
    ),
    peso: 800,
  },
  tecnico: {
    titulo: `Sora, ${SANS}`,
    corpo: `Inter, ${SANS}`,
    link: googleFonts("family=Sora:wght@600;700&family=Inter:wght@400;500;600"),
    peso: 700,
  },
};

/**
 * A forma que cada temperamento dá à página.
 *
 * É aqui que mecânica deixa de parecer clínica de estética. Cor e letra já
 * mudavam; o que denunciava era a geometria — todo mundo com o mesmo canto
 * arredondado, a mesma sombra, o mesmo respiro.
 */
export type Forma = {
  /** cantos: 0 é seco e industrial, 22 é acolhedor */
  raio: number;
  raioCard: number;
  /** borda grossa lê como robusto; fina, como refinado */
  borda: number;
  /** sombra difusa dá leveza; sem sombra dá peso */
  sombra: string;
  /** título de seção em caixa alta muda o tom antes de a pessoa ler */
  caixaAlta: boolean;
  /** multiplicador do espaçamento vertical */
  respiro: number;
  /**
   * Multiplicador do tamanho dos títulos.
   *
   * Quem vende pelo olho grita; quem vende confiança fala baixo. Um título
   * de advocacia do mesmo tamanho do de uma clínica de estética soa como
   * anúncio, e advogado não anuncia.
   */
  escalaTitulo: number;
  /** quantas fotos a página pede ao Pexels */
  fotos: number;
  /**
   * O tratamento "editorial de escritório": borda de cartão, moldura e
   * quadro tingida na cor da marca em vez de cinza neutro, CTA do topo
   * contornado em vez de preenchido, menu em caixa alta rastreada, e um
   * selo em losango com a inicial ao lado do nome no cabeçalho.
   *
   * Só `sobrio` liga isto — é o que aproxima advocacia/contabilidade do
   * institucional "preto e dourado" sem tocar nos outros temperamentos.
   */
  refinado: boolean;
};

export const FORMAS: Record<Tom, Forma> = {
  sobrio: {
    raio: 8,
    raioCard: 10,
    borda: 1,
    sombra: "0 18px 36px -30px rgba(0,0,0,.5)",
    caixaAlta: false,
    respiro: 1.15,
    escalaTitulo: 0.86,
    // Advocacia com galeria de fotos parece imobiliária. Duas bastam.
    fotos: 2,
    refinado: true,
  },
  caloroso: {
    raio: 22,
    raioCard: 22,
    borda: 1,
    sombra: "0 26px 50px -30px rgba(0,0,0,.45)",
    caixaAlta: false,
    respiro: 1,
    escalaTitulo: 1.08,
    // Estética e restaurante vendem pelo olho: quanto mais foto, melhor.
    fotos: 5,
    refinado: false,
  },
  robusto: {
    raio: 3,
    raioCard: 4,
    borda: 2,
    // Sem sombra: bloco sólido, sem leveza. É oficina, não spa.
    sombra: "none",
    caixaAlta: true,
    respiro: 0.9,
    escalaTitulo: 1,
    fotos: 4,
    refinado: false,
  },
  tecnico: {
    raio: 12,
    raioCard: 14,
    borda: 1,
    sombra: "0 20px 40px -28px rgba(0,0,0,.5)",
    caixaAlta: false,
    respiro: 1,
    escalaTitulo: 0.94,
    fotos: 4,
    refinado: false,
  },
};

export function forma(tom: Tom): Forma {
  return FORMAS[tom] ?? FORMAS.tecnico;
}

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
 * O estilo define o "chão" (fundo e texto), o tom define a letra e a
 * paleta define a marca. Seis paletas × três estilos × quatro tons, sem
 * setenta e dois templates para manter.
 *
 * `corMarca` atropela a paleta: é a cor que você pegou do Instagram do
 * cliente quando o palpite da LLM não bateu com a marca real.
 */
export function cores(
  paleta: Paleta,
  estilo: Estilo,
  corMarca?: string | null,
  tom: Tom = "tecnico"
): Cores {
  const escolhida = normalizarCor(corMarca);
  if (escolhida) {
    const base = cores(paleta, estilo, null, tom);
    return { ...base, marca: escolhida, marcaTexto: textoSobre(escolhida) };
  }

  const marca = MARCAS[paleta] ?? MARCAS.sobrio_azul;
  const t = TIPOGRAFIA[tom] ?? TIPOGRAFIA.tecnico;
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
