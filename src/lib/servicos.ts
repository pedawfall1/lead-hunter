import type { Criterio } from "./types";

/**
 * Catálogo de serviços e os sinais que qualificam um lead para cada um.
 *
 * Isto é só o ponto de partida: ao criar o projeto os critérios são copiados
 * para dentro dele (projetos.criterios), então dá pra marcar, desmarcar e
 * escrever critérios próprios sem mexer neste arquivo.
 */
export type Servico = {
  chave: string;
  label: string;
  /** frase curta pra lembrar o que esse projeto está vendendo */
  resumo: string;
  criterios: Criterio[];
};

/** Sinais que valem para qualquer serviço — presença digital básica. */
export const CRITERIOS_GERAIS: Criterio[] = [
  { chave: "sem_google_negocio", label: "Sem Google Meu Negócio" },
  { chave: "gmn_sem_foto", label: "Perfil do Google sem foto" },
  { chave: "nota_baixa", label: "Nota abaixo de 4" },
  { chave: "poucas_avaliacoes", label: "Menos de 10 avaliações" },
  { chave: "nao_responde_avaliacao", label: "Não responde avaliações" },
];

export const SERVICOS: Servico[] = [
  {
    chave: "site",
    label: "Site / Landing page",
    resumo: "Presença própria fora das redes",
    criterios: [
      { chave: "sem_site", label: "Não tem site" },
      { chave: "site_desatualizado", label: "Site desatualizado" },
      { chave: "site_sem_whats", label: "Site sem WhatsApp" },
      { chave: "site_nao_mobile", label: "Não abre bem no celular" },
      { chave: "so_linktree", label: "Usa só link na bio" },
    ],
  },
  {
    chave: "trafego",
    label: "Tráfego pago",
    resumo: "Anúncios em Google e Meta",
    criterios: [
      { chave: "nao_anuncia", label: "Não anuncia hoje" },
      { chave: "concorrente_anuncia", label: "Concorrente anuncia" },
      { chave: "sem_pagina_captura", label: "Sem página de captura" },
      { chave: "sem_pixel", label: "Sem pixel instalado" },
      { chave: "anuncio_amador", label: "Anúncio mal feito" },
    ],
  },
  {
    chave: "social",
    label: "Social mídia",
    resumo: "Conteúdo e gestão de redes",
    criterios: [
      { chave: "sem_instagram", label: "Sem Instagram" },
      { chave: "parado_30d", label: "Sem post há 30 dias" },
      { chave: "poucos_seguidores", label: "Menos de 500 seguidores" },
      { chave: "sem_padrao_visual", label: "Feed sem padrão visual" },
      { chave: "nao_responde_direct", label: "Não responde direct" },
    ],
  },
  {
    chave: "aplicacoes",
    label: "Aplicações / Sistemas",
    resumo: "Automação e software sob medida",
    criterios: [
      { chave: "controle_no_papel", label: "Controla tudo no papel" },
      { chave: "sem_agendamento", label: "Sem agendamento online" },
      { chave: "so_marketplace", label: "Vende só por marketplace" },
      { chave: "processo_manual", label: "Processo manual repetitivo" },
      { chave: "sem_integracao", label: "Sistemas que não conversam" },
    ],
  },
];

export function acharServico(chave: string | null | undefined): Servico | null {
  if (!chave) return null;
  return SERVICOS.find((s) => s.chave === chave) ?? null;
}

/** Critérios sugeridos ao escolher um serviço: os dele + os gerais. */
export function criteriosSugeridos(chave: string | null | undefined): Criterio[] {
  const s = acharServico(chave);
  return [...(s?.criterios ?? []), ...CRITERIOS_GERAIS];
}

/** Quantos critérios do projeto esse lead dispara. */
export function contarSinais(
  sinais: Record<string, boolean> | null | undefined,
  criterios: Criterio[]
): number {
  if (!sinais) return 0;
  if (!criterios.length) {
    return Object.values(sinais).filter(Boolean).length;
  }
  return criterios.filter((c) => sinais[c.chave]).length;
}

/** Lista os rótulos dos sinais ativos, na ordem dos critérios do projeto. */
export function rotulosDosSinais(
  sinais: Record<string, boolean> | null | undefined,
  criterios: Criterio[]
): string[] {
  if (!sinais) return [];
  const conhecidos = criterios.filter((c) => sinais[c.chave]).map((c) => c.label);
  const catalogo = [...SERVICOS.flatMap((s) => s.criterios), ...CRITERIOS_GERAIS];
  const extras = Object.keys(sinais)
    .filter((k) => sinais[k] && !criterios.some((c) => c.chave === k))
    .map((k) => catalogo.find((c) => c.chave === k)?.label ?? k);
  return [...conhecidos, ...extras];
}

/**
 * Como cada sinal vira frase dentro da mensagem, na variável {motivo}.
 * "Oi Fulano, vi que vocês atendem no Centro e reparei que {motivo}"
 *              -> "...reparei que não encontrei o site de vocês"
 */
export const MOTIVOS: Record<string, string> = {
  // site
  sem_site: "não encontrei o site de vocês",
  site_desatualizado: "o site de vocês está bem desatualizado",
  site_sem_whats: "o site de vocês não tem um botão de WhatsApp",
  site_nao_mobile: "o site de vocês fica meio quebrado no celular",
  so_linktree: "vocês usam só o link na bio, sem site próprio",
  // tráfego
  nao_anuncia: "vocês não aparecem nos anúncios da região",
  concorrente_anuncia: "os concorrentes de vocês estão anunciando e vocês não",
  sem_pagina_captura: "vocês não têm uma página pra captar contato",
  sem_pixel: "o site de vocês não está medindo quem visita",
  anuncio_amador: "dá pra melhorar bastante o anúncio de vocês",
  // social
  sem_instagram: "não achei o Instagram de vocês",
  parado_30d: "o Instagram de vocês está parado faz um tempo",
  poucos_seguidores: "o Instagram de vocês ainda tem pouco alcance",
  sem_padrao_visual: "o feed de vocês ainda não tem uma identidade",
  nao_responde_direct: "vi que os directs de vocês ficam sem resposta",
  // aplicações
  controle_no_papel: "vocês ainda controlam tudo na mão",
  sem_agendamento: "não dá pra agendar com vocês pela internet",
  so_marketplace: "vocês dependem só do marketplace pra vender",
  processo_manual: "tem um processo aí que dá pra automatizar",
  sem_integracao: "os sistemas de vocês não conversam entre si",
  // gerais
  sem_google_negocio: "vocês não aparecem no Google Maps",
  gmn_sem_foto: "o perfil de vocês no Google está sem fotos",
  nota_baixa: "a nota de vocês no Google está abaixo do que merecem",
  poucas_avaliacoes: "vocês têm pouquíssimas avaliações no Google",
  nao_responde_avaliacao: "as avaliações de vocês ficam sem resposta",
};

/**
 * A frase do primeiro sinal ativo, seguindo a ordem dos critérios do projeto
 * (o mais relevante primeiro). É o que entra em {motivo}.
 */
export function motivoDoLead(
  sinais: Record<string, boolean> | null | undefined,
  criterios: Criterio[]
): string {
  if (!sinais) return "";
  const ordenados = [
    ...criterios.map((c) => c.chave),
    ...Object.keys(sinais),
  ];
  for (const chave of ordenados) {
    if (!sinais[chave]) continue;
    const frase = MOTIVOS[chave];
    if (frase) return frase;
    const label = criterios.find((c) => c.chave === chave)?.label;
    if (label) return label.toLowerCase();
  }
  return "";
}
