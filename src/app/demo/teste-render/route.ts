import { renderizarSite } from "@/lib/site/render";
import type { Briefing } from "@/lib/site/briefing";
import type { ImagemSite } from "@/lib/site/pexels";
import type { ConteudoSite } from "@/lib/site/tipos";

/**
 * Bancada do template, só em desenvolvimento.
 *
 * `/demo/teste-render` renderiza uma demo de mentira com fotos reais do
 * Pexels. Os parâmetros trocam o que quiser sem gerar nada:
 * `?semfoto`, `?layout=dividido|centrado`, `?estilo=claro|elegante`,
 * `?paleta=verde_natural`. Serve para mexer no `render.ts` e ver o
 * resultado na hora, sem gastar chamada de OpenAI nem criar linha no banco.
 */

export const dynamic = "force-dynamic";

const briefing: Briefing = {
  nome: "Studio Vertice Arquitetura Ltda",
  nomeCurto: "Studio Vertice Arquitetura",
  nicho: "Arquitetura",
  regiao: "Videira - SC",
  bairro: "Centro",
  endereco: "R. Cel. Fagundes, 100 - Centro, Videira - SC",
  telefone: "49999388204",
  telefoneVisivel: "(49) 99938-8204",
  instagram: "studiovertice",
  email: "contato@studiovertice.com.br",
  servico: "Site / Landing page",
  sinais: ["Não tem site"],
  observacoes: null,
  bioInstagram:
    "Arquitetura residencial e comercial em Videira. Projeto, interiores e obra.",
  temas: ["projeto", "obra", "interiores", "reforma"],
  seguidores: 1840,
  google: { nota: 4.8, avaliacoes: 127 },
};

const imagens: ImagemSite[] = [
  {
    url: "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1600",
    urlMedia:
      "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Escritorio",
    autor: "Christina Morillo",
    autorUrl: "https://www.pexels.com/@divinetechygirl",
    cor: "#5a5a5a",
  },
  {
    url: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1600",
    urlMedia:
      "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Equipe reunida",
    autor: "fauxels",
    autorUrl: "https://www.pexels.com/@fauxels",
    cor: "#7a6a55",
  },
  {
    url: "https://images.pexels.com/photos/2760241/pexels-photo-2760241.jpeg?auto=compress&cs=tinysrgb&w=1600",
    urlMedia:
      "https://images.pexels.com/photos/2760241/pexels-photo-2760241.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Mesa de trabalho",
    autor: "Ivan Samkov",
    autorUrl: "https://www.pexels.com/@ivan-samkov",
    cor: "#8a8070",
  },
  {
    url: "https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg?auto=compress&cs=tinysrgb&w=1600",
    urlMedia:
      "https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Projeto",
    autor: "Pixabay",
    autorUrl: "https://www.pexels.com/@pixabay",
    cor: "#6b6b6b",
  },
];

const conteudo: ConteudoSite = {
  titulo: "Studio Vertice",
  chamada: "Projetos que cabem no seu terreno e no seu bolso",
  subchamada:
    "Arquitetura residencial e comercial em Videira, do estudo inicial à obra entregue.",
  sobre_titulo: "Um escritório pequeno, por opção",
  sobre: [
    "O Studio Vertice atende em Videira com foco em projeto residencial e comercial. Cada projeto é acompanhado por quem desenhou, do primeiro croqui até a última visita de obra.",
    "Sem etapa terceirizada e sem prazo elástico: você sabe o que vai receber, quando, e conversa direto com o arquiteto responsável.",
  ],
  servicos_titulo: "Como podemos trabalhar juntos",
  servicos: [
    {
      nome: "Projeto arquitetônico",
      descricao:
        "Do levantamento ao executivo, com plantas, cortes e detalhamento pronto para orçar com qualquer construtora.",
    },
    {
      nome: "Interiores e marcenaria",
      descricao:
        "Layout, iluminação e desenho de marcenaria sob medida, compatibilizados com o projeto da obra.",
    },
    {
      nome: "Acompanhamento de obra",
      descricao:
        "Visitas periódicas para garantir que o que foi desenhado é o que está sendo construído.",
    },
    {
      nome: "Regularização",
      descricao:
        "Aprovação na prefeitura, habite-se e a papelada que trava a entrega no final.",
    },
  ],
  diferenciais: [
    "Atendimento em Videira",
    "Conversa direta com o arquiteto",
    "Prazo combinado antes",
  ],
  passos_titulo: "Do primeiro contato à obra",
  passos: [
    {
      titulo: "Conversa inicial",
      texto:
        "Você conta a ideia e mostra o terreno. A gente diz na hora se dá para fazer o que você quer.",
    },
    {
      titulo: "Estudo e orçamento",
      texto:
        "Desenhamos as primeiras opções e fechamos escopo e valor antes de qualquer coisa começar.",
    },
    {
      titulo: "Projeto e obra",
      texto:
        "Executivo detalhado e visitas periódicas até a última parede levantada.",
    },
  ],
  faq: [
    {
      pergunta: "Vocês fazem projeto para reforma também?",
      resposta:
        "Fazemos. Manda uma foto do que existe hoje e o que você quer mudar, que a gente avalia.",
    },
    {
      pergunta: "Precisa ter o terreno para começar?",
      resposta:
        "Ajuda muito, mas dá para começar pelo estudo de viabilidade antes da compra.",
    },
    {
      pergunta: "Vocês acompanham a obra?",
      resposta:
        "Sim, com visitas periódicas. Combinamos a frequência junto com o escopo.",
    },
  ],
  cta_titulo: "Vamos tirar seu projeto do papel?",
  cta_texto:
    "Manda uma mensagem com a ideia e o terreno. A gente responde rápido e diz na hora se conseguimos ajudar.",
  cta_botao: "Falar no WhatsApp",
  busca_imagens: ["architecture office", "architect working"],
  paleta: "quente_terra",
  layout: "classico",
  estilo: "escuro",
  imagens,
};

export async function GET(req: Request) {
  // Só em desenvolvimento: é bancada de trabalho para ajustar o template
  // sem gastar chamada de API, não uma página do produto.
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const p = new URL(req.url).searchParams;
  const semFoto = p.has("semfoto");
  // ?layout=dividido | centrado, para comparar as tres plantas na hora
  const layout = p.get("layout") as ConteudoSite["layout"] | null;
  // ?estilo=claro | elegante, para conferir a tipografia de cada um
  const estilo = p.get("estilo") as ConteudoSite["estilo"] | null;
  const paleta = p.get("paleta") as ConteudoSite["paleta"] | null;
  const html = renderizarSite(
    {
      ...conteudo,
      ...(semFoto ? { imagens: [] } : {}),
      ...(layout ? { layout } : {}),
      ...(estilo ? { estilo } : {}),
      ...(paleta ? { paleta } : {}),
    },
    briefing
  );
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
