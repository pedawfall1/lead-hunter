import type { ImagemSite } from "./pexels";

/**
 * O contrato com a LLM.
 *
 * A regra que faz esta feature ser barata: a LLM escreve SÓ texto, nunca
 * HTML. Um institucional inteiro gastaria ~20k tokens de saída e sairia
 * diferente a cada geração; este JSON gasta ~1,5k e o layout é sempre o
 * mesmo, porque quem monta a página é `render.ts`.
 *
 * Nada que o app já sabe entra aqui. Telefone, endereço e @ do Instagram
 * vão direto do lead para o template: gastar token para a LLM copiar um
 * telefone é pagar para ela errar um dígito.
 */

/** Paletas prontas. A LLM escolhe uma pelo nicho; as cores são nossas. */
export const PALETAS = [
  "sobrio_azul",
  "preto_dourado",
  "verde_natural",
  "quente_terra",
  "clinico_claro",
  "vibrante_roxo",
] as const;

export type Paleta = (typeof PALETAS)[number];

/** Três caras diferentes para a mesma estrutura, para não parecer fôrma. */
export const ESTILOS = ["escuro", "claro", "elegante"] as const;

export type Estilo = (typeof ESTILOS)[number];

/**
 * A estrutura da página, não só a cor.
 *
 * Paleta e estilo mudam pintura e tipografia, mas a planta continuava a
 * mesma para todo mundo — e duas demos lado a lado se denunciavam. O
 * layout muda o topo, que é a parte que a pessoa vê primeiro.
 *
 * - `classico`: topo largo com a foto ao fundo, sob véu escuro
 * - `dividido`: texto de um lado, foto do outro, sem véu
 * - `centrado`: sem foto no topo, texto no meio e a foto logo abaixo
 */
export const LAYOUTS = ["classico", "dividido", "centrado"] as const;

export type Layout = (typeof LAYOUTS)[number];

export type ServicoSite = {
  nome: string;
  descricao: string;
};

/** Um passo do "como funciona". Tira a dúvida de quem nunca contratou. */
export type PassoSite = {
  titulo: string;
  texto: string;
};

/**
 * Pergunta frequente do ramo.
 *
 * Repare que isto não viola a regra de não inventar fato: são as dúvidas
 * que qualquer cliente daquele setor tem ("precisa agendar?", "atendem no
 * fim de semana?"), respondidas sem citar número, prazo ou preço que a LLM
 * não teria como saber.
 */
export type PerguntaSite = {
  pergunta: string;
  resposta: string;
};

export type ConteudoSite = {
  /** nome como deve aparecer no topo, sem Ltda/ME */
  titulo: string;
  /** o h1. Curto: é a primeira coisa que o cliente lê */
  chamada: string;
  subchamada: string;
  sobre_titulo: string;
  /** dois parágrafos */
  sobre: string[];
  servicos_titulo: string;
  servicos: ServicoSite[];
  diferenciais: string[];
  passos_titulo: string;
  passos: PassoSite[];
  faq: PerguntaSite[];
  cta_titulo: string;
  cta_texto: string;
  cta_botao: string;
  paleta: Paleta;
  estilo: Estilo;
  layout: Layout;
  /**
   * Cor da marca escolhida a mao, no editor da aba Demo. Atropela a
   * paleta: e a cor tirada do Instagram do cliente quando o palpite da
   * LLM nao bateu. A LLM nao preenche este campo.
   */
  cor_marca?: string | null;
  /** 2 a 3 buscas EM INGLES para o Pexels; ver pexels.ts */
  busca_imagens: string[];
  /**
   * Preenchido no servidor depois da LLM, nao por ela: a LLM nao ve o
   * acervo do Pexels e inventaria URL que nao existe.
   */
  imagens?: ImagemSite[];
};

/**
 * JSON Schema para o Structured Outputs da OpenAI (`strict: true`).
 *
 * Sem isto, uma geração em cada poucas dezenas volta com JSON inválido ou
 * campo faltando — e você só descobre quando o link já foi pro cliente.
 * Modo strict exige `additionalProperties: false` e todos os campos em
 * `required`; os limites de tamanho ficam no prompt, não aqui.
 */
