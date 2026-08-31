import type { PerfilInstagram } from "./instagram";
import type { ConteudoSite } from "./site/tipos";

export const STATUS = [
  "novo",
  "contatado",
  "respondeu",
  "negociando",
  "fechou",
  "descartado",
] as const;

export type LeadStatus = (typeof STATUS)[number];

/** Um sinal de qualificação: o motivo pelo qual esse lead precisa do que você vende. */
export type Criterio = {
  chave: string;
  label: string;
};

/** Quais critérios o lead dispara. Só guardamos os verdadeiros. */
export type Sinais = Record<string, boolean>;

export type Projeto = {
  id: string;
  nome: string;
  nicho: string | null;
  regiao: string | null;
  servico: string | null;
  criterios: Criterio[];
  criado_em: string;
};

export type ProjetoComContagem = Projeto & { total_leads: number };

export type Lead = {
  id: string;
  projeto_id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  email: string | null;
  /** null quando o lead nao tem site, ou quando o scraper so achou o link do proprio Google Maps */
  site_url: string | null;
  sinais: Sinais;
  status: LeadStatus;
  nota: string | null;
  proximo_contato: string | null;
  /** o perfil do Instagram lido pelo scraper; null se nunca foi analisado */
  ig_dados: PerfilInstagram | null;
  /** corrida do Apify em andamento; null quando nao ha nenhuma */
  ig_run_id: string | null;
  ig_em: string | null;
  ig_erro: string | null;
  /** o item cru do scraper, para conferir que campos ele devolveu */
  ig_bruto: Record<string, unknown> | null;
  /**
   * Identidade da ficha do lead no Google. Vem da busca no Maps, serve
   * para deduplicar a importacao e para abrir a ficha exata em um clique.
   */
  place_id: string | null;
  /** nota do Google (1 a 5), quando o lead veio da busca no Maps */
  google_nota: number | null;
  google_avaliacoes: number | null;
  /**
   * Quem cuida deste lead. Nulo = da equipe, ninguem pegou ainda.
   *
   * O banco preenche com quem importou (`default auth.uid()`), entao o
   * lead ja nasce com dono e ninguem precisa distribuir na mao.
   */
  responsavel_id: string | null;
  /** coordenadas para o mapa; nulas ate alguem geocodificar o endereco */
  lat: number | null;
  lng: number | null;
  /** conteudo lido do site do lead, para alimentar demo e abordagem */
  site_conteudo: Record<string, unknown> | null;
  site_em: string | null;
  site_erro: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const TIPOS_INTERACAO = [
  "whatsapp",
  "ligacao",
  "visita",
  "email",
  "nota",
] as const;

export type TipoInteracao = (typeof TIPOS_INTERACAO)[number];

export type Interacao = {
  id: string;
  lead_id: string;
  tipo: TipoInteracao;
  /** "saida" = você mandou; "entrada" = o lead respondeu */
  direcao: "saida" | "entrada";
  texto: string | null;
  template_id: string | null;
  /** id da mensagem na Evolution, quando o disparo passa pelo n8n */
  externo_id: string | null;
  entregue_em: string | null;
  lido_em: string | null;
  erro: string | null;
  criado_em: string;
};

export type Busca = {
  id: string;
  projeto_id: string;
  run_id: string;
  dataset_id: string | null;
  termo: string;
  local: string;
  limite: number;
  status: "rodando" | "concluida" | "erro";
  encontrados: number;
  inseridos: number;
  duplicados: number;
  qualificados: number;
  /** primeiro item como veio do scraper, para conferir os campos */
  amostra: Record<string, unknown> | null;
  erro: string | null;
  criado_em: string;
  concluido_em: string | null;
};

export type Template = {
  id: string;
  nome: string;
  texto: string;
  /**
   * Posicao na lista, e portanto qual template vem selecionado por padrao
   * na aba WhatsApp. Antes a ordem era a de criacao, o que colocava o
   * follow-up mais novo na frente da primeira abordagem.
   */
  ordem: number;
  criado_em: string;
};

/**
 * Uma demo de site gerada para o lead.
 *
 * O HTML fica gravado, e não é remontado a cada acesso de propósito: a
 * página pública precisa responder sem sessão, então ela lê UMA linha e
 * serve. Sem isso o `/demo` teria que ler lead e projeto, e a tabela de
 * leads não pode ficar exposta. Efeito colateral bom: mexer no template
 * não muda uma demo que o cliente já recebeu.
 */
export type Demo = {
  id: string;
  lead_id: string;
  projeto_id: string;
  /** parte pública da URL: /s/<slug> */
  slug: string;
  titulo: string;
  /** o JSON que a LLM escreveu, guardado para poder re-renderizar depois */
  conteudo: ConteudoSite;
  html: string;
  modelo: string | null;
  tokens_entrada: number;
  tokens_saida: number;
  /** fora do ar sem apagar: o /demo só serve o que está publicado */
  publicado: boolean;
  criado_em: string;
};

/** Retorno padrão das server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; erro: string };

/** Um vendedor da equipe. */
export type Membro = {
  user_id: string;
  email: string | null;
  papel: "dono" | "vendedor";
  /** o WhatsApp dele esta ligado? */
  conectado: boolean;
  numero: string | null;
};

/** O WhatsApp de um vendedor, do lado do nosso banco. */
export type Conexao = {
  user_id: string;
  instancia: string;
  numero: string | null;
  status: "open" | "connecting" | "close";
  /** o webhook do n8n desta pessoa; null cai no do ambiente */
  webhook_url: string | null;
  /** quantos disparos por dia essa pessoa pode fazer; numero banido e o risco real */
  teto_diario: number;
  /** janela de horario em que o disparo pode sair, "HH:MM" */
  janela_inicio: string;
  janela_fim: string;
  atualizado_em: string;
};
