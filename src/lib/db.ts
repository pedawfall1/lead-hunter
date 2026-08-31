import { DEMO } from "./config";
import { agora, estado, novoId } from "./demo/dados";
import { createClient } from "./supabase/server";
import type { ConteudoSite } from "./site/tipos";
import type {
  Busca,
  Conexao,
  Criterio,
  Demo,
  Interacao,
  Lead,
  LeadStatus,
  Membro,
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

/**
 * Prefixo lh_ porque o projeto Supabase e compartilhado com outros sistemas
 * (mesma convencao das tabelas mc_ que ja existem la). Trocar de banco e so
 * mexer aqui.
 */
const T = {
  projetos: "lh_projetos",
  leads: "lh_leads",
  interacoes: "lh_interacoes",
  templates: "lh_templates_mensagem",
  demos: "lh_demos",
  conexoes: "lh_conexoes",
  membros: "lh_membros",
} as const;

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
    .from(T.projetos)
    .select(COLUNAS_PROJETO)
    .order("criado_em", { ascending: false });
  checar(error);
  return (data ?? []) as Projeto[];
}

export async function obterProjeto(id: string): Promise<Projeto | null> {
  if (DEMO) return estado().projetos.find((p) => p.id === id) ?? null;

  const { data, error } = await createClient()
    .from(T.projetos)
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
    .from(T.projetos)
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

  const { error } = await createClient().from(T.projetos).update(dados).eq("id", id);
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

  const { error } = await createClient().from(T.projetos).delete().eq("id", id);
  checar(error);
}

/* --------------------------------- leads -------------------------------- */

const COLUNAS_LEAD =
  "id, projeto_id, nome, telefone, endereco, instagram, email, sinais, status, nota, proximo_contato, ig_dados, ig_run_id, ig_em, ig_erro, ig_bruto, place_id, google_nota, google_avaliacoes, responsavel_id, lat, lng, site_conteudo, site_em, site_erro, criado_em, atualizado_em";

export async function listarLeads(projetoId?: string): Promise<Lead[]> {
  if (DEMO) {
    return estado()
      .leads.filter((l) => !projetoId || l.projeto_id === projetoId)
      .sort(porCriacaoDesc);
  }

  let query = createClient().from(T.leads).select(COLUNAS_LEAD);
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
    .from(T.leads)
    .select(COLUNAS_LEAD)
    .not("proximo_contato", "is", null)
    .neq("status", "descartado")
    .order("proximo_contato", { ascending: true });
  checar(error);
  return (data ?? []) as Lead[];
}

export async function obterLead(id: string): Promise<Lead | null> {
  if (DEMO) return estado().leads.find((l) => l.id === id) ?? null;

  const { data, error } = await createClient()
    .from(T.leads)
    .select(COLUNAS_LEAD)
    .eq("id", id)
    .maybeSingle();
  checar(error);
  return (data as Lead | null) ?? null;
}

export type DadosLead = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  email: string | null;
  sinais: Sinais;
  status: LeadStatus;
  nota: string | null;
  proximo_contato: string | null;
  google_nota: number | null;
  google_avaliacoes: number | null;
};

export async function criarLeadDb(
  projetoId: string,
  dados: DadosLead
): Promise<Lead> {
  if (DEMO) {
    const lead: Lead = {
      id: novoId(),
      projeto_id: projetoId,
      ...SEM_ENRIQUECIMENTO,
      ...dados,
      criado_em: agora(),
      atualizado_em: agora(),
    };
    estado().leads.unshift(lead);
    return lead;
  }

  const { data, error } = await createClient()
    .from(T.leads)
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
    .from(T.leads)
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
    .from(T.leads)
    .update(campos)
    .eq("id", id)
    .select(COLUNAS_LEAD)
    .single();
  checar(error);
  return data as Lead;
}

/**
 * Grava o resultado (ou o andamento) da análise de Instagram.
 *
 * Os sinais entram por `marcar`/`desmarcar` em vez de um objeto inteiro:
 * o lead pode ter sinais que vieram do Google Maps ou que você marcou na
 * mão, e sobrescrever tudo apagaria esses.
 */
