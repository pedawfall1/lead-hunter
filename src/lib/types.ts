export const STATUS = [
  "novo",
  "contatado",
  "respondeu",
  "negociando",
  "fechou",
  "descartado",
] as const;

export type LeadStatus = (typeof STATUS)[number];

export type Projeto = {
  id: string;
  nome: string;
  nicho: string | null;
  regiao: string | null;
  criado_em: string;
};

export type ProjetoComContagem = Projeto & { total_leads: number };

export type Lead = {
  id: string;
  projeto_id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  tem_site: boolean;
  instagram: string | null;
  status: LeadStatus;
  nota: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Template = {
  id: string;
  nome: string;
  texto: string;
  criado_em: string;
};

/** Retorno padrao das server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; erro: string };
