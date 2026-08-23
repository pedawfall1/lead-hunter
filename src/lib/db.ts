import { DEMO } from "./config";
import { agora, estado, novoId } from "./demo/dados";
import { createClient } from "./supabase/server";
import type { Lead, LeadStatus, Projeto, Template } from "./types";

/**
 * Camada de dados. Em modo demo tudo acontece na memoria; caso contrario,
 * Supabase. As telas e as server actions so falam com este arquivo.
 * Erros do banco viram excecao e caem no error.tsx da area logada.
 */

function checar(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const porCriacaoDesc = (a: { criado_em: string }, b: { criado_em: string }) =>
  b.criado_em.localeCompare(a.criado_em);
const porCriacaoAsc = (a: { criado_em: string }, b: { criado_em: string }) =>
  a.criado_em.localeCompare(b.criado_em);

/* ------------------------------- projetos ------------------------------- */

export async function listarProjetos(): Promise<Projeto[]> {
  if (DEMO) return [...estado().projetos].sort(porCriacaoDesc);

  const { data, error } = await createClient()
    .from("projetos")
    .select("id, nome, nicho, regiao, criado_em")
    .order("criado_em", { ascending: false });
  checar(error);
  return (data ?? []) as Projeto[];
}

export async function obterProjeto(id: string): Promise<Projeto | null> {
  if (DEMO) return estado().projetos.find((p) => p.id === id) ?? null;

  const { data, error } = await createClient()
    .from("projetos")
    .select("id, nome, nicho, regiao, criado_em")
    .eq("id", id)
    .maybeSingle();
  checar(error);
  return (data as Projeto | null) ?? null;
}

type DadosProjeto = { nome: string; nicho: string | null; regiao: string | null };

export async function criarProjetoDb(dados: DadosProjeto): Promise<Projeto> {
  if (DEMO) {
    const projeto: Projeto = { id: novoId(), ...dados, criado_em: agora() };
    estado().projetos.unshift(projeto);
    return projeto;
  }

  const { data, error } = await createClient()
    .from("projetos")
    .insert(dados)
    .select("id, nome, nicho, regiao, criado_em")
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
    e.projetos = e.projetos.filter((p) => p.id !== id);
    e.leads = e.leads.filter((l) => l.projeto_id !== id);
    return;
  }

  const { error } = await createClient().from("projetos").delete().eq("id", id);
  checar(error);
}

/* --------------------------------- leads -------------------------------- */

export async function listarLeads(projetoId?: string): Promise<Lead[]> {
  if (DEMO) {
    return estado()
      .leads.filter((l) => !projetoId || l.projeto_id === projetoId)
      .sort(porCriacaoDesc);
  }

  let query = createClient().from("leads").select("*");
  if (projetoId) query = query.eq("projeto_id", projetoId);

  const { data, error } = await query.order("criado_em", { ascending: false });
  checar(error);
  return (data ?? []) as Lead[];
}

export type DadosLead = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  tem_site: boolean;
  instagram: string | null;
  status: LeadStatus;
  nota: string | null;
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
    .select("*")
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
    if (!lead) throw new Error("Lead nao encontrado.");
    Object.assign(lead, dados, { atualizado_em: agora() });
    return { ...lead };
  }

  const { data, error } = await createClient()
    .from("leads")
    .update(dados)
    .eq("id", id)
    .select("*")
    .single();
  checar(error);
  return data as Lead;
}

export async function atualizarStatusDb(
  id: string,
  status: LeadStatus
): Promise<void> {
  if (DEMO) {
    const lead = estado().leads.find((l) => l.id === id);
    if (lead) {
      lead.status = status;
      lead.atualizado_em = agora();
    }
    return;
  }

  const { error } = await createClient()
    .from("leads")
    .update({ status })
    .eq("id", id);
  checar(error);
}

/** So promove quem ainda esta em "novo" — nao regride quem ja avancou. */
export async function marcarContatadoDb(id: string): Promise<void> {
  if (DEMO) {
    const lead = estado().leads.find((l) => l.id === id);
    if (lead && lead.status === "novo") {
      lead.status = "contatado";
      lead.atualizado_em = agora();
    }
    return;
  }

  const { error } = await createClient()
    .from("leads")
    .update({ status: "contatado" })
    .eq("id", id)
    .eq("status", "novo");
  checar(error);
}

export async function excluirLeadDb(id: string): Promise<void> {
  if (DEMO) {
    const e = estado();
    e.leads = e.leads.filter((l) => l.id !== id);
    return;
  }

  const { error } = await createClient().from("leads").delete().eq("id", id);
  checar(error);
}

type LeadImportado = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  tem_site: boolean;
  instagram: string | null;
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
    if (!t) throw new Error("Template nao encontrado.");
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