export async function salvarInstagramDb(
  id: string,
  campos: Partial<
    Pick<Lead, "ig_dados" | "ig_run_id" | "ig_em" | "ig_erro" | "ig_bruto">
  >,
  sinais?: { marcar: Sinais; desmarcar: string[] }
): Promise<Lead> {
  const aplicar = (lead: Lead) => {
    if (!sinais) return lead.sinais;
    const novos = { ...lead.sinais, ...sinais.marcar };
    for (const chave of sinais.desmarcar) delete novos[chave];
    return novos;
  };

  if (DEMO) {
    const lead = estado().leads.find((l) => l.id === id);
    if (!lead) throw new Error("Lead não encontrado.");
    Object.assign(lead, campos, {
      sinais: aplicar(lead),
      atualizado_em: agora(),
    });
    return { ...lead };
  }

  const supabase = createClient();

  // Lê antes de escrever para mesclar os sinais. São duas idas ao banco,
  // mas a alternativa é o Postgres decidir sozinho como juntar dois jsonb.
  let novosSinais: Sinais | undefined;
  if (sinais) {
    const { data, error } = await supabase
      .from(T.leads)
      .select("sinais")
      .eq("id", id)
      .maybeSingle();
    checar(error);
    if (!data) throw new Error("Lead não encontrado.");
    novosSinais = aplicar({ sinais: (data.sinais ?? {}) as Sinais } as Lead);
  }

  const { data, error } = await supabase
    .from(T.leads)
    .update(novosSinais ? { ...campos, sinais: novosSinais } : campos)
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

  const { error } = await createClient().from(T.leads).delete().eq("id", id);
  checar(error);
}

type LeadImportado = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  sinais: Sinais;
};

/**
 * Campos que nem o CSV nem o cadastro manual preenchem. `ig_*` so ganha
 * valor quando voce manda analisar o Instagram daquele lead.
 */
const VAZIOS_DO_CSV = { email: null };

/**
 * Campos que so ganham valor depois: a analise de Instagram preenche os
 * ig_*, e a reputacao do Google vem da busca no Maps ou digitada na mao.
 *
 * Espalhe SEMPRE antes de . Depois, apagaria a nota que o
 * usuario acabou de digitar no formulario.
 */
export const SEM_ENRIQUECIMENTO = {
  place_id: null,
  ig_dados: null,
  ig_run_id: null,
  ig_em: null,
  ig_erro: null,
  ig_bruto: null,
  google_nota: null,
  google_avaliacoes: null,
  // Lead novo nasce sem dono no modo demo; em producao quem o importou
  // fica responsavel, por conta do default do banco.
  responsavel_id: null,
  lat: null,
  lng: null,
  site_conteudo: null,
  site_em: null,
  site_erro: null,
} as const;

export async function inserirLeadsDb(
  projetoId: string,
  linhas: LeadImportado[]
): Promise<number> {
  if (DEMO) {
    const novos: Lead[] = linhas.map((l) => ({
      id: novoId(),
      projeto_id: projetoId,
      ...SEM_ENRIQUECIMENTO,
      ...l,
      email: null,
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
    ...VAZIOS_DO_CSV,
    status: "novo" as const,
  }));

  let inseridos = 0;
  for (let i = 0; i < registros.length; i += 250) {
    const lote = registros.slice(i, i + 250);
    const { error, count } = await supabase
      .from(T.leads)
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
    .from(T.interacoes)
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
      .from(T.interacoes)
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
      direcao: "saida",
      externo_id: null,
      entregue_em: null,
      lido_em: null,
      erro: null,
      criado_em: agora(),
    };
    estado().interacoes.unshift(interacao);
    return interacao;
  }

  const { data, error } = await createClient()
    .from(T.interacoes)
    .insert({ lead_id: leadId, ...dados })
    .select("*")
    .single();
  checar(error);
  return data as Interacao;
}

/**
 * Atualiza uma interação no contexto do usuário logado.
 * Diferente de marcarEntregaDb, que roda no webhook e usa o cliente admin.
 */
export async function atualizarInteracaoDb(
  id: string,
  campos: Partial<Pick<Interacao, "externo_id" | "entregue_em" | "lido_em" | "erro">>
): Promise<void> {
  if (DEMO) {
    const i = estado().interacoes.find((x) => x.id === id);
    if (i) Object.assign(i, campos);
    return;
  }

  const { error } = await createClient()
    .from(T.interacoes)
    .update(campos)
    .eq("id", id);
  checar(error);
}

