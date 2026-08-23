import type { Lead, LeadStatus, Projeto, Template } from "@/lib/types";

/**
 * Banco de mentira do modo demo: vive na memoria do processo.
 * Guardado no globalThis para sobreviver ao hot reload do `next dev`.
 * Em serverless, um cold start volta tudo ao estado inicial — e proposital,
 * o demo nao guarda nada de verdade.
 */
type Estado = {
  projetos: Projeto[];
  leads: Lead[];
  templates: Template[];
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

function diasAtras(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

type Semente = [
  nome: string,
  telefone: string | null,
  endereco: string | null,
  temSite: boolean,
  instagram: string | null,
  status: LeadStatus,
  nota: string | null,
];

const ADVOGADOS: Semente[] = [
  ["Advocacia Silva & Ramos", "49999880011", "Rua Brasil, 120 - Centro, Videira - SC", false, "advocaciasilvaramos", "novo", null],
  ["Dra. Marina Kohler", "49999880022", "Av. Manoel Roque, 88 - Centro, Videira - SC", false, null, "novo", null],
  ["Escritorio Bertoldi", "49999880033", "Rua Sao Francisco, 45 - Universitario, Videira - SC", true, "bertoldiadv", "novo", null],
  ["Zanella Advogados", "49999880044", "Rua XV de Novembro, 300 - Centro, Videira - SC", false, null, "contatado", "Mandei o primeiro contato terca de manha."],
  ["Advocacia Trentin", "49999880055", "Rua das Palmeiras, 12 - Bela Vista, Videira - SC", false, "trentinadv", "contatado", null],
  ["Dr. Anderson Fachin", "49999880066", "Av. Brasil, 902 - Centro, Videira - SC", false, null, "respondeu", "Pediu pra mandar valores por WhatsApp."],
  ["Cunha & Associados", "49999880077", "Rua Governador Jorge Lacerda, 77 - Centro, Videira - SC", true, "cunhaassoc", "respondeu", "Ja tem site mas odeia. Quer refazer."],
  ["Advocacia Bortoluzzi", "49999880088", "Rua Ipiranga, 210 - Dos Estados, Videira - SC", false, null, "negociando", "Proposta de R$ 1.800 enviada. Retorno na sexta."],
  ["Dra. Helena Prass", "49999880099", "Rua Curitiba, 55 - Centro, Videira - SC", false, "helenaprass.adv", "fechou", "Fechou site + gestao de Instagram. Comeca dia 5."],
  ["Menegatti Advocacia", "49999881010", "Rua Anita Garibaldi, 640 - Centro, Videira - SC", true, null, "descartado", "Ja tem agencia. Voltar em 6 meses."],
];

const PETSHOPS: Semente[] = [
  ["Pet Vida", "49998770011", "Rua Coronel Passos Maia, 410 - Centro, Cacador - SC", false, "petvidacacador", "novo", null],
  ["Mundo Animal", "49998770022", "Av. Barao do Rio Branco, 1200 - Bom Sucesso, Cacador - SC", false, null, "novo", null],
  ["Cao & Cia", "49998770033", "Rua Santa Catarina, 88 - Berger, Cacador - SC", false, "caoeciapet", "novo", null],
  ["Patas Felizes", "49998770044", "Rua Frei Rogerio, 305 - Centro, Cacador - SC", true, null, "contatado", null],
  ["Espaco Pet Nine", "49998770055", "Rua Getulio Vargas, 76 - Martello, Cacador - SC", false, "espacopetnine", "respondeu", "Quer ver exemplos de outros petshops."],
  ["AgroPet Bom Amigo", "49998770066", "Rua Duque de Caxias, 991 - Centro, Cacador - SC", false, null, "fechou", "Fechou pacote basico."],
];

const RESTAURANTES: Semente[] = [
  ["Cantina da Nona", "49997660011", "Rua Nereu Ramos, 220 - Centro, Fraiburgo - SC", false, "cantinadanona", "novo", null],
  ["Sabor da Serra", "49997660022", "Av. Videira, 1450 - Jardim Universitario, Fraiburgo - SC", false, null, "novo", null],
  ["Restaurante do Alemao", "49997660033", "Rua das Macieiras, 33 - Centro, Fraiburgo - SC", false, null, "contatado", "Falei com o filho do dono."],
  ["Pizzaria Bella Massa", "49997660044", "Rua Sao Jose, 610 - Fraiburgo - SC", true, "bellamassafbg", "descartado", "Rede, decisao vem de Chapeco."],
];

function montarLeads(projetoId: string, sementes: Semente[], base: number): Lead[] {
  return sementes.map(([nome, telefone, endereco, temSite, instagram, status, nota], i) => ({
    id: novoId(),
    projeto_id: projetoId,
    nome,
    telefone,
    endereco,
    tem_site: temSite,
    instagram,
    status,
    nota,
    criado_em: diasAtras(base - i * 0.1),
    atualizado_em: diasAtras(Math.max(0, base - i * 0.1 - 2)),
  }));
}

function semear(): Estado {
  const advogados: Projeto = {
    id: novoId(),
    nome: "Advogados - Videira",
    nicho: "Advocacia",
    regiao: "Videira - SC",
    criado_em: diasAtras(24),
  };
  const petshops: Projeto = {
    id: novoId(),
    nome: "Petshops - Cacador",
    nicho: "Petshop",
    regiao: "Cacador - SC",
    criado_em: diasAtras(11),
  };
  const restaurantes: Projeto = {
    id: novoId(),
    nome: "Restaurantes - Fraiburgo",
    nicho: "Alimentacao",
    regiao: "Fraiburgo - SC",
    criado_em: diasAtras(3),
  };

  return {
    projetos: [restaurantes, petshops, advogados],
    leads: [
      ...montarLeads(advogados.id, ADVOGADOS, 20),
      ...montarLeads(petshops.id, PETSHOPS, 9),
      ...montarLeads(restaurantes.id, RESTAURANTES, 2),
    ],
    templates: [
      {
        id: novoId(),
        nome: "Primeira abordagem",
        texto:
          "Oi {nome}, tudo bem? Vi que voces atendem aqui no {bairro} e reparei que nao encontrei o site de voces. Trabalho ajudando negocios da regiao a aparecer no Google. Posso te mostrar rapidinho como ficaria?",
        criado_em: diasAtras(24),
      },
      {
        id: novoId(),
        nome: "Follow-up 3 dias",
        texto:
          "Oi {nome}, passando aqui de novo. Chegou a ver minha mensagem sobre a divulgacao de voces no {bairro}? Se fizer sentido eu te mando uma previa sem compromisso.",
        criado_em: diasAtras(18),
      },
      {
        id: novoId(),
        nome: "Quem ja tem site",
        texto:
          "Oi {nome}! Achei voces pesquisando por servicos no {bairro}. O site de voces existe, mas nao aparece nas primeiras posicoes do Google. Quer que eu mande um diagnostico rapido, de graca?",
        criado_em: diasAtras(6),
      },
    ],
  };
}

export function estado(): Estado {
  if (!global_.__leadHunterDemo) global_.__leadHunterDemo = semear();
  return global_.__leadHunterDemo;
}

export function agora(): string {
  return new Date().toISOString();
}
