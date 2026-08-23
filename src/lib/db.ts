import { DEMO } from "./config";
import { agora, estado, novoId } from "./demo/dados";
import { createClient } from "./supabase/server";
import type {
  Criterio,
  Interacao,
  Lead,
  LeadStatus,
  Projeto,
  Sinais,
  Template,
  TipoInteracao,
} from "./types";

/**
 * Camada de dados. Em modo demo tudo acontece na memória; caso contrário,
 * Supabase. As telas e as server actions só falam com este arquivo.
 * Erros do banco viram exceção e caem no error.tsx da área logada.
 */

function checar(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const COLUNAS_PROJETO = "id, nome, nicho, regiao, servico, criterios, criado_em";

const porCriacaoDesc = (a: { criado_em: string }, b: { criado_em: string }) =>
  b.criado_em.localeCompare(a.criado_em);
const porCriacaoAsc = (a: { criado_em: string }, b: { criado_em: string }) =>
  a.criado_em.localeCompare(b.criado_em);

/* ------------------------------- projetos ------------------------------- */

export async function listarProjetos(): Promise<Projeto[]> {
  if (DEMO) return [...estado().projetos].sort(porCriacaoDesc);

  const { data, error } = await createClient()
    .from("projetos")
    .select(COLUNAS_PROJETO)
    .order("criado_em", { ascending: false });
  checar(error);
  return (data ?? []) as Projeto[];
}

export async function obterProjeto(id: string): Promise<Projeto | null> {
  if (DEMO) return estado().projetos.find((p) => p.id === id) ?? null;

  const { data, error } = await createClient()
    .from("projetos")
    .select(COLUNAS_PROJETO)
    .eq("id", id)
    .maybeSingle();
  checar(error);
  return (data as Projeto | null) ?? null;
}

export type DadosProjeto = {
  nome: string;
  nicho: string | null;
  regiao: string | null;
  servico: string | null;
  criterios: Criterio[];
};

export async function criarProjetoDb(dados: DadosProjeto): Promise<Projeto> {
  if (DEMO) {
    const projeto: Projeto = { id: novoId(), ...dados, criado_em: agora() };
    estado().projetos.unshift(projeto);
    return projeto;
  }

  const { data, error } = await createClient()
    .from("projetos")
    .insert(dados)
    .select(COLUNAS_PROJETO)
    .single();
  checar(error);
  return data as Projeto;
}

export async function atualizarProjetoDb(
  id: string,
  dados: DadosProjeto
): Promise<void> {
  if (DEMO) {
    const p = estado().projetos.find((x) => x.id === id);
    if (p) Object.assign(p, dados);
    return;
  }

  const { error } = await createClient().from("projetos").update(dados).eq("id", id);
  checar(error);
}

export async function excluirProjetoDb(id: string): Promise<void> {
  if (DEMO) {
    const e = estado();
    const leads = e.leads.filter((l) => l.projeto_id === id).map((l) => l.id);
    e.projetos = e.projetos.filter((p) => p.id !== id);
    e.leads = e.leads.filter((l) => l.projeto_id !== id);
    e.interacoes = e.interacoes.filter((i) => !leads.includes(i.lead_id));
    return;
  }

  const { error } = await createClient().from("projetos").delete().eq("id", id);
  checar(error);
}

/* --------------------------------- leads -------------------------------- */

const COLUNAS_LEAD =
  "id, projeto_id, nome, telefone, endereco, instagram, sinais, status, nota, proximo_contato, criado_em, atualizado_em";

export async function listarLeads(projetoId?: string): Promise<Lead[]> {
  if (DEMO) {
    return estado()
      .leads.filter((l) => !projetoId || l.projeto_id === projetoId)
      .sort(porCriacaoDesc);
  }

  let query = createClient().from("leads").select(COLUNAS_LEAD);
  if (projetoId) query = query.eq("projeto_id", projetoId);

  const { data, error } = await query.order("criado_em", { ascending: false });
  checar(error);
  return (data ?? []) as Lead[];
}

/** Leads com retorno marcado, para a tela Hoje. */
export async function listarAgendados(): Promise<Lead[]> {
  if (DEMO) {
    return estado()
      .leads.filter((l) => !!l.proximo_contato && l.status !== "descartado")
      .sort((a, b) =>
        (a.proximo_contato ?? "").localeCompare(b.proximo_contato ?? "")
      );
  }

  const { data, error } = await createClient()
    .from("leads")
    .select(COLUNAS_LEAD)
    .not("proximo_contato", "is", null)
    .neq("status", "descartado")
    .order("proximo_contato", { ascending: true });
  checar(error);
  return (data ?? []) as Lead[];
}

export type DadosLead = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  sinais: Sinais;
  status: LeadStatus;
  nota: string | null;
  proximo_contato: string | null;
};

