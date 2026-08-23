import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import {
  acharAlvo,
  adicionarNaoPerturbeDb,
  descartarLeadDb,
  marcarEntregaDb,
  registrarRespostaDb,
} from "@/lib/db";
import {
  TOKEN_CALLBACK,
  ehEvento,
  telefoneDoCallback,
  type Callback,
} from "@/lib/n8n";
import { mensagemDeErro } from "@/lib/erros";

export const dynamic = "force-dynamic";

/**
 * Webhook que o n8n chama depois de mexer com a Evolution.
 *
 *   POST /api/n8n
 *   x-lh-token: <LH_WEBHOOK_TOKEN>
 *   { "evento": "resposta", "interacao_id": "...", "texto": "opa, me manda" }
 *
 * Eventos: entregue | lido | resposta | falha | bloqueado
 * Para achar o lead, na ordem: interacao_id, externo_id, telefone.
 */
export async function POST(request: NextRequest) {
  if (!TOKEN_CALLBACK) {
    return NextResponse.json(
      { erro: "LH_WEBHOOK_TOKEN não configurado no servidor." },
      { status: 503 }
    );
  }

  const enviado = request.headers.get("x-lh-token");
  if (enviado !== TOKEN_CALLBACK) {
    return NextResponse.json({ erro: "Token inválido." }, { status: 401 });
  }

  let corpo: Callback;
  try {
    corpo = (await request.json()) as Callback;
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!ehEvento(corpo.evento)) {
    return NextResponse.json(
      { erro: `Evento desconhecido: ${String(corpo.evento)}` },
      { status: 400 }
    );
  }

  const telefone = telefoneDoCallback(corpo.telefone);
  const em = corpo.em ?? new Date().toISOString();

  try {
    const alvo = await acharAlvo({
      interacaoId: corpo.interacao_id,
      externoId: corpo.externo_id,
      telefone,
    });

    if (!alvo) {
      // 200 de propósito: sem lead correspondente não é erro do n8n, e
      // devolver 4xx faria o fluxo dele ficar tentando de novo à toa.
      return NextResponse.json({ ok: true, ignorado: "lead não encontrado" });
    }

    switch (corpo.evento) {
      case "entregue":
        if (alvo.interacaoId)
          await marcarEntregaDb(alvo.interacaoId, {
            entregue_em: em,
            ...(corpo.externo_id ? { externo_id: corpo.externo_id } : {}),
          });
        break;

      case "lido":
        if (alvo.interacaoId)
          await marcarEntregaDb(alvo.interacaoId, { lido_em: em });
        break;

      case "resposta":
        await registrarRespostaDb(alvo, corpo.texto?.trim() || "(sem texto)", em);
        break;

      case "falha":
        if (alvo.interacaoId)
          await marcarEntregaDb(alvo.interacaoId, {
            erro: corpo.erro || "Falha no envio",
          });
        break;

      case "bloqueado":
        if (alvo.telefone)
          await adicionarNaoPerturbeDb(
            alvo.userId,
            alvo.telefone,
            corpo.erro || "Pediu para não receber"
          );
        await descartarLeadDb(
          alvo.leadId,
          corpo.erro || "Pediu para não receber mensagens."
        );
        break;
    }

    revalidatePath("/hoje");
    revalidatePath(`/projetos/${alvo.projetoId}`);
    revalidatePath("/");

    return NextResponse.json({ ok: true, lead_id: alvo.leadId });
  } catch (e) {
    return NextResponse.json({ erro: mensagemDeErro(e) }, { status: 500 });
  }
}

/** Ping para conferir a configuração sem disparar nada. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    servico: "lead-hunter",
    token_configurado: !!TOKEN_CALLBACK,
  });
}
