import type { Briefing } from "./briefing";
import { ESTILOS, LAYOUTS, PALETAS, type ConteudoSite } from "./tipos";

/**
 * Conteúdo de mentira para o modo demo.
 *
 * O resto do app já roda inteiro sem chave nenhuma; a demo de site não podia
 * ser a única parte que exige cartão para você ver como ficou. Isto devolve
 * o mesmo formato que a OpenAI devolveria, montado a partir do briefing,
 * sem sair da máquina e sem gastar token.
 *
 * Serve também de teste do `render.ts`: se o layout quebra, quebra aqui.
 */

/** Hash bobo e estável: o mesmo lead cai sempre na mesma cara. */
function semente(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function conteudoDeExemplo(b: Briefing): ConteudoSite {
  const s = semente(b.nomeCurto || "demo");
  const ramo = (b.nicho ?? "atendimento").toLowerCase();
  const lugar = b.bairro ?? b.regiao ?? null;
  // "em X" em vez de "no/na X": bairro tem genero e o texto e montado sem
  // saber qual. "no Bela Vista" e o tipo de erro que estraga a proposta.
  const onde = lugar ? `em ${lugar}` : "na região";

  return {
    titulo: b.nomeCurto,
    chamada: `${b.nicho ?? "Atendimento"} de confiança ${onde}`,
    subchamada: `Atendimento direto, sem enrolação e sem fila de espera. Fale com a gente pelo WhatsApp e resolva hoje.`,
    sobre_titulo: `Quem somos`,
    sobre: [
      `A ${b.nomeCurto} atende ${onde} com foco em ${ramo}. O trabalho é feito por quem entende do assunto, e cada cliente fala direto com quem executa.`,
      `Sem intermediário e sem processo burocrático: você explica o que precisa, recebe uma resposta clara e sabe exatamente o que vai acontecer.`,
    ],
    servicos_titulo: `O que a gente resolve`,
    servicos: [
      {
        nome: "Atendimento personalizado",
        descricao:
          "Cada caso é avaliado individualmente antes de qualquer proposta, sem pacote fechado.",
      },
      {
        nome: "Resposta rápida",
        descricao:
          "Mensagem respondida no mesmo dia útil, direto no WhatsApp, por uma pessoa de verdade.",
      },
      {
        nome: "Preço combinado antes",
        descricao:
          "Você sabe quanto vai pagar antes de começar. Nada de surpresa no final.",
      },
    ],
    diferenciais: [
      `Atendimento ${onde}`,
      "Resposta no mesmo dia",
      "Orçamento sem compromisso",
    ],
    passos_titulo: "Como funciona",
    passos: [
      {
        titulo: "Você chama no WhatsApp",
        texto: "Conta o que precisa, do jeito que der. A gente responde no mesmo dia útil.",
      },
      {
        titulo: "A gente avalia",
        texto: "Olhamos o caso antes de falar preço, e dizemos na hora se conseguimos ajudar.",
      },
      {
        titulo: "Combinamos o dia",
        texto: "Com valor fechado antes de começar. Sem surpresa no final.",
      },
    ],
    faq: [
      {
        pergunta: "Precisa agendar?",
        resposta:
          "Chame no WhatsApp que a gente confirma a disponibilidade e reserva o melhor horário para você.",
      },
      {
        pergunta: "Fazem orçamento sem compromisso?",
        resposta:
          "Fazemos. Você conta o que precisa, a gente avalia e passa o valor. Se não fizer sentido, ninguém fica devendo nada.",
      },
      {
        pergunta: "Como é a forma de pagamento?",
        resposta:
          "Combinamos junto com o orçamento, antes de começar o trabalho.",
      },
    ],
    cta_titulo: "Vamos conversar?",
    cta_texto:
      "Manda uma mensagem contando o que você precisa. A gente responde rápido e diz na hora se conseguimos ajudar.",
    cta_botao: "Chamar no WhatsApp",
    // Varia por lead para o modo demo nao mostrar sempre a mesma cara.
    // Semente separada para o estilo de proposito: com `s % 3` e `s % 6` a
    // partir do mesmo numero, o resto de 3 sai do resto de 6 — a paleta
    // decidiria o estilo sozinha e so 6 das 18 combinacoes apareceriam.
    // Em ingles, como o prompt manda: e assim que o acervo e indexado.
    busca_imagens: [`${ramo} business`, `${ramo} professional working`],
    paleta: PALETAS[s % PALETAS.length],
    estilo: ESTILOS[semente(`${b.nomeCurto}|estilo`) % ESTILOS.length],
    layout: LAYOUTS[semente(`${b.nomeCurto}|layout`) % LAYOUTS.length],
  };
}
