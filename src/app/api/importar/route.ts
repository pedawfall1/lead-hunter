import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { criteriosDoProjeto, importarDoMapaDb, type LeadDoMapa } from "@/lib/db";
import { normalizarLugar, sinaisDoLugar, type LugarBruto } from "@/lib/mapas";
import { TOKEN_CALLBACK } from "@/lib/n8n";
import { mensagemDeErro } from "@/lib/erros";

export const dynamic = "force-dynamic";

/**
 * Recebe o resultado de uma busca no mapa.
 *
 *   POST /api/importar
 *   x-lh-token: <LH_WEBHOOK_TOKEN>
 *   { "projeto_id": "...", "lugares": [ { ...item do Apify... } ] }
 *
 * Aceita o item do scraper como veio: os apelidos de campo são resolvidos
 * em src/lib/mapas.ts. Quem já está no projeto (mesmo place_id ou mesmo
 * telefone) é pulado, então rodar a mesma busca duas vezes não duplica.
 */
export async function POST(request: NextRequest) {
  if (!TOKEN_CALLBACK) {
    return NextResponse.json(
      { erro: "LH_WEBHOOK_TOKEN não configurado no servidor." },
      { status: 503 }
    );
  }
  if (request.headers.get("x-lh-token") !== TOKEN_CALLBACK) {
    return NextResponse.json({ erro: "Token inválido." }, { status: 401 });
  }

  let corpo: { projeto_id?: string; lugares?: LugarBruto[] };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const projetoId = corpo.projeto_id;
  const lugares = corpo.lugares;

  if (!projetoId) {
    return NextResponse.json({ erro: "Informe projeto_id." }, { status: 400 });
  }
  if (!Array.isArray(lugares) || lugares.length === 0) {
    return NextResponse.json({ erro: "Nenhum lugar recebido." }, { status: 400 });
  }
  if (lugares.length > 1000) {
    return NextResponse.json(
      { erro: "Máximo de 1000 lugares por chamada." },
      { status: 400 }
    );
  }

  try {
    const criterios = await criteriosDoProjeto(projetoId);

    const normalizados: LeadDoMapa[] = [];
    let descartados = 0;

    for (const bruto of lugares) {
      const lugar = normalizarLugar(bruto);
      if (!lugar) {
        descartados += 1;
        continue;
      }
      normalizados.push({
        nome: lugar.nome,
        telefone: lugar.telefone,
        endereco: lugar.endereco,
        instagram: lugar.instagram,
        sinais: sinaisDoLugar(lugar, criterios),
        place_id: lugar.placeId,
      });
    }

    const { inseridos, duplicados } = await importarDoMapaDb(
      projetoId,
      normalizados
    );

    revalidatePath(`/projetos/${projetoId}`);
    revalidatePath("/projetos");
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      inseridos,
      duplicados,
      descartados,
      recebidos: lugares.length,
    });
  } catch (e) {
    return NextResponse.json({ erro: mensagemDeErro(e) }, { status: 500 });
  }
}
