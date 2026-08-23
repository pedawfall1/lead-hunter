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
  sinais: Sinais;
  status: LeadStatus;
  nota: string | null;
  proximo_contato: string | null;
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
  texto: string | null;
  template_id: string | null;
  criado_em: string;
};

export type Template = {
  id: string;
  nome: string;
  texto: string;
  criado_em: string;
};

/** Retorno padrão das server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; erro: string };
