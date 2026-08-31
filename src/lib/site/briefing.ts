import {
  cidadeComUf,
  extrairBairro,
  formatarTelefone,
  nomeCurto,
} from "@/lib/format";
import { acharServico, rotulosDosSinais } from "@/lib/servicos";
import { temasDasLegendas } from "@/lib/instagram";
import type { Lead, Projeto } from "@/lib/types";

/**
 * O briefing do lead: tudo que o app já sabe, num objeto só.
 *
 * É a peça central da feature. A mesma coisa alimenta os dois caminhos —
 * o texto que você copia e cola no v0/Lovable e a chamada da OpenAI — então
 * melhorar o briefing melhora as duas saídas de uma vez.
 */
export type Briefing = {
  nome: string;
  /** nome sem Ltda/ME, que é como o site deve chamar o negócio */
  nomeCurto: string;
  nicho: string | null;
  /**
   * A praça que a página estampa — do endereço do lead, não do projeto.
   *
   * A região do projeto é onde você mandou buscar; o endereço é onde o
   * negócio está. Um projeto chamado "Advogados Joaçaba" pode ter sido
   * criado com a região errada, e aí a proposta chegaria ao cliente
   * dizendo a cidade errada — o tipo de erro que encerra a conversa antes
   * de ela começar. Quem manda é o endereço.
   */
  regiao: string | null;
  bairro: string | null;
  endereco: string | null;
  telefone: string | null;
  /** já formatado para exibir na página */
  telefoneVisivel: string | null;
  instagram: string | null;
  email: string | null;
  /** o que a agência vende para este projeto */
  servico: string | null;
  /** os sinais que qualificaram o lead, em texto */
  sinais: string[];
  /** a anotação livre que você escreveu no lead */
  observacoes: string | null;
  /** a bio do Instagram, quando o perfil já foi analisado */
  bioInstagram: string | null;
  /** as palavras que mais aparecem nas legendas do perfil */
  temas: string[];
  seguidores: number | null;
  /** texto real extraído do site próprio do negócio */
  conteudoSite?: Record<string, unknown> | null;
  /**
   * Nota e avaliações do Google, e **só quando servem de prova social**.
   *
   * Um negócio com 3,2 de nota também tem nota — mas estampar isso na
   * proposta prejudicaria o cliente em vez de ajudar. Não é esconder
   * defeito: é não usar como argumento de venda um número que argumenta
   * contra. Fica `null` abaixo do corte, e a página simplesmente não
   * mostra a faixa.
   */
  google: { nota: number; avaliacoes: number } | null;
};

/** Abaixo disto o número não vende, então não entra na página. */
const NOTA_MINIMA = 4;
const AVALIACOES_MINIMAS = 5;

export function montarBriefing(lead: Lead, projeto: Projeto): Briefing {
  const ig = lead.ig_dados;

  const nota = lead.google_nota;
  const avaliacoes = lead.google_avaliacoes;
  const google =
    nota !== null &&
    avaliacoes !== null &&
    nota >= NOTA_MINIMA &&
    avaliacoes >= AVALIACOES_MINIMAS
      ? { nota, avaliacoes }
      : null;

  return {
    google,
    // A bio é a melhor frase que existe sobre o negócio, escrita por quem o
    // conhece. Vale mais para o texto do site que qualquer palpite da LLM.
    bioInstagram: ig?.bio ?? null,
    temas: ig ? temasDasLegendas(ig, 8) : [],
    seguidores: ig?.seguidores ?? null,
    conteudoSite: lead.site_conteudo,
    nome: lead.nome,
    nomeCurto: nomeCurto(lead.nome),
    nicho: projeto.nicho,
    regiao: cidadeComUf(lead.endereco, projeto.regiao) || null,
    bairro: extrairBairro(lead.endereco, projeto.regiao) || null,
    endereco: lead.endereco,
    telefone: lead.telefone,
    telefoneVisivel: lead.telefone ? formatarTelefone(lead.telefone) : null,
    instagram: lead.instagram ? lead.instagram.replace(/^@/, "") : null,
    email: lead.email,
    servico: acharServico(projeto.servico)?.label ?? null,
    sinais: rotulosDosSinais(lead.sinais, projeto.criterios),
    observacoes: lead.nota,
  };
}

/** Só as linhas que têm valor: campo vazio no prompt convida a LLM a inventar. */
function linhas(pares: [string, string | null | undefined][]): string {
  return pares
    .filter(([, v]) => !!v && String(v).trim())
    .map(([k, v]) => `- ${k}: ${String(v).trim()}`)
    .join("\n");
}

/**
 * O briefing como texto. É o que vai na mensagem `user` da chamada da API,
 * e é também o bloco que aparece no prompt de copiar e colar.
 */
export function briefingComoTexto(b: Briefing): string {
  const corpo = linhas([
    ["Nome do negócio", b.nomeCurto],
    ["Nicho", b.nicho],
    ["Cidade/região", b.regiao],
    ["Bairro", b.bairro],
    ["Endereço", b.endereco],
    ["Telefone", b.telefoneVisivel],
    ["Instagram", b.instagram ? `@${b.instagram}` : null],
    ["E-mail", b.email],
    [
      "Conteúdo real do site do negócio",
      b.conteudoSite ? JSON.stringify(b.conteudoSite) : null,
    ],
    // A bio é o negócio se descrevendo com as próprias palavras.
    ["Como eles se descrevem no Instagram", b.bioInstagram],
    [
      "Assuntos que mais aparecem nos posts deles",
      b.temas.length ? b.temas.join(", ") : null,
    ],
    // Vai no prompt para a LLM saber que a reputação é boa e escrever
    // condizente — mas o NÚMERO quem estampa é o template, não ela.
    [
      "Reputação no Google",
      b.google
        ? `nota ${b.google.nota} com ${b.google.avaliacoes} avaliações`
        : null,
    ],
    ["Anotações minhas sobre este lead", b.observacoes],
  ]);

  const problemas = b.sinais.length
    ? `\n\nProblemas de presença digital que identifiquei neste negócio:\n${b.sinais
        .map((s) => `- ${s}`)
        .join("\n")}`
    : "";

  return `${corpo}${problemas}`;
}

/**
 * O prompt completo para colar num gerador de site (v0, Lovable, Claude).
 *
 * Caminho manual: custo zero, e serve de escape quando a geração automática
 * não agradou. O texto pede HTML porque aqui quem monta a página é a
 * ferramenta do outro lado — diferente da chamada da API, onde a LLM só
 * devolve o conteúdo e o `render.ts` monta.
 */
export function promptParaColar(b: Briefing): string {
  return `Crie uma landing page institucional de uma página para o negócio abaixo.

DADOS DO NEGÓCIO
${briefingComoTexto(b)}

REQUISITOS
- HTML único, com CSS embutido. Sem framework, sem build, sem dependência externa.
- Responsivo de verdade: testar mentalmente em 360px de largura.
- Seções: topo com chamada, sobre, serviços (3 a 6), diferenciais, contato.
- Botão flutuante de WhatsApp para o telefone acima, com mensagem pronta.
- Escolha a paleta e a tipografia pelo nicho. Nada de roxo genérico de template.
- Português do Brasil. Tom condizente com o ramo.

O QUE NÃO FAZER
- Não invente número ("+500 clientes", "15 anos de mercado", nota, prêmio).
  Só use fato que está nos dados acima. Isto vai ser mostrado ao dono do
  negócio: um número errado destrói a credibilidade da proposta.
- Não invente depoimento de cliente com nome de pessoa.
- Não use imagem de banco de imagens por URL: use gradiente, cor e tipografia.`;
}
