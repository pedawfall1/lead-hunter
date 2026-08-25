import { criteriosSugeridos } from "@/lib/servicos";
import type {
  Criterio,
  Demo,
  Interacao,
  Lead,
  LeadStatus,
  Projeto,
  Template,
  TipoInteracao,
} from "@/lib/types";

/**
 * Banco de mentira do modo demo: vive na memória do processo.
 * Guardado no globalThis para sobreviver ao hot reload do `next dev`.
 * Em serverless, um cold start volta tudo ao estado inicial — é proposital,
 * o demo não guarda nada de verdade.
 */
type Estado = {
  projetos: Projeto[];
  leads: Lead[];
  interacoes: Interacao[];
  templates: Template[];
  demos: Demo[];
};

const global_ = globalThis as unknown as { __leadHunterDemo?: Estado };

export function novoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function agora(): string {
  return new Date().toISOString();
}

function diasAtras(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function dataEm(dias: number): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Semente = {
  nome: string;
  tel: string;
  end: string;
  ig?: string;
  sinais: string[];
  status: LeadStatus;
  nota?: string;
  /** dias a partir de hoje; negativo = atrasado */
  retorno?: number;
  historico?: [TipoInteracao, string, number][];
};

const ADVOGADOS: Semente[] = [
  { nome: "Advocacia Silva & Ramos", tel: "49999880011", end: "Rua Brasil, 120 - Centro, Videira - SC", ig: "advocaciasilvaramos",
    sinais: ["sem_site", "sem_google_negocio"], status: "novo" },
  { nome: "Dra. Marina Kohler", tel: "49999880022", end: "Av. Manoel Roque, 88 - Centro, Videira - SC",
    sinais: ["sem_site", "so_linktree"], status: "novo" },
  { nome: "Escritório Bertoldi", tel: "49999880033", end: "Rua São Francisco, 45 - Universitário, Videira - SC", ig: "bertoldiadv",
    sinais: ["site_desatualizado", "site_sem_whats"], status: "novo" },
  { nome: "Zanella Advogados", tel: "49999880044", end: "Rua XV de Novembro, 300 - Centro, Videira - SC",
    sinais: ["sem_site", "poucas_avaliacoes"], status: "contatado",
    nota: "Mandei o primeiro contato terça de manhã.", retorno: -2,
    historico: [["whatsapp", "Primeira abordagem enviada.", 5]] },
  { nome: "Advocacia Trentin", tel: "49999880055", end: "Rua das Palmeiras, 12 - Bela Vista, Videira - SC", ig: "trentinadv",
    sinais: ["sem_site", "site_nao_mobile"], status: "contatado", retorno: 0,
    historico: [["whatsapp", "Primeira abordagem enviada.", 3]] },
  { nome: "Dr. Anderson Fachin", tel: "49999880066", end: "Av. Brasil, 902 - Centro, Videira - SC",
    sinais: ["sem_site"], status: "respondeu", nota: "Pediu pra mandar valores por WhatsApp.", retorno: 1,
    historico: [["whatsapp", "Primeira abordagem enviada.", 6], ["ligacao", "Atendeu, pediu proposta por escrito.", 2]] },
  { nome: "Cunha & Associados", tel: "49999880077", end: "Rua Governador Jorge Lacerda, 77 - Centro, Videira - SC", ig: "cunhaassoc",
    sinais: ["site_desatualizado", "site_nao_mobile", "nota_baixa"], status: "respondeu",
    nota: "Já tem site mas odeia. Quer refazer.", retorno: 3,
    historico: [["whatsapp", "Mandei exemplos de sites do nicho.", 4]] },
  { nome: "Advocacia Bortoluzzi", tel: "49999880088", end: "Rua Ipiranga, 210 - Dos Estados, Videira - SC",
    sinais: ["sem_site"], status: "negociando", nota: "Proposta de R$ 1.800 enviada. Retorno na sexta.", retorno: 2,
    historico: [["whatsapp", "Primeira abordagem.", 12], ["visita", "Fui no escritório, conversei com o sócio.", 6], ["email", "Proposta enviada.", 3]] },
  { nome: "Dra. Helena Prass", tel: "49999880099", end: "Rua Curitiba, 55 - Centro, Videira - SC", ig: "helenaprass.adv",
    sinais: ["sem_site"], status: "fechou", nota: "Fechou site + gestão de Instagram. Começa dia 5.",
    historico: [["whatsapp", "Primeira abordagem.", 15], ["ligacao", "Fechou por telefone.", 5]] },
  { nome: "Menegatti Advocacia", tel: "49999881010", end: "Rua Anita Garibaldi, 640 - Centro, Videira - SC",
    sinais: [], status: "descartado", nota: "Já tem agência. Voltar em 6 meses." },
];

const PETSHOPS: Semente[] = [
  { nome: "Pet Vida", tel: "49998770011", end: "Rua Coronel Passos Maia, 410 - Centro, Caçador - SC", ig: "petvidacacador",
    sinais: ["parado_30d", "sem_padrao_visual"], status: "novo" },
  { nome: "Mundo Animal", tel: "49998770022", end: "Av. Barão do Rio Branco, 1200 - Bom Sucesso, Caçador - SC",
    sinais: ["sem_instagram", "sem_google_negocio"], status: "novo" },
  { nome: "Cão & Cia", tel: "49998770033", end: "Rua Santa Catarina, 88 - Berger, Caçador - SC", ig: "caoeciapet",
    sinais: ["poucos_seguidores", "nao_responde_direct"], status: "novo" },
  { nome: "Patas Felizes", tel: "49998770044", end: "Rua Frei Rogério, 305 - Centro, Caçador - SC",
    sinais: ["parado_30d"], status: "contatado", retorno: -1,
    historico: [["whatsapp", "Primeira abordagem enviada.", 4]] },
  { nome: "Espaço Pet Nine", tel: "49998770055", end: "Rua Getúlio Vargas, 76 - Martello, Caçador - SC", ig: "espacopetnine",
    sinais: ["sem_padrao_visual", "poucos_seguidores"], status: "respondeu",
    nota: "Quer ver exemplos de outros petshops.", retorno: 1,
    historico: [["whatsapp", "Mandei portfólio de feed.", 2]] },
  { nome: "AgroPet Bom Amigo", tel: "49998770066", end: "Rua Duque de Caxias, 991 - Centro, Caçador - SC",
    sinais: ["parado_30d"], status: "fechou", nota: "Fechou pacote básico de social.",
    historico: [["whatsapp", "Primeira abordagem.", 20], ["visita", "Fechou na loja.", 8]] },
];

const RESTAURANTES: Semente[] = [
  { nome: "Cantina da Nona", tel: "49997660011", end: "Rua Nereu Ramos, 220 - Centro, Fraiburgo - SC", ig: "cantinadanona",
    sinais: ["nao_anuncia", "sem_pagina_captura"], status: "novo" },
  { nome: "Sabor da Serra", tel: "49997660022", end: "Av. Videira, 1450 - Jardim Universitário, Fraiburgo - SC",
    sinais: ["nao_anuncia", "concorrente_anuncia", "sem_pixel"], status: "novo" },
  { nome: "Restaurante do Alemão", tel: "49997660033", end: "Rua das Macieiras, 33 - Centro, Fraiburgo - SC",
    sinais: ["anuncio_amador"], status: "contatado", nota: "Falei com o filho do dono.", retorno: 4,
    historico: [["whatsapp", "Primeira abordagem enviada.", 1]] },
  { nome: "Pizzaria Bella Massa", tel: "49997660044", end: "Rua São José, 610 - Fraiburgo - SC", ig: "bellamassafbg",
    sinais: [], status: "descartado", nota: "Rede, decisão vem de Chapecó." },
];

const CLINICAS: Semente[] = [
  { nome: "Clínica Vida Plena", tel: "49996550011", end: "Rua Curitiba, 300 - Centro, Videira - SC", ig: "clinicavidaplena",
    sinais: ["sem_agendamento", "controle_no_papel"], status: "novo" },
  { nome: "Odonto Sorriso", tel: "49996550022", end: "Av. Brasil, 455 - Centro, Videira - SC",
    sinais: ["sem_agendamento", "processo_manual"], status: "novo" },
  { nome: "Fisio Movimento", tel: "49996550033", end: "Rua Ipiranga, 88 - Dos Estados, Videira - SC", ig: "fisiomovimentovda",
    sinais: ["controle_no_papel", "sem_integracao"], status: "contatado", retorno: -3,
    nota: "Mostrei o painel de agendamento. Ficou de falar com a sócia.",
    historico: [["visita", "Apresentei a ideia na recepção.", 7], ["whatsapp", "Mandei o link da demo.", 5]] },
];

function montar(
  projetoId: string,
  sementes: Semente[],
  base: number,
  interacoes: Interacao[]
): Lead[] {
  return sementes.map((s, i) => {
    const id = novoId();
    const criadoEm = diasAtras(base - i * 0.1);

    (s.historico ?? []).forEach(([tipo, texto, dias]) => {
      interacoes.push({
        id: novoId(),
        lead_id: id,
        tipo,
        direcao: "saida",
        texto,
        template_id: null,
        externo_id: null,
        entregue_em: null,
        lido_em: null,
        erro: null,
        criado_em: diasAtras(dias),
      });
    });

    return {
      id,
      projeto_id: projetoId,
      nome: s.nome,
      telefone: s.tel,
      endereco: s.end,
      instagram: s.ig ?? null,
      email: null,
      sinais: Object.fromEntries(s.sinais.map((c) => [c, true])),
      status: s.status,
      nota: s.nota ?? null,
      proximo_contato: s.retorno === undefined ? null : dataEm(s.retorno),
      criado_em: criadoEm,
      atualizado_em: diasAtras(Math.max(0, base - i * 0.1 - 2)),
    };
  });
}

function projeto(
  nome: string,
  nicho: string,
  regiao: string,
  servico: string,
  dias: number,
  chaves: string[]
): Projeto {
  const catalogo = criteriosSugeridos(servico);
  const criterios: Criterio[] = chaves.map(
    (c) => catalogo.find((x) => x.chave === c) ?? { chave: c, label: c }
  );
  return {
    id: novoId(),
    nome,
    nicho,
    regiao,
    servico,
    criterios,
    criado_em: diasAtras(dias),
  };
}


/* ------------------- volume extra e histórico rico -------------------- */
/*
 * Os leads escritos à mão acima dão o tom; estes aqui dão volume, para o
 * funil, a série temporal e o mapa de atividade terem o que mostrar.
 * O histórico é derivado do status: quem respondeu tem uma resposta de
 * verdade na linha do tempo, com template atribuído.
 */

const PRIMEIROS = [
  "Central", "Bom", "Nova", "Casa", "Espaço", "Studio", "Ponto", "Vale",
  "Serra", "Sul", "Vila", "Recanto", "Arte", "Bella", "Prime", "Top",
];
const SEGUNDOS = [
  "Sabor", "Estilo", "Beleza", "Saúde", "Pet", "Móveis", "Auto", "Digital",
  "Verde", "Doce", "Forte", "Real", "Bonito", "Feliz", "Central", "Norte",
];
const RUAS = [
  "Rua Brasil", "Av. Manoel Roque", "Rua XV de Novembro", "Rua São Paulo",
  "Av. Getúlio Vargas", "Rua Paraná", "Rua das Flores", "Av. Rio Branco",
];
const BAIRROS = ["Centro", "Universitário", "Bela Vista", "Dos Estados", "São Cristóvão"];

/** Distribuição de status parecida com um funil real. */
const PESOS: [LeadStatus, number][] = [
  ["novo", 44],
  ["contatado", 22],
  ["respondeu", 13],
  ["negociando", 7],
  ["fechou", 5],
  ["descartado", 9],
];

function sorteia<T>(lista: T[], r: () => number): T {
  return lista[Math.floor(r() * lista.length)];
}

function statusSorteado(r: () => number): LeadStatus {
  const total = PESOS.reduce((a, [, p]) => a + p, 0);
  let n = r() * total;
  for (const [s, p] of PESOS) {
    n -= p;
    if (n <= 0) return s;
  }
  return "novo";
}

/** Gerador determinístico: o demo é o mesmo em toda inicialização. */
function rng(semente: number): () => number {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function horasAtras(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

const ALCANCE_DEMO: Record<LeadStatus, number> = {
  novo: 0, contatado: 1, respondeu: 2, negociando: 3, fechou: 4, descartado: 1,
};

function gerarExtras(
  projeto: Projeto,
  quantidade: number,
  semente: number,
  idsTemplates: string[],
  interacoes: Interacao[]
): Lead[] {
  const r = rng(semente);
  const chaves = projeto.criterios.map((c) => c.chave);
  const leads: Lead[] = [];

  for (let i = 0; i < quantidade; i++) {
    const nome = `${sorteia(PRIMEIROS, r)} ${sorteia(SEGUNDOS, r)}`;
    const status = statusSorteado(r);
    const id = novoId();
    const idadeH = Math.floor(r() * 70 * 24) + 6;

    const meus: string[] = chaves.filter(() => r() < 0.34);
    if (!meus.length && chaves.length) meus.push(sorteia(chaves, r));

    // Quantas vezes você tentou. Quem responde costuma responder cedo; quem
    // nunca responde é justamente quem acumula follow-up. Sem essa assimetria
    // o demo mostraria 100% de resposta nos templates de follow-up.
    const base = ALCANCE_DEMO[status];
    const insistente = status === "contatado" || status === "descartado";
    const toques =
      base === 0
        ? 0
        : insistente
          ? 1 + Math.floor(r() * 3)
          : Math.max(1, base - (r() < 0.5 ? 1 : 0));
    let ultimaSaidaH = idadeH;

    for (let t = 0; t < toques; t++) {
      const quandoH = Math.max(1, idadeH - 6 - t * (24 * (3 + Math.floor(r() * 6))));
      ultimaSaidaH = quandoH;
      interacoes.push({
        id: novoId(),
        lead_id: id,
        tipo: "whatsapp",
        direcao: "saida",
        texto: "Abordagem enviada pelo disparo.",
        template_id: idsTemplates[Math.min(t, idsTemplates.length - 1)] ?? null,
        externo_id: null,
        entregue_em: horasAtras(quandoH - 0.02),
        lido_em: r() < 0.62 ? horasAtras(quandoH - 0.4) : null,
        erro: null,
        criado_em: horasAtras(quandoH),
      });
    }

    // quem passou de "contatado" respondeu de verdade
    if (ALCANCE_DEMO[status] >= 2) {
      interacoes.push({
        id: novoId(),
        lead_id: id,
        tipo: "whatsapp",
        direcao: "entrada",
        texto: sorteia(
          [
            "Oi! Pode mandar mais detalhes?",
            "Bom dia, quanto ficaria?",
            "Interessante, me manda uma prévia",
            "Opa, to sim precisando disso",
            "Manda proposta por favor",
          ],
          r
        ),
        template_id: null,
        externo_id: null,
        entregue_em: null,
        lido_em: null,
        erro: null,
        criado_em: horasAtras(Math.max(0.5, ultimaSaidaH - 2 - r() * 40)),
      });
    }

    leads.push({
      id,
      projeto_id: projeto.id,
      nome,
      telefone: `4999${String(100000 + Math.floor(r() * 899999))}`,
      endereco: `${sorteia(RUAS, r)}, ${10 + Math.floor(r() * 900)} - ${sorteia(BAIRROS, r)}, ${projeto.regiao}`,
      instagram: r() < 0.45 ? nome.toLowerCase().replace(/[^a-z]/g, "") : null,
      email: null,
      sinais: Object.fromEntries(meus.map((c) => [c, true])),
      status,
      nota: null,
      proximo_contato:
        status === "contatado" || status === "respondeu" || status === "negociando"
          ? dataEm(Math.floor(r() * 12) - 4)
          : null,
      criado_em: horasAtras(idadeH),
      atualizado_em: horasAtras(Math.max(0, idadeH - 12)),
    });
  }

  return leads;
}

function semear(): Estado {
  const advogados = projeto("Advogados - Videira", "Advocacia", "Videira - SC", "site", 24, [
    "sem_site", "site_desatualizado", "site_sem_whats", "site_nao_mobile", "so_linktree", "sem_google_negocio", "poucas_avaliacoes", "nota_baixa",
  ]);
  const petshops = projeto("Petshops - Caçador", "Petshop", "Caçador - SC", "social", 11, [
    "sem_instagram", "parado_30d", "poucos_seguidores", "sem_padrao_visual", "nao_responde_direct", "sem_google_negocio",
  ]);
  const restaurantes = projeto("Restaurantes - Fraiburgo", "Alimentação", "Fraiburgo - SC", "trafego", 5, [
    "nao_anuncia", "concorrente_anuncia", "sem_pagina_captura", "sem_pixel", "anuncio_amador",
  ]);
  const clinicas = projeto("Clínicas - Videira", "Saúde", "Videira - SC", "aplicacoes", 2, [
    "controle_no_papel", "sem_agendamento", "processo_manual", "sem_integracao",
  ]);

  const templates: Template[] = [
    {
      id: novoId(),
      nome: "Primeira abordagem",
      texto:
        "{Oi|Olá|Bom dia} {nome}, {tudo bem|como vai}? Vi que vocês atendem aqui no {bairro} e reparei que {motivo}. Trabalho com {servico} aqui na região. {Posso te mostrar rapidinho como ficaria|Quer que eu te mande uma prévia}?",
      criado_em: diasAtras(24),
    },
    {
      id: novoId(),
      nome: "Follow-up 3 dias",
      texto:
        "{Oi|Olá} {nome}, passando aqui de novo. Chegou a ver minha mensagem sobre {servico}? Se fizer sentido eu te mando uma prévia sem compromisso.",
      criado_em: diasAtras(18),
    },
    {
      id: novoId(),
      nome: "Última tentativa",
      texto:
        "Oi {nome}, não quero insistir à toa. Se agora não for o momento, sem problema — me avisa que eu tiro da lista. Se quiser, deixo a prévia pronta e te mando.",
      criado_em: diasAtras(6),
    },
  ];

  const idsTemplates = templates.map((t) => t.id);
  const interacoes: Interacao[] = [];

  const leads = [
    ...montar(advogados.id, ADVOGADOS, 20, interacoes),
    ...montar(petshops.id, PETSHOPS, 9, interacoes),
    ...montar(restaurantes.id, RESTAURANTES, 4, interacoes),
    ...montar(clinicas.id, CLINICAS, 2, interacoes),
    ...gerarExtras(advogados, 26, 101, idsTemplates, interacoes),
    ...gerarExtras(petshops, 21, 202, idsTemplates, interacoes),
    ...gerarExtras(restaurantes, 17, 303, idsTemplates, interacoes),
    ...gerarExtras(clinicas, 14, 404, idsTemplates, interacoes),
  ];

  return {
    projetos: [clinicas, restaurantes, petshops, advogados],
    leads,
    interacoes,
    templates,
    demos: [],
  };
}

export function estado(): Estado {
  if (!global_.__leadHunterDemo) global_.__leadHunterDemo = semear();
  return global_.__leadHunterDemo;
}