export async function criarLeadDb(
  projetoId: string,
  dados: DadosLead
): Promise<Lead> {
  if (DEMO) {
    const lead: Lead = {
      id: novoId(),
      projeto_id: projetoId,
      ...dados,
      criado_em: agora(),
      atualizado_em: agora(),
    };
    estado().leads.unshift(lead);
    return lead;
  }

  const { data, error } = await createClient()
    .from("leads")
    .insert({ projeto_id: projetoId, ...dados })
    .select(COLUNAS_LEAD)
    .single();
  checar(error);
  return data as Lead;
}

export async function atualizarLeadDb(
  id: string,
  dados: DadosLead
): Promise<Lead> {
  if (DEMO) {
    const lead = estado().leads.find((l) => l.id === id);
    if (!lead) throw new Error("Lead não encontrado.");
    Object.assign(lead, dados, { atualizado_em: agora() });
    return { ...lead };
  }

  const { data, error } = await createClient()
    .from("leads")
    .update(dados)
    .eq("id", id)
    .select(COLUNAS_LEAD)
    .single();
  checar(error);
  return data as Lead;
}

/** Atualização pontual: status, retorno ou os dois. */
export async function ajustarLeadDb(
  id: string,
  campos: Partial<Pick<Lead, "status" | "proximo_contato" | "nota">>
): Promise<Lead> {
  if (DEMO) {
    const lead = estado().leads.find((l) => l.id === id);
    if (!lead) throw new Error("Lead não encontrado.");
    Object.assign(lead, campos, { atualizado_em: agora() });
    return { ...lead };
  }

  const { data, error } = await createClient()
    .from("leads")
    .update(campos)
    .eq("id", id)
    .select(COLUNAS_LEAD)
    .single();
  checar(error);
  return data as Lead;
}

export async function excluirLeadDb(id: string): Promise<void> {
  if (DEMO) {
    const e = estado();
    e.leads = e.leads.filter((l) => l.id !== id);
    e.interacoes = e.interacoes.filter((i) => i.lead_id !== id);
    return;
  }

  const { error } = await createClient().from("leads").delete().eq("id", id);
  checar(error);
}

type LeadImportado = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  sinais: Sinais;
};

export async function inserirLeadsDb(
  projetoId: string,
  linhas: LeadImportado[]
): Promise<number> {
  if (DEMO) {
    const novos: Lead[] = linhas.map((l) => ({
      id: novoId(),
      projeto_id: projetoId,
      ...l,
      status: "novo" as const,
      nota: null,
      proximo_contato: null,
      criado_em: agora(),
      atualizado_em: agora(),
    }));
    estado().leads.unshift(...novos);
    return novos.length;
  }

  const supabase = createClient();
  const registros = linhas.map((l) => ({
    projeto_id: projetoId,
    ...l,
    status: "novo" as const,
  }));

  let inseridos = 0;
  for (let i = 0; i < registros.length; i += 250) {
    const lote = registros.slice(i, i + 250);
    const { error, count } = await supabase
      .from("leads")
      .insert(lote, { count: "exact" });
    if (error)
      throw new Error(
        `${error.message} (${inseridos} leads foram inseridos antes do erro)`
      );
    inseridos += count ?? lote.length;
  }
  return inseridos;
}

