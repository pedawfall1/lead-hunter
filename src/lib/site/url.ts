/**
 * O endereço público de uma demo.
 *
 * Existe porque o app atende em mais de um domínio: você trabalha no
 * endereço da Vercel e o cliente recebe o bonito. Sem isto o link sairia com
 * o domínio de onde VOCÊ está navegando — `lead-hunter-rouge-five...` no
 * WhatsApp do cliente, que é justamente o que se quis evitar.
 *
 * `NEXT_PUBLIC_URL_DEMOS` fixa o domínio de saída. Sem ela, cai no domínio
 * atual, que é o comportamento antigo e continua correto em dev.
 */
const BASE = (process.env.NEXT_PUBLIC_URL_DEMOS ?? "").trim().replace(/\/+$/, "");

/** O caminho, sem domínio. Serve para link interno e para o iframe. */
export function caminhoDemo(slug: string): string {
  return `/s/${encodeURIComponent(slug)}`;
}

/**
 * O link como ele aparece na mensagem: sem `https://`.
 *
 * `https://sites.arium-ia.cloud/s/gabriela-fachini` ocupa um terço da tela
 * do WhatsApp com um prefixo que não diz nada. Sem ele o link respira.
 *
 * O WhatsApp reconhece domínio sem protocolo e transforma em link
 * clicável — mas isso é comportamento dele, não garantia nossa. Se um dia
 * chegar como texto morto no celular de alguém, é aqui que se volta atrás:
 * devolver o protocolo é apagar esta linha.
 *
 * Vale só para exibição. O `og:url` e o iframe da prévia continuam com URL
 * completa, montada em outro lugar, porque ali protocolo não é enfeite.
 */
function semProtocolo(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/**
 * A URL para copiar e para a variável {demo} da mensagem.
 *
 * `origem` é o fallback quando não há domínio configurado — em geral
 * `window.location.origin`.
 */
export function urlDemo(slug: string, origem = ""): string {
  const base = BASE || origem;
  // Em desenvolvimento o endereço é `localhost:3000`, que sem protocolo
  // vira texto sem sentido em alguns lugares. Fora dele, tira.
  const ehLocal = /localhost|127\.0\.0\.1/.test(base);
  const completa = `${base}${caminhoDemo(slug)}`;
  return ehLocal ? completa : semProtocolo(completa);
}