export async function excluirInteracaoDb(id: string): Promise<void> {
  if (DEMO) {
    const e = estado();
    e.interacoes = e.interacoes.filter((i) => i.id !== id);
    return;
  }

  const { error } = await createClient().from(T.interacoes).delete().eq("id", id);
  checar(error);
}

/* ------------------------------- templates ------------------------------ */

export async function listarTemplates(): Promise<Template[]> {
  const porOrdem = (a: Template, b: Template) =>
    a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em);

  if (DEMO) return [...estado().templates].sort(porOrdem);

  // Desempate por criacao: dois templates com a mesma ordem nao podem
  // trocar de lugar a cada carregamento da tela.
  const { data, error } = await createClient()
    .from(T.templates)
    .select("*")
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });
  checar(error);
  return (data ?? []) as Template[];
}

type DadosTemplate = { nome: string; texto: string };

export async function criarTemplateDb(dados: DadosTemplate): Promise<Template> {
  if (DEMO) {
    // Entra no fim da lista: template novo nao rouba o lugar do primeiro,
    // que e o que abre selecionado na aba WhatsApp.
    const lista = estado().templates;
    const ultimo = Math.max(0, ...lista.map((t) => t.ordem));
    const template: Template = {
      id: novoId(),
      ...dados,
      ordem: ultimo + 10,
      criado_em: agora(),
    };
    lista.push(template);
    return template;
  }

  const { data, error } = await createClient()
    .from(T.templates)
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
    .from(T.templates)
    .update(dados)
    .eq("id", id)
    .select("*")
    .single();
  checar(error);
  return data as Template;
}

/**
 * Troca a posicao de dois templates.
 *
 * Se os dois estiverem com a mesma  — possivel em base antiga —
 * trocar os valores nao mexeria em nada. Por isso o empate e desfeito
 * antes, dando ao de baixo uma posicao a mais.
 */
export async function trocarOrdemTemplatesDb(
  a: Template,
  b: Template
): Promise<void> {
  const [ordemA, ordemB] =
    a.ordem === b.ordem ? [b.ordem + 1, b.ordem] : [b.ordem, a.ordem];

  if (DEMO) {
    const lista = estado().templates;
    const ta = lista.find((t) => t.id === a.id);
    const tb = lista.find((t) => t.id === b.id);
    if (ta) ta.ordem = ordemA;
    if (tb) tb.ordem = ordemB;
    return;
  }

  const supabase = createClient();
  const um = await supabase.from(T.templates).update({ ordem: ordemA }).eq("id", a.id);
  checar(um.error);
  const dois = await supabase.from(T.templates).update({ ordem: ordemB }).eq("id", b.id);
  checar(dois.error);
}

export async function excluirTemplateDb(id: string): Promise<void> {
  if (DEMO) {
    const e = estado();
    e.templates = e.templates.filter((t) => t.id !== id);
    return;
  }

  const { error } = await createClient()
    .from(T.templates)
    .delete()
    .eq("id", id);
  checar(error);
}

/* --------------------------------- demos -------------------------------- */

export type DadosDemo = {
  lead_id: string;
  projeto_id: string;
  slug: string;
  titulo: string;
  conteudo: ConteudoSite;
  html: string;
  modelo: string | null;
  tokens_entrada: number;
  tokens_saida: number;
};

export async function listarDemosDoLead(leadId: string): Promise<Demo[]> {
  if (DEMO)
    return estado()
      .demos.filter((d) => d.lead_id === leadId)
      .sort(porCriacaoDesc);

  const { data, error } = await createClient()
    .from(T.demos)
    .select("*")
    .eq("lead_id", leadId)
    .order("criado_em", { ascending: false });
  checar(error);
  return (data ?? []) as Demo[];
}

/**
 * Leitura da página pública. Só devolve demo publicada — despublicar é o
 * jeito de tirar do ar sem perder o histórico nem os tokens já gastos.
 */
export async function obterDemoPorSlug(slug: string): Promise<Demo | null> {
  if (DEMO)
    return estado().demos.find((d) => d.slug === slug && d.publicado) ?? null;

  const { data, error } = await createClient()
    .from(T.demos)
    .select("*")
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle();
  checar(error);
  return (data as Demo | null) ?? null;
}

export async function criarDemoDb(dados: DadosDemo): Promise<Demo> {
  if (DEMO) {
    const demo: Demo = {
      id: novoId(),
      ...dados,
      publicado: true,
      criado_em: agora(),
    };
    estado().demos.unshift(demo);
    return demo;
  }

  const { data, error } = await createClient()
    .from(T.demos)
    .insert(dados)
    .select("*")
    .single();
  checar(error);
  return data as Demo;
}

