import { obterDemoPorSlug } from "@/lib/db";

/**
 * A página que o cliente abre.
 *
 * Route handler em vez de `page.tsx` porque o que está gravado é um
 * documento HTML inteiro — com `<html>`, `<head>` e `<title>` próprios.
 * Como página do Next ele teria que ser embutido dentro do layout, e a
 * demo herdaria `<head>` de app de prospecção. Aqui o arquivo sai como é.
 *
 * Não exige sessão: o middleware libera `/demo`. Quem protege é o slug.
 */

export const dynamic = "force-dynamic";

const NAO_ENCONTRADA = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Página não encontrada</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;
  font-family:system-ui,sans-serif;background:#0b1017;color:#94a3b8;text-align:center">
<div><h1 style="color:#f1f5f9;margin:0 0 8px">Esta página não está mais disponível</h1>
<p style="margin:0">O link pode ter expirado ou a demonstração foi retirada do ar.</p></div>
</body></html>`;

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const demo = await obterDemoPorSlug(params.slug);

  if (!demo) {
    return new Response(NAO_ENCONTRADA, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new Response(demo.html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Demo despublicada tem que sumir na hora: se o CDN guardar, o
      // cliente continua vendo a proposta depois de voce tirar do ar.
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