export const ESQUEMA_CONTEUDO = {
  type: "object",
  additionalProperties: false,
  required: [
    "titulo",
    "chamada",
    "subchamada",
    "sobre_titulo",
    "sobre",
    "servicos_titulo",
    "servicos",
    "diferenciais",
    "passos_titulo",
    "passos",
    "faq",
    "cta_titulo",
    "cta_texto",
    "cta_botao",
    "paleta",
    "estilo",
    "layout",
    "busca_imagens",
  ],
  properties: {
    titulo: { type: "string" },
    chamada: { type: "string" },
    subchamada: { type: "string" },
    sobre_titulo: { type: "string" },
    sobre: { type: "array", items: { type: "string" } },
    servicos_titulo: { type: "string" },
    servicos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "descricao"],
        properties: {
          nome: { type: "string" },
          descricao: { type: "string" },
        },
      },
    },
    diferenciais: { type: "array", items: { type: "string" } },
    passos_titulo: { type: "string" },
    passos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "texto"],
        properties: {
          titulo: { type: "string" },
          texto: { type: "string" },
        },
      },
    },
    faq: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pergunta", "resposta"],
        properties: {
          pergunta: { type: "string" },
          resposta: { type: "string" },
        },
      },
    },
    cta_titulo: { type: "string" },
    cta_texto: { type: "string" },
    cta_botao: { type: "string" },
    paleta: { type: "string", enum: [...PALETAS] },
    estilo: { type: "string", enum: [...ESTILOS] },
    layout: { type: "string", enum: [...LAYOUTS] },
    busca_imagens: { type: "array", items: { type: "string" } },
  },
} as const;

/**
 * A LLM erra tamanho e quantidade mesmo com o prompt pedindo — schema não
 * valida `maxLength`. Aparar aqui é mais barato que insistir no prompt, e
 * garante que o template nunca receba um array vazio ou um h1 de 300
 * caracteres que estoura o hero no celular.
 */
export function saneiarConteudo(c: ConteudoSite): ConteudoSite {
  const corta = (v: unknown, max: number) =>
    String(v ?? "").trim().slice(0, max);

  return {
    titulo: corta(c.titulo, 60),
    chamada: corta(c.chamada, 90),
    subchamada: corta(c.subchamada, 160),
    sobre_titulo: corta(c.sobre_titulo, 60),
    sobre: (c.sobre ?? []).slice(0, 3).map((p) => corta(p, 600)).filter(Boolean),
    servicos_titulo: corta(c.servicos_titulo, 60),
    servicos: (c.servicos ?? [])
      .slice(0, 6)
      .map((s) => ({
        nome: corta(s?.nome, 48),
        descricao: corta(s?.descricao, 220),
      }))
      .filter((s) => s.nome),
    diferenciais: (c.diferenciais ?? [])
      .slice(0, 4)
      .map((d) => corta(d, 70))
      .filter(Boolean),
    passos_titulo: corta(c.passos_titulo, 60),
    passos: (c.passos ?? [])
      .slice(0, 4)
      .map((x) => ({ titulo: corta(x?.titulo, 40), texto: corta(x?.texto, 160) }))
      .filter((x) => x.titulo),
    faq: (c.faq ?? [])
      .slice(0, 5)
      .map((x) => ({
        pergunta: corta(x?.pergunta, 110),
        resposta: corta(x?.resposta, 320),
      }))
      .filter((x) => x.pergunta && x.resposta),
    cta_titulo: corta(c.cta_titulo, 70),
    cta_texto: corta(c.cta_texto, 200),
    cta_botao: corta(c.cta_botao, 40),
    paleta: PALETAS.includes(c.paleta) ? c.paleta : "sobrio_azul",
    estilo: ESTILOS.includes(c.estilo) ? c.estilo : "escuro",
    layout: LAYOUTS.includes(c.layout) ? c.layout : "classico",
    busca_imagens: (c.busca_imagens ?? [])
      .slice(0, 3)
      .map((q) => corta(q, 60))
      .filter(Boolean),
    imagens: c.imagens,
    cor_marca: c.cor_marca,
  };
}