export async function publicarDemoDb(
  id: string,
  publicado: boolean
): Promise<Demo> {
  if (DEMO) {
    const d = estado().demos.find((x) => x.id === id);
    if (!d) throw new Error("Demo não encontrada.");
    d.publicado = publicado;
    return { ...d };
  }

  const { data, error } = await createClient()
    .from(T.demos)
    .update({ publicado })
    .eq("id", id)
    .select("*")
    .single();
  checar(error);
  return data as Demo;
}

export async function obterDemoDb(id: string): Promise<Demo | null> {
  if (DEMO) return estado().demos.find((d) => d.id === id) ?? null;

  const { data, error } = await createClient()
    .from(T.demos)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  checar(error);
  return (data as Demo | null) ?? null;
}

/**
 * Troca a aparência sem gerar de novo.
 *
 * O `conteudo` continua o mesmo — muda só a paleta/estilo/cor e o `html`
 * re-renderizado em cima dele. É por isso que vale guardar o JSON da LLM:
 * ajustar a cor não gasta token nenhum.
 */
export async function reestilizarDemoDb(
  id: string,
  dados: { conteudo: ConteudoSite; html: string; titulo?: string }
): Promise<Demo> {
  if (DEMO) {
    const d = estado().demos.find((x) => x.id === id);
    if (!d) throw new Error("Demo não encontrada.");
    Object.assign(d, dados);
    return { ...d };
  }

  const { data, error } = await createClient()
    .from(T.demos)
    .update(dados)
    .eq("id", id)
    .select("*")
    .single();
  checar(error);
  return data as Demo;
}

export async function excluirDemoDb(id: string): Promise<void> {
  if (DEMO) {
    const e = estado();
    e.demos = e.demos.filter((d) => d.id !== id);
    return;
  }

  const { error } = await createClient().from(T.demos).delete().eq("id", id);
  checar(error);
}

/** Já existe demo com este slug? O slug é a URL, e URL repetida vaza demo. */
export async function slugEmUso(slug: string): Promise<boolean> {
  if (DEMO) return estado().demos.some((d) => d.slug === slug);

  const { data, error } = await createClient()
    .from(T.demos)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  checar(error);
  return !!data;
}

/* --------------------------- webhook do n8n ---------------------------- */
/*
 * Estas funções rodam sem sessão de usuário (o n8n chama direto), então
 * usam o cliente admin e resolvem o dono a partir do próprio lead.
 * Não existe caminho demo aqui: sem banco não há webhook.
 */

export type Alvo = {
  interacaoId: string | null;
  leadId: string;
  projetoId: string;
  userId: string;
  telefone: string | null;
  status: LeadStatus;
};

/** Acha o lead a partir do que o n8n mandou: interação, id externo ou telefone. */
export async function acharAlvo(ref: {
  interacaoId?: string;
  externoId?: string;
  telefone?: string;
}): Promise<Alvo | null> {
  const { createAdminClient } = await import("./supabase/admin");
  const admin = createAdminClient();

  let interacaoId: string | null = null;
  let leadId: string | null = null;

  if (ref.interacaoId) {
    const { data } = await admin
      .from(T.interacoes)
      .select("id, lead_id")
      .eq("id", ref.interacaoId)
      .maybeSingle();
    if (data) {
      interacaoId = data.id as string;
      leadId = data.lead_id as string;
    }
  }

  if (!leadId && ref.externoId) {
    const { data } = await admin
      .from(T.interacoes)
      .select("id, lead_id")
      .eq("externo_id", ref.externoId)
      .maybeSingle();
    if (data) {
      interacaoId = data.id as string;
      leadId = data.lead_id as string;
    }
  }

  if (!leadId && ref.telefone) {
    // Compara só os dígitos: o número pode ter vindo com ou sem DDI.
    const cauda = ref.telefone.slice(-8);
    const { data } = await admin
      .from(T.leads)
      .select("id")
      .like("telefone", `%${cauda}%`)
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) leadId = data.id as string;
  }

  if (!leadId) return null;

  const { data: lead } = await admin
    .from(T.leads)
    .select("id, projeto_id, telefone, status")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return null;

  const { data: projeto } = await admin
    .from(T.projetos)
    .select("user_id")
    .eq("id", lead.projeto_id as string)
    .maybeSingle();
  if (!projeto) return null;

  return {
    interacaoId,
    leadId: lead.id as string,
    projetoId: lead.projeto_id as string,
    userId: projeto.user_id as string,
    telefone: (lead.telefone as string | null) ?? null,
    status: lead.status as LeadStatus,
  };
}

