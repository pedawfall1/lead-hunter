import { ImageResponse } from "next/og";
import { obterDemoPorSlug } from "@/lib/db";
import { cores } from "@/lib/site/paletas";

/**
 * A miniatura que o WhatsApp mostra quando você manda o link da demo.
 *
 * Sem isto o link chega pelado — texto azul e mais nada. Com ela o cliente
 * vê o nome do próprio negócio e a chamada antes mesmo de clicar, e é isso
 * que faz ele clicar.
 *
 * Desenhada aqui em vez de virar print da página: o WhatsApp quer 1200x630,
 * e uma captura da página inteira encolhida a esse tamanho fica ilegível.
 *
 * Satori (o motor do ImageResponse) só entende um subconjunto de CSS —
 * flexbox sim, grid não, e todo elemento com mais de um filho precisa de
 * `display: flex` explícito.
 *
 * AVISO: esta rota não foi testada localmente. O `@vercel/og` carrega a
 * fonte dele por URL de arquivo no momento em que o módulo sobe, e isso
 * quebra quando a pasta do projeto tem espaço no nome — que é o caso desta
 * máquina ("Backup PC"). Passar `fonts` não resolve, porque a falha é antes
 * de o parâmetro ser lido. Em Linux, como na Vercel, o caminho não tem
 * espaço e o problema não existe.
 *
 * Se mesmo assim falhar em produção, nada quebra: a rota devolve erro, o
 * WhatsApp ignora a miniatura e mostra título e descrição, que vêm das
 * metatags e funcionam de forma independente. Para conferir depois do
 * deploy, cole o link em developers.facebook.com/tools/debug.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LARGURA = 1200;
const ALTURA = 630;

/**
 * A fonte vai explícita em vez de deixar o `@vercel/og` pegar a dele.
 *
 * O carregador padrão monta o caminho do arquivo por URL, e quebra quando a
 * pasta do projeto tem espaço no nome ("Backup PC" vira "Backup%20PC" e o
 * `fileURLToPath` recusa). Lendo daqui, o caminho é comum e funciona em
 * qualquer máquina.
 */
async function fonte(): Promise<ArrayBuffer | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const buf = await readFile(join(process.cwd(), "public", "fonte-og.ttf"));
    return buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const demo = await obterDemoPorSlug(params.slug);

  if (!demo) {
    return new Response("Not found", { status: 404 });
  }

  const ttf = await fonte();
  if (!ttf) {
    // Sem fonte o Satori nao desenha texto nenhum. Melhor nao devolver
    // imagem do que devolver um retangulo vazio: o WhatsApp so ignora a
    // miniatura e mostra o link, que e o comportamento de antes.
    return new Response("Fonte da imagem indisponível", { status: 404 });
  }

  const c = demo.conteudo;
  const paleta = cores(
    c?.paleta ?? "sobrio_azul",
    c?.estilo ?? "escuro",
    c?.cor_marca
  );

  try {
    return new ImageResponse(
      (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: paleta.fundo,
          padding: "72px 80px",
          fontFamily: "Noto Sans",
        }}
      >
        {/* faixa da cor da marca no topo, para a miniatura ter a cara do site */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 14,
            background: paleta.marca,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: paleta.marca,
              fontWeight: 400,
            }}
          >
            {demo.titulo}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 68,
              lineHeight: 1.1,
              color: paleta.texto,
              fontWeight: 400,
              maxWidth: 980,
            }}
          >
            {c?.chamada ?? demo.titulo}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 30,
              lineHeight: 1.4,
              color: paleta.suave,
              maxWidth: 900,
            }}
          >
            {c?.subchamada ?? ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              background: paleta.marca,
              color: paleta.marcaTexto,
              padding: "14px 30px",
              borderRadius: 12,
              fontSize: 26,
              fontWeight: 400,
            }}
          >
            {c?.cta_botao ?? "Falar no WhatsApp"}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: paleta.suave }}>
            Proposta de site
          </div>
        </div>
      </div>
    ),
      {
        width: LARGURA,
        height: ALTURA,
        fonts: [{ name: "Noto Sans", data: ttf, weight: 400, style: "normal" }],
        headers: {
          // Despublicar tem que sumir com a miniatura tambem.
          "cache-control": "no-store",
        },
      }
    );
  } catch {
    // Sem miniatura o link ainda chega com titulo e descricao. Melhor
    // isso do que a rota derrubar o pedido inteiro.
    return new Response("Não foi possível gerar a imagem", { status: 404 });
  }
}
