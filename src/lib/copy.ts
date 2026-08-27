/**
 * A copy de prospecção, em um lugar só.
 *
 * Fica aqui e não só no banco por dois motivos: o modo demo semeia a partir
 * daqui, e um Supabase novo pode ser populado sem ninguém redigitar dez
 * mensagens. Editar no app depois é livre — isto é o ponto de partida, não
 * a fonte da verdade.
 *
 * Variáveis: {nome} {bairro} {servico} {motivo} {demo}
 * Alternativas: {Oi|Olá|Bom dia} sorteia uma a cada disparo.
 *
 * Os números que aparecem nas objeções (R$ 90/mês, 7 dias de prazo, 7 dias
 * de garantia) são promessas comerciais suas, não invenção do sistema — se
 * mudarem, mude aqui e nos templates já salvos.
 */
export type TemplateInicial = { nome: string; texto: string };

export const COPY_PROSPECCAO: TemplateInicial[] = [
  {
    nome: "1. Primeira abordagem",
    texto: `{Oi|Olá|Bom dia}! Vi que vocês são o {nome} aqui no {bairro} e reparei uma coisa: {motivo}.

Fiz um rascunho de site pra vocês, só pra mostrar como ficaria. Dá uma olhada, é rapidinho:
{demo}

Se fizer sentido pra vocês, a gente conversa. Se não, sem problema nenhum 🙂`,
  },
  {
    nome: "2A. Respondeu positivo",
    texto: `Que bom que curtiu! 😊 Isso que te mandei é só uma demonstração — o site de verdade sai com o conteúdo certinho, ajustado do jeito que vocês trabalham, e no ar pra valer (esse ainda não aparece no Google, é só pra vocês verem a ideia).

Posso te passar como funciona? É rapidinho.`,
  },
  {
    nome: "2B. Desconfiança / quem é você",
    texto: `Sou daqui de {bairro} mesmo, trabalho com {servico} pra negócio local. Vi o perfil de vocês no Google e no Insta e resolvi já montar um rascunho pra mostrar, em vez de só mandar mensagem perguntando se tem interesse. Não custa nada pra você olhar, e não tem nenhum compromisso.`,
  },
  {
    nome: "Objeção — quanto custa",
    texto: `O site fica R$90 por mês, sem contrato longo. Fica pronto em até 7 dias, e tem garantia de 7 dias — se não gostar, devolvo o que pagou. Quer que eu já ajuste esse rascunho com os dados certinhos de vocês?`,
  },
  {
    nome: "Objeção — já tenho quem cuida",
    texto: `Boa, que ótimo que já tem! Só uma pergunta rápida: esse site de vocês tá aparecendo bem no Google e abrindo direito no celular? Reparei que {motivo}. Se um dia quiser uma segunda opinião ou trocar, é só chamar.`,
  },
  {
    nome: "Objeção — só uso Instagram",
    texto: `Entendo, muita gente trabalha bem só com o Insta mesmo. A diferença é que quem te procura no Google direto — sem saber seu Instagram — não te acha. O site funciona mais como uma porta extra de entrada, não troca o Insta, complementa. Mas se pra vocês tá funcionando bem assim, sem problema!`,
  },
  {
    nome: "Objeção — isso é golpe?",
    texto: `Entendo a desconfiança, tem muito golpe rolando mesmo. Pode abrir o link tranquilo — é só uma página de demonstração, não pede senha, não pede cartão, nada. Se preferir, te chamo em vídeo rapidinho pra te mostrar direto na tela também.`,
  },
  {
    nome: "Follow-up dia 3",
    texto: `Oi, {nome}! Só passando pra saber se chegou a ver o rascunho do site que te mandei. Qualquer coisa, tô por aqui 🙂`,
  },
  {
    nome: "Follow-up dia 7",
    texto: `{nome}, sem pressa nenhuma — só deixando o link aqui de novo caso tenha passado batido: {demo}

Se quiser ajustar algo ou já saber como funciona, é só chamar.`,
  },
  {
    nome: "Follow-up dia 14 — pergunta direta",
    texto: `Oi! Vou te fazer uma pergunta direta: faz sentido pra vocês terem um site agora, ou é melhor eu parar de incomodar por aqui? Sem problema nenhum se for a segunda opção 🙂`,
  },
  {
    nome: "Dia 30 — encerramento educado",
    texto: `Vou encerrar por aqui então, {nome}! Se um dia fizer sentido, é só me chamar — o rascunho continua disponível: {demo}

Sucesso pro {nome} 🙌`,
  },
];