export async function marcarEntregaDb(
  interacaoId: string,
  campos: { entregue_em?: string; lido_em?: string; erro?: string; externo_id?: string }
): Promise<void> {
  const { createAdminClient } = await import("./supabase/admin");
  const { error } = await createAdminClient()
    .from(T.interacoes)
    .update(campos)
    .eq("id", interacaoId);
  checar(error);
}

export async function registrarRespostaDb(
  alvo: Alvo,
  texto: string,
  em: string
): Promise<void> {
  const { createAdminClient } = await import("./supabase/admin");
  const admin = createAdminClient();

  const { error: erroInteracao } = await admin.from(T.interacoes).insert({
    lead_id: alvo.leadId,
    tipo: "whatsapp",
    direcao: "entrada",
    texto,
    criado_em: em,
  });
  checar(erroInteracao);

  // Quem já estava negociando ou fechou não regride para "respondeu".
  const promove = alvo.status === "novo" || alvo.status === "contatado";
  const { error } = await admin
    .from(T.leads)
    .update({
      ...(promove ? { status: "respondeu" as LeadStatus } : {}),
      // resposta pede retorno seu hoje: sobe no topo da tela Hoje
      proximo_contato: em.slice(0, 10),
    })
    .eq("id", alvo.leadId);
  checar(error);
}

export async function adicionarNaoPerturbeDb(
  userId: string,
  telefone: string,
  motivo: string
): Promise<void> {
  const { createAdminClient } = await import("./supabase/admin");
  const { error } = await createAdminClient()
    .from("lh_nao_perturbe")
    .upsert({ user_id: userId, telefone, motivo }, { onConflict: "user_id,telefone" });
  checar(error);
}

export async function descartarLeadDb(leadId: string, nota: string): Promise<void> {
  const { createAdminClient } = await import("./supabase/admin");
  const { error } = await createAdminClient()
    .from(T.leads)
    .update({ status: "descartado" as LeadStatus, proximo_contato: null, nota })
    .eq("id", leadId);
  checar(error);
}

/** Telefones que pediram para não receber (checado antes de disparar). */
export async function listarNaoPerturbe(): Promise<string[]> {
  if (DEMO) return [];
  const { data, error } = await createClient()
    .from("lh_nao_perturbe")
    .select("telefone");
  checar(error);
  return ((data ?? []) as { telefone: string }[]).map((l) => l.telefone);
}

/* ------------------------------ navegação ------------------------------ */

export type ProjetoNav = {
  id: string;
  nome: string;
  servico: string | null;
  total: number;
  /** leads com retorno vencido — o que faz o projeto pedir atenção */
  atrasados: number;
};

/**
 * Resumo que a barra lateral precisa: projetos com contagem e atrasos.
 * Uma consulta enxuta (só projeto_id e proximo_contato) que roda em toda
 * navegação, então não puxa o lead inteiro.
 */
export async function resumoNav(): Promise<ProjetoNav[]> {
  const projetos = await listarProjetos();
  if (!projetos.length) return [];

  const hoje = new Date().toISOString().slice(0, 10);
  const contagem = new Map<string, { total: number; atrasados: number }>();

  const registrar = (projetoId: string, proximo: string | null) => {
    const atual = contagem.get(projetoId) ?? { total: 0, atrasados: 0 };
    atual.total += 1;
    if (proximo && proximo.slice(0, 10) < hoje) atual.atrasados += 1;
    contagem.set(projetoId, atual);
  };

  // Conta todos os leads, inclusive descartados: e o mesmo numero que o
  // card do projeto mostra, e dois valores diferentes para a mesma coisa
  // na mesma tela parecem bug. A urgencia quem carrega e o ponto de atraso.
  if (DEMO) {
    for (const l of estado().leads) {
      registrar(l.projeto_id, l.proximo_contato);
    }
  } else {
    const { data, error } = await createClient()
      .from(T.leads)
      .select("projeto_id, proximo_contato");
    checar(error);
    for (const l of (data ?? []) as {
      projeto_id: string;
      proximo_contato: string | null;
    }[]) {
      registrar(l.projeto_id, l.proximo_contato);
    }
  }

  return projetos.map((p) => ({
    id: p.id,
    nome: p.nome,
    servico: p.servico,
    ...(contagem.get(p.id) ?? { total: 0, atrasados: 0 }),
  }));
}