/* ------------------------------ interações ------------------------------ */

export async function listarInteracoes(leadId: string): Promise<Interacao[]> {
  if (DEMO) {
    return estado()
      .interacoes.filter((i) => i.lead_id === leadId)
      .sort(porCriacaoDesc);
  }

  const { data, error } = await createClient()
    .from("interacoes")
    .select("*")
    .eq("lead_id", leadId)
    .order("criado_em", { ascending: false });
  checar(error);
  return (data ?? []) as Interacao[];
}

/** Interações de vários leads de uma vez, agrupadas por lead. */
export async function interacoesPorLead(
  leadIds: string[]
): Promise<Record<string, Interacao[]>> {
  if (!leadIds.length) return {};

  let lista: Interacao[];
  if (DEMO) {
    const ids = new Set(leadIds);
    lista = estado()
      .interacoes.filter((i) => ids.has(i.lead_id))
      .sort(porCriacaoDesc);
  } else {
    const { data, error } = await createClient()
      .from("interacoes")
      .select("*")
      .in("lead_id", leadIds)
      .order("criado_em", { ascending: false });
    checar(error);
    lista = (data ?? []) as Interacao[];
  }

  const mapa: Record<string, Interacao[]> = {};
  for (const i of lista) (mapa[i.lead_id] ??= []).push(i);
  return mapa;
}

export type DadosInteracao = {
  tipo: TipoInteracao;
  texto: string | null;
  template_id: string | null;
};

export async function criarInteracaoDb(
  leadId: string,
  dados: DadosInteracao
): Promise<Interacao> {
  if (DEMO) {
    const interacao: Interacao = {
      id: novoId(),
      lead_id: leadId,
      ...dados,
      criado_em: agora(),
    };
    estado().interacoes.unshift(interacao);
    return interacao;
  }

  const { data, error } = await createClient()
    .from("interacoes")
    .insert({ lead_id: leadId, ...dados })
    .select("*")
    .single();
  checar(error);
  return data as Interacao;
}

export async function excluirInteracaoDb(id: string): Promise<void> {
  if (DEMO) {
    const e = estado();
    e.interacoes = e.interacoes.filter((i) => i.id !== id);
    return;
  }

  const { error } = await createClient().from("interacoes").delete().eq("id", id);
  checar(error);
}

/* ------------------------------- templates ------------------------------ */

export async function listarTemplates(): Promise<Template[]> {
  if (DEMO) return [...estado().templates].sort(porCriacaoAsc);

  const { data, error } = await createClient()
    .from("templates_mensagem")
    .select("*")
    .order("criado_em", { ascending: true });
  checar(error);
  return (data ?? []) as Template[];
}

type DadosTemplate = { nome: string; texto: string };

export async function criarTemplateDb(dados: DadosTemplate): Promise<Template> {
  if (DEMO) {
    const template: Template = { id: novoId(), ...dados, criado_em: agora() };
    estado().templates.push(template);
    return template;
  }

  const { data, error } = await createClient()
    .from("templates_mensagem")
    .insert(dados)
    .select("*")
    .single();
  checar(error);
  return data as Template;
}

export async function atualizarTemplateDb(
  id: string,
  dados: DadosTemplate
): Promise<Template> {
  if (DEMO) {
    const t = estado().templates.find((x) => x.id === id);
    if (!t) throw new Error("Template não encontrado.");
    Object.assign(t, dados);
    return { ...t };
  }

  const { data, error } = await createClient()
    .from("templates_mensagem")
    .update(dados)
    .eq("id", id)
    .select("*")
    .single();
  checar(error);
  return data as Template;
}

export async function excluirTemplateDb(id: string): Promise<void> {
  if (DEMO) {
    const e = estado();
    e.templates = e.templates.filter((t) => t.id !== id);
    return;
  }

  const { error } = await createClient()
    .from("templates_mensagem")
    .delete()
    .eq("id", id);
  checar(error);
}
