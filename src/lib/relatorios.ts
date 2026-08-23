import { hojeISO } from "./agenda";
import { contarSinais, rotulosDosSinais } from "./servicos";
import { STATUS_META } from "./status";
import type { Interacao, Lead, LeadStatus, Projeto, Template } from "./types";

/**
 * Tudo é calculado em memória a partir das listas que a página já carregou.
 * Na escala de uma agência (milhares de leads) isso é mais barato que uma
 * ida extra ao banco por gráfico. Se um dia virar dezenas de milhares, o
 * caminho é uma view materializada no Postgres — não mais consultas aqui.
 */

export type Periodo = 7 | 30 | 90 | 0;

export const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: 7, label: "7 dias" },
  { valor: 30, label: "30 dias" },
  { valor: 90, label: "90 dias" },
  { valor: 0, label: "Tudo" },
];

/** Etapas do funil, na ordem em que o lead avança. */
const ETAPAS: LeadStatus[] = [
  "novo",
  "contatado",
  "respondeu",
  "negociando",
  "fechou",
];

/** Um lead na etapa N já passou por todas as anteriores. */
const ALCANCE: Record<LeadStatus, number> = {
  novo: 0,
  contatado: 1,
  respondeu: 2,
  negociando: 3,
  fechou: 4,
  descartado: -1,
};

export type EtapaFunil = {
  chave: LeadStatus;
  label: string;
  cor: string;
  /** quantos chegaram até aqui (acumulado) */
  valor: number;
  /** % de quem chegou na etapa anterior */
  conversao: number | null;
  /** % do topo do funil */
  doTopo: number;
};

export type PontoSerie = { dia: string; enviados: number; respostas: number };
export type LinhaRanking = {
  id: string;
  nome: string;
  detalhe: string;
  enviados: number;
  respostas: number;
  taxa: number;
};
export type Relatorio = {
  totalLeads: number;
  qualificados: number;
  contatados: number;
  responderam: number;
  fechados: number;
  descartados: number;
  taxaResposta: number;
  taxaFechamento: number;
  /** horas entre o primeiro disparo e a primeira resposta */
  tempoMedioResposta: number | null;
  temRespostasReais: boolean;
  funil: EtapaFunil[];
  serie: PontoSerie[];
  porProjeto: LinhaRanking[];
  porTemplate: LinhaRanking[];
  atividade: { dia: string; n: number }[];
  sinais: { label: string; n: number }[];
  totalEnviados: number;
};