/* ------------------------ busca no mapa (Apify) ------------------------ */

const COLUNAS_BUSCA =
  "id, projeto_id, run_id, dataset_id, termo, local, limite, status, encontrados, inseridos, duplicados, qualificados, amostra, erro, criado_em, concluido_em";

export type LugarImportado = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  email: string | null;
  sinais: Sinais;
  place_id: string | null;
  google_nota: number | null;
  google_avaliacoes: number | null;
};

export async function criarBuscaDb(
  projetoId: string,
  dados: {
    run_id: string;
    dataset_id: string | null;
    termo: string;
    local: string;
    limite: number;
  }
): Promise<Busca> {
  const { data, error } = await createClient()
    .from("lh_buscas")
    .insert({ projeto_id: projetoId, ...dados })
    .select(COLUNAS_BUSCA)
    .single();
  checar(error);
  return data as Busca;
}

/** A busca mais recente do projeto — usada para retomar ao reabrir a tela. */
export async function ultimaBuscaDb(projetoId: string): Promise<Busca | null> {
  if (DEMO) return null;

  const { data, error } = await createClient()
    .from("lh_buscas")
    .select(COLUNAS_BUSCA)
    .eq("projeto_id", projetoId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  checar(error);
  return (data as Busca | null) ?? null;
}

export async function obterBuscaDb(id: string): Promise<Busca | null> {
  const { data, error } = await createClient()
    .from("lh_buscas")
    .select(COLUNAS_BUSCA)
    .eq("id", id)
    .maybeSingle();
  checar(error);
  return (data as Busca | null) ?? null;
}

export async function atualizarBuscaDb(
  id: string,
  campos: Partial<
    Pick<
      Busca,
      | "dataset_id"
      | "status"
      | "encontrados"
      | "inseridos"
      | "duplicados"
      | "qualificados"
      | "amostra"
      | "erro"
      | "concluido_em"
    >
  >
): Promise<Busca> {
  const { data, error } = await createClient()
    .from("lh_buscas")
    .update(campos)
    .eq("id", id)
    .select(COLUNAS_BUSCA)
    .single();
  checar(error);
  return data as Busca;
}

export type ResultadoImportacao = {
  inseridos: number;
  duplicados: number;
  /** dos inseridos, quantos entraram com ao menos um sinal marcado */
  qualificados: number;
};

/**
 * Grava o que a busca achou, pulando quem já está no projeto.
 * Roda com a sessão do usuário, então a RLS já garante o dono.
 */
export async function importarLugaresDb(
  projetoId: string,
  lugares: LugarImportado[]
): Promise<ResultadoImportacao> {
  const { chaveTelefone } = await import("./mapas");
  const supabase = createClient();

  const { data: existentes, error } = await supabase
    .from(T.leads)
    .select("telefone, place_id")
    .eq("projeto_id", projetoId);
  checar(error);

  const telefones = new Set<string>();
  const places = new Set<string>();
  for (const l of (existentes ?? []) as {
    telefone: string | null;
    place_id: string | null;
  }[]) {
    const k = chaveTelefone(l.telefone);
    if (k) telefones.add(k);
    if (l.place_id) places.add(l.place_id);
  }

  const novos: LugarImportado[] = [];
  let duplicados = 0;

  for (const lugar of lugares) {
    const k = chaveTelefone(lugar.telefone);
    if ((lugar.place_id && places.has(lugar.place_id)) || (k && telefones.has(k))) {
      duplicados += 1;
      continue;
    }
    if (lugar.place_id) places.add(lugar.place_id);
    if (k) telefones.add(k);
    novos.push(lugar);
  }

  const qualificados = novos.filter(
    (l) => Object.values(l.sinais).some(Boolean)
  ).length;

  let inseridos = 0;
  for (let i = 0; i < novos.length; i += 200) {
    const lote = novos.slice(i, i + 200).map((l) => ({
      projeto_id: projetoId,
      ...l,
      origem: "mapa",
      status: "novo" as const,
    }));
    const { error: erroLote, count } = await supabase
      .from(T.leads)
      .insert(lote, { count: "exact" });
    if (erroLote)
      throw new Error(
        `${erroLote.message} (${inseridos} leads inseridos antes do erro)`
      );
    inseridos += count ?? lote.length;
  }

  return { inseridos, duplicados, qualificados };
}

/* ------------------------- equipe e conexões ------------------------- */

/**
 * Quem está na minha equipe, com e-mail e estado do WhatsApp.
 *
 * Vem de uma função SECURITY DEFINER porque o e-mail mora em `auth.users`,
 * fora do alcance das policies do app. A função só devolve membros das
 * equipes de quem chama.
 */
export async function listarMembros(): Promise<Membro[]> {
  if (DEMO) {
    // Três pessoas, e não uma: as abas de responsável e o seletor do modal
    // só aparecem em equipe de verdade, e o modo demo é a vitrine.
    return [
      {
        user_id: "demo",
        email: "voce@exemplo.com",
        papel: "dono",
        conectado: true,
        numero: "5549999318232",
      },
      {
        user_id: "demo-2",
        email: "alexandre@exemplo.com",
        papel: "vendedor",
        conectado: true,
        numero: "5549998770033",
      },
      {
        user_id: "demo-3",
        email: "henrique@exemplo.com",
        papel: "vendedor",
        conectado: false,
        numero: null,
      },
    ];
  }

  const { data, error } = await createClient().rpc("lh_equipe_membros");
  checar(error);

  return ((data ?? []) as Record<string, unknown>[]).map((m) => ({
    user_id: String(m.user_id),
    email: (m.email as string) ?? null,
    papel: m.papel === "dono" ? "dono" : "vendedor",
    conectado: m.status === "open",
    numero: (m.numero as string) ?? null,
  }));
}

/** O id do usuário logado, ou null fora de uma sessão. */
export async function usuarioAtual(): Promise<string | null> {
  if (DEMO) return "demo";
  const { data } = await createClient().auth.getUser();
  return data.user?.id ?? null;
}

/** A conexão de WhatsApp de um usuário — a minha, por padrão. */
export async function obterConexao(userId: string): Promise<Conexao | null> {
  if (DEMO) return null;

  const { data, error } = await createClient()
    .from(T.conexoes)
    .select(
      "user_id, instancia, numero, status, webhook_url, teto_diario, janela_inicio, janela_fim, atualizado_em"
    )
    .eq("user_id", userId)
    .maybeSingle();
  checar(error);
  return (data as Conexao) ?? null;
}

/**
 * Grava o estado da conexão.
 *
 * `equipe_id` fica por conta do default do banco (`lh_minha_equipe()`),
 * pela mesma razão que `user_id` sempre ficou: é o banco que sabe de que
 * equipe é quem está escrevendo.
 */
export async function salvarConexaoDb(dados: {
  user_id: string;
  instancia: string;
  status: string;
  numero?: string | null;
}): Promise<void> {
  if (DEMO) return;

  const { error } = await createClient()
    .from(T.conexoes)
    .upsert(
      { ...dados, atualizado_em: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  checar(error);
}

/** Passa o lead para outra pessoa da equipe (ou solta, com null). */
export async function atribuirLeadDb(
  leadId: string,
  responsavelId: string | null
): Promise<void> {
  if (DEMO) {
    const lead = estado().leads.find((l) => l.id === leadId);
    if (lead) lead.responsavel_id = responsavelId;
    return;
  }

  const { error } = await createClient()
    .from(T.leads)
    .update({ responsavel_id: responsavelId })
    .eq("id", leadId);
  checar(error);
}

/**
 * Por onde o disparo de quem está logado sai: webhook próprio e instância.
 *
 * Uma consulta só, porque toda tela que mostra o botão de disparo precisa
 * das duas coisas.
 */
export async function minhaConexao(): Promise<Conexao | null> {
  const userId = await usuarioAtual();
  if (!userId) return null;
  return obterConexao(userId);
}

/** Guarda o webhook do n8n desta pessoa. */
export async function salvarWebhookDb(
  userId: string,
  instancia: string,
  webhook: string | null
): Promise<void> {
  if (DEMO) return;

  const { error } = await createClient()
    .from(T.conexoes)
    .upsert(
      { user_id: userId, instancia, webhook_url: webhook },
      { onConflict: "user_id" }
    );
  checar(error);
}
