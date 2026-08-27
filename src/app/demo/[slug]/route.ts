import { NextResponse } from "next/server";

/**
 * O endereço antigo das demos, mantido vivo.
 *
 * As demos moraram em `/demo/<slug>` antes de virarem `/s/<slug>`. Link de
 * proposta vai por WhatsApp e fica no histórico da conversa para sempre —
 * então este redirect não tem prazo para sair. Custa um arquivo.
 *
 * 308 e não 302: o endereço mudou de vez, e o permanente é o que faz o
 * WhatsApp e o Google guardarem o novo.
 */
export const dynamic = "force-dynamic";

export function GET(req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(req.url);
  url.pathname = `/s/${params.slug}`;
  return NextResponse.redirect(url, 308);
}
