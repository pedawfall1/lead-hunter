import { DEMO } from "@/lib/config";
import { buscarImagens } from "./pexels";
import { conteudoDeExemplo } from "./exemplo";
import { briefingComoTexto, type Briefing } from "./briefing";
import {
  ESQUEMA_CONTEUDO,
  saneiarConteudo,
  type ConteudoSite,
} from "./tipos";

/**
 * A chamada da OpenAI. Fetch direto, sem SDK — mesma escolha do `apify.ts`:
 * é uma requisição só, e dependência a menos é build mais rápido na Vercel.
 */

const CHAVE = process.env.OPENAI_API_KEY ?? "";

/**
 * Modelo em variável de ambiente de propósito: nome de modelo muda toda
 * temporada e trocar de modelo não pode virar deploy de código. Use um da
 * classe barata — o trabalho aqui é escrever 1,5k tokens de texto, não
 * raciocinar. Confira o nome exato no painel da OpenAI antes de trocar.
 */
const MODELO = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * No modo demo a geração funciona sem chave: o conteúdo sai de
 * `exemplo.ts`. O resto do app roda inteiro sem configurar nada, e esta
 * feature não podia ser a única que exige cartão para você ver a tela.
 */
export function openaiConfigurado(): boolean {
  return DEMO || !!CHAVE;
}

export function modeloEmUso(): string {
  return MODELO;
}

/**
 * As instruções fixas.
 *
 * Quase tudo aqui é sobre NÃO inventar. A página vai ser mostrada ao dono do
 * negócio como proposta comercial: um "15 anos de mercado" chutado num
 * negócio de 2 anos não é um detalhe estético, é a proposta indo pro lixo.
 */
const SISTEMA = `Você escreve o conteúdo de landing pages institucionais para pequenos negócios brasileiros. Devolve JSON, nunca HTML.

REGRA PRINCIPAL — não invente fato:
- Nada de número inventado: anos de mercado, quantidade de clientes, nota, prêmio, certificação.
- Nada de depoimento com nome de pessoa.
- Se você não sabe algo do negócio, escreva a frase sem esse dado. É melhor genérico e verdadeiro do que específico e falso.
- Esta página será mostrada ao dono do negócio, que sabe a verdade sobre ele.

TAMANHOS (respeite, o layout depende disso):
- chamada: até 60 caracteres, uma frase de impacto
- subchamada: até 140 caracteres
- sobre: exatamente 2 parágrafos, 2 a 4 frases cada
- servicos: 3 a 6 itens; descrição de até 180 caracteres
- diferenciais: exatamente 3, no máximo 60 caracteres cada, sem ponto final
- cta_botao: até 30 caracteres, verbo no infinitivo

busca_imagens: 2 a 3 buscas de banco de imagens, EM INGLÊS, que ilustrem este ramo. O acervo é indexado em inglês — "barbearia" traz muito menos e pior que "barber shop".
- Concreto e fotografável: "dental clinic interior", "mechanic repairing car engine", "lawyer office desk".
- Nada de abstração ("success", "quality") nem de nome do negócio: o acervo não tem foto da loja específica.
- Varie o enquadramento entre elas: um ambiente, uma pessoa trabalhando, um detalhe.

ESCOLHAS DE ESTILO:
- paleta e estilo combinam com o ramo: advocacia e contabilidade pedem sobriedade; alimentação pede cor quente; saúde e estética pedem claro e limpo; oficina e construção pedem contraste forte.
- Não repita a mesma combinação para todo mundo.

TOM: português do Brasil, direto, sem jargão de marketing. Nada de "soluções inovadoras", "excelência" ou "parceria de sucesso". Fale como o dono do negócio falaria de si mesmo se soubesse escrever bem.`;

export type ResultadoGeracao = {
  conteudo: ConteudoSite;
  modelo: string;
  /** tokens gastos, para você ver o custo real por demo na tela */
  tokens: { entrada: number; saida: number };
};

export async function gerarConteudo(
  briefing: Briefing
): Promise<ResultadoGeracao> {
  if (DEMO) {
    const exemplo = saneiarConteudo(conteudoDeExemplo(briefing));
    exemplo.imagens = await buscarImagens(exemplo.busca_imagens);
    return {
      conteudo: exemplo,
      modelo: "exemplo (modo demo)",
      tokens: { entrada: 0, saida: 0 },
    };
  }

  if (!CHAVE) throw new Error("OPENAI_API_KEY não configurada.");

  const pedido = {
    model: MODELO,
    messages: [
      { role: "system", content: SISTEMA },
      {
        role: "user",
        content: `Escreva o conteúdo do site deste negócio:\n\n${briefingComoTexto(
          briefing
        )}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "conteudo_site",
        strict: true,
        schema: ESQUEMA_CONTEUDO,
      },
    },
  };

  let resposta: Response;
  try {
    resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${CHAVE}`,
      },
      body: JSON.stringify(pedido),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      throw new Error("A OpenAI demorou demais para responder. Tente de novo.");
    }
    throw e;
  }

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    if (resposta.status === 401)
      throw new Error("Chave da OpenAI recusada. Confira OPENAI_API_KEY.");
    if (resposta.status === 429)
      throw new Error(
        "OpenAI recusou por limite de uso ou crédito. Confira o saldo da conta."
      );
    if (resposta.status === 404 || resposta.status === 400) {
      // o caso mais comum aqui e nome de modelo errado ou modelo que nao
      // aceita json_schema — vale dizer qual modelo foi tentado
      throw new Error(
        `OpenAI recusou o pedido com o modelo "${MODELO}". ${corpo.slice(0, 200)}`
      );
    }
    throw new Error(`OpenAI respondeu ${resposta.status}. ${corpo.slice(0, 200)}`);
  }

  const dados = (await resposta.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const escolha = dados.choices?.[0];

  // Com strict:true o JSON vem valido, mas so se o modelo chegou ao fim.
  // Cortado no meio ("length") ele devolve JSON truncado.
  if (escolha?.finish_reason === "length") {
    throw new Error(
      "A resposta da OpenAI foi cortada antes do fim. Tente de novo."
    );
  }

  const texto = escolha?.message?.content;
  if (!texto) throw new Error("A OpenAI respondeu sem conteúdo.");

  let bruto: ConteudoSite;
  try {
    bruto = JSON.parse(texto) as ConteudoSite;
  } catch {
    throw new Error("A OpenAI devolveu um JSON que não deu para ler.");
  }

  const conteudo = saneiarConteudo(bruto);

  // Depois da LLM, nao junto: ela escreve a busca, quem acha a foto e o
  // Pexels. Se a busca falhar, `imagens` fica vazio e o site cai no
  // gradiente — imagem e melhoria, nao requisito.
  conteudo.imagens = await buscarImagens(conteudo.busca_imagens);

  return {
    conteudo,
    modelo: MODELO,
    tokens: {
      entrada: dados.usage?.prompt_tokens ?? 0,
      saida: dados.usage?.completion_tokens ?? 0,
    },
  };
}