function pct(parte: number, total: number): number {
  if (!total) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

function diaDe(iso: string): string {
  return iso.slice(0, 10);
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return hojeISO(d);
}

export function computarRelatorio(
  leadsTodos: Lead[],
  interacoesTodas: Interacao[],
  projetos: Projeto[],
  templates: Template[],
  filtro: { periodo: Periodo; projetoId: string }
): Relatorio {
  const corte = filtro.periodo ? diasAtras(filtro.periodo) : "";
  const doProjeto = (id: string) =>
    filtro.projetoId === "todos" || filtro.projetoId === id;

  const leads = leadsTodos.filter(
    (l) => doProjeto(l.projeto_id) && (!corte || diaDe(l.criado_em) >= corte)
  );
  // Interações entram pelo próprio período, não pelo do lead: um lead antigo
  // contatado esta semana precisa aparecer na atividade desta semana.
  const porLead = new Map(leadsTodos.map((l) => [l.id, l]));
  const interacoes = interacoesTodas.filter((i) => {
    const lead = porLead.get(i.lead_id);
    if (!lead || !doProjeto(lead.projeto_id)) return false;
    return !corte || diaDe(i.criado_em) >= corte;
  });

  const saidas = interacoes.filter(
    (i) => i.tipo === "whatsapp" && i.direcao !== "entrada"
  );

  // O mapa de calor sempre mostra 12 semanas: ele ignora o filtro de período
  // (senão o rótulo mentiria) e respeita só o filtro de projeto.
  const saidasDoProjeto = interacoesTodas.filter((i) => {
    const lead = porLead.get(i.lead_id);
    return (
      !!lead &&
      doProjeto(lead.projeto_id) &&
      i.tipo === "whatsapp" &&
      i.direcao !== "entrada"
    );
  });
  const entradas = interacoes.filter((i) => i.direcao === "entrada");

  /* ------------------------------ funil ------------------------------- */
  const criteriosPorProjeto = new Map(projetos.map((p) => [p.id, p.criterios]));

  const funil: EtapaFunil[] = ETAPAS.map((etapa, i) => {
    const valor = leads.filter((l) => ALCANCE[l.status] >= i).length;
    return {
      chave: etapa,
      label: STATUS_META[etapa].label,
      cor: STATUS_META[etapa].cor,
      valor,
      conversao: null,
      doTopo: 0,
    };
  });
  const topo = funil[0]?.valor || 0;
  funil.forEach((e, i) => {
    e.doTopo = pct(e.valor, topo);
    e.conversao = i === 0 ? null : pct(e.valor, funil[i - 1].valor);
  });

  /* ------------------------------ série ------------------------------- */
  const janela = filtro.periodo || 30;
  const dias: string[] = [];
  for (let d = janela - 1; d >= 0; d--) dias.push(diasAtras(d));

  const mapaSerie = new Map<string, PontoSerie>(
    dias.map((dia) => [dia, { dia, enviados: 0, respostas: 0 }])
  );
  for (const i of saidas) {
    const p = mapaSerie.get(diaDe(i.criado_em));
    if (p) p.enviados += 1;
  }
  for (const i of entradas) {
    const p = mapaSerie.get(diaDe(i.criado_em));
    if (p) p.respostas += 1;
  }
  const serie = dias.map((d) => mapaSerie.get(d)!);

  /* --------------------- atribuição de resposta ----------------------- */
  // Uma resposta é creditada ao último disparo que saiu antes dela.
  const saidasPorLead = new Map<string, Interacao[]>();
  for (const i of saidas) {
    const lista = saidasPorLead.get(i.lead_id);
    if (lista) lista.push(i);
    else saidasPorLead.set(i.lead_id, [i]);
  }
  for (const lista of saidasPorLead.values()) {
    lista.sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  }

  const temposResposta: number[] = [];

  for (const entrada of entradas) {
    const anteriores = saidasPorLead.get(entrada.lead_id) ?? [];
    const gatilho = [...anteriores]
      .reverse()
      .find((s) => s.criado_em <= entrada.criado_em);
    if (gatilho) {
      const horas =
        (new Date(entrada.criado_em).getTime() -
          new Date(gatilho.criado_em).getTime()) /
        3_600_000;
      if (horas >= 0) temposResposta.push(horas);
    }
  }

  /*
   * Desempenho de template é medido POR LEAD, não por mensagem.
   *
   * Atribuir a resposta só ao último disparo antes dela parece justo e não é:
   * quem sempre faz follow-up nunca credita o texto de abertura, que fica
   * eternamente em 0%. Isso mede a cadência, não o texto.
   *
   * Aqui a pergunta é outra e mais útil: dos leads que receberam este
   * template, quantos acabaram respondendo? Um lead conta uma vez por
   * template, mesmo que tenha recebido o mesmo texto duas vezes.
   */
  const leadsPorTemplate = new Map<string, Set<string>>();
  for (const s of saidas) {
    if (!s.template_id) continue;
    const conjunto = leadsPorTemplate.get(s.template_id);
    if (conjunto) conjunto.add(s.lead_id);
    else leadsPorTemplate.set(s.template_id, new Set([s.lead_id]));
  }

  const leadsQueResponderam = new Set(entradas.map((i) => i.lead_id));

  /* ---------------------------- rankings ------------------------------ */
  const respondeuStatus = (l: Lead) => ALCANCE[l.status] >= 2;

  const porProjeto: LinhaRanking[] = projetos
    .filter((p) => doProjeto(p.id))
    .map((p) => {
      const doP = leads.filter((l) => l.projeto_id === p.id);
      const contatadosP = doP.filter((l) => ALCANCE[l.status] >= 1).length;
      const respondeuP = doP.filter(respondeuStatus).length;
      return {
        id: p.id,
        nome: p.nome,
        detalhe: `${doP.length} leads`,
        enviados: contatadosP,
        respostas: respondeuP,
        taxa: pct(respondeuP, contatadosP),
      };
    })
    .filter((l) => l.enviados > 0)
    .sort((a, b) => b.taxa - a.taxa);

  const porTemplate: LinhaRanking[] = templates
    .map((t) => {
      const alcancados = leadsPorTemplate.get(t.id) ?? new Set<string>();
      const enviados = alcancados.size;
      let respostas = 0;
      for (const id of alcancados) if (leadsQueResponderam.has(id)) respostas += 1;
      return {
        id: t.id,
        nome: t.nome,
        detalhe: `${enviados} ${enviados === 1 ? "lead" : "leads"}`,
        enviados,
        respostas,
        taxa: pct(respostas, enviados),
      };
    })
    .filter((l) => l.enviados > 0)
    .sort((a, b) => b.taxa - a.taxa);

  /* ---------------------------- atividade ----------------------------- */
  const diasHeat: string[] = [];
  for (let d = 83; d >= 0; d--) diasHeat.push(diasAtras(d));
  const contagemHeat = new Map<string, number>(diasHeat.map((d) => [d, 0]));
  for (const i of saidasDoProjeto) {
    const dia = diaDe(i.criado_em);
    if (contagemHeat.has(dia))
      contagemHeat.set(dia, (contagemHeat.get(dia) ?? 0) + 1);
  }
  const atividade = diasHeat.map((dia) => ({ dia, n: contagemHeat.get(dia) ?? 0 }));

  /* ------------------------------ sinais ------------------------------ */
  const contagemSinais = new Map<string, number>();
  for (const l of leads) {
    for (const label of rotulosDosSinais(
      l.sinais,
      criteriosPorProjeto.get(l.projeto_id) ?? []
    )) {
      contagemSinais.set(label, (contagemSinais.get(label) ?? 0) + 1);
    }
  }
  const sinais = [...contagemSinais.entries()]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);

  /* ------------------------------- kpis ------------------------------- */
  const contatados = leads.filter((l) => ALCANCE[l.status] >= 1).length;
  const responderam = leads.filter(respondeuStatus).length;
  const fechados = leads.filter((l) => l.status === "fechou").length;
  const qualificados = leads.filter(
    (l) => contarSinais(l.sinais, criteriosPorProjeto.get(l.projeto_id) ?? []) > 0
  ).length;

  return {
    totalLeads: leads.length,
    qualificados,
    contatados,
    responderam,
    fechados,
    descartados: leads.filter((l) => l.status === "descartado").length,
    taxaResposta: pct(responderam, contatados),
    taxaFechamento: pct(fechados, leads.length),
    tempoMedioResposta: temposResposta.length
      ? Math.round(
          (temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length) * 10
        ) / 10
      : null,
    temRespostasReais: entradas.length > 0,
    funil,
    serie,
    porProjeto,
    porTemplate,
    atividade,
    sinais,
    totalEnviados: saidas.length,
  };
}
