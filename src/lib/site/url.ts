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
 * A URL para copiar e para a variável {demo} da mensagem.
 *
 * **Com `https://`, e é de propósito.** Uma versão anterior tirava o
 * protocolo porque ele come um terço da largura no WhatsApp sem dizer
 * nada. Só que no celular o link chegava como texto morto — o WhatsApp do
 * telefone não faz o autolink de domínio sem protocolo que o WhatsApp Web
 * faz. E um link que não abre no toque não é um link: é uma tarefa que o
 * cliente não vai executar, justamente na mensagem cujo trabalho inteiro é
 * fazer ele abrir a demo sem esforço.
 *
 * Feio e clicável ganha de bonito e morto.
 *
 * `origem` é o fallback quando não há domínio configurado — em geral
 * `window.location.origin`.
 */
export function urlDemo(slug: string, origem = ""): string {
  const base = BASE || origem;
  return `${base}${caminhoDemo(slug)}`;
}
