import { extrairBairro, formatarTelefone, nomeCurto } from "@/lib/format";
import { acharServico, rotulosDosSinais } from "@/lib/servicos";
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
};

export function montarBriefing(lead: Lead, projeto: Projeto): Briefing {
  return {
    nome: lead.nome,
    nomeCurto: nomeCurto(lead.nome),
    nicho: projeto.nicho,
    regiao: projeto.regiao,
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
