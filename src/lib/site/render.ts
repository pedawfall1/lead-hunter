import { telefoneWhatsapp } from "@/lib/format";
import type { Briefing } from "./briefing";
import { cores, type Cores } from "./paletas";
import type { ConteudoSite } from "./tipos";

/**
 * Conteúdo + briefing -> HTML de arquivo único.
 *
 * Este arquivo é o motivo de a feature sair barata: o layout é escrito uma
 * vez, aqui, e não é gerado por token nenhum. A LLM não sabe que este
 * arquivo existe.
 *
 * Nada de dado de contato vem da LLM: telefone, endereço e @ saem do
 * briefing direto para cá.
 */

/** Escapa tudo que é interpolado. O texto vem de LLM e de campo digitado. */
function esc(v: string | null | undefined): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function css(c: Cores): string {
  return [
    "*,*::before,*::after{box-sizing:border-box}",
    `body{margin:0;background:${c.fundo};color:${c.texto};font-family:${c.fonteCorpo};line-height:1.65;-webkit-font-smoothing:antialiased}`,
    `h1,h2,h3{font-family:${c.fonteTitulo};line-height:1.15;margin:0 0 .5em;letter-spacing:-.02em}`,
    "p{margin:0 0 1em}",
    "a{color:inherit}",
    ".env{width:min(1080px,92vw);margin:0 auto}",
    ".sec{padding:clamp(56px,9vw,104px) 0}",
    `.alt{background:${c.superficie}}`,
    `.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${c.marca};font-weight:700;margin:0 0 14px}`,

    `header{position:sticky;top:0;z-index:20;background:${c.fundo};border-bottom:1px solid ${c.borda}}`,
    "header .env{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:66px}",
    `.marca{font-family:${c.fonteTitulo};font-weight:700;font-size:18px}`,

    `.btn{display:inline-block;background:${c.marca};color:${c.marcaTexto};text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;font-size:15px;white-space:nowrap}`,
    `.btn.vazado{background:transparent;color:${c.texto};border:1px solid ${c.borda};font-weight:600}`,

    `.hero{padding:clamp(64px,12vw,132px) 0 clamp(56px,9vw,104px);background:linear-gradient(160deg,${c.marca}1f,transparent 62%)}`,
    ".hero h1{font-size:clamp(34px,6.2vw,60px);max-width:16ch}",
    `.hero .sub{font-size:clamp(17px,2.3vw,21px);color:${c.suave};max-width:52ch;margin-bottom:32px}`,
    ".acoes{display:flex;flex-wrap:wrap;gap:12px}",

    ".sobre{display:grid;gap:clamp(28px,5vw,64px);grid-template-columns:1fr}",
    "@media(min-width:860px){.sobre{grid-template-columns:.85fr 1.15fr;align-items:start}}",
    `.sobre .corpo{font-size:17px;color:${c.suave}}`,

    ".grade{display:grid;gap:18px;grid-template-columns:1fr}",
    "@media(min-width:640px){.grade{grid-template-columns:repeat(2,1fr)}}",
    "@media(min-width:980px){.grade{grid-template-columns:repeat(3,1fr)}}",
    `.card{background:${c.fundo};border:1px solid ${c.borda};border-radius:14px;padding:26px 24px}`,
    ".card h3{font-size:18px}",
    `.card p{color:${c.suave};font-size:15px;margin:0}`,
    `.num{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:${c.marca};color:${c.marcaTexto};font-weight:700;font-size:14px;margin-bottom:16px}`,

    ".dif{display:grid;gap:14px;grid-template-columns:1fr;list-style:none;padding:0;margin:0}",
    "@media(min-width:760px){.dif{grid-template-columns:repeat(3,1fr)}}",
    ".dif li{display:flex;gap:12px;align-items:flex-start;font-weight:600;font-size:16px}",
    ".dif svg{flex:none;margin-top:3px}",

    ".cta{text-align:center}",
    ".cta h2{font-size:clamp(26px,4.2vw,40px)}",
    `.cta p{color:${c.suave};max-width:46ch;margin:0 auto 28px;font-size:17px}`,

    ".contato{display:grid;gap:14px;grid-template-columns:1fr;margin-top:34px;text-align:left}",
    "@media(min-width:700px){.contato{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}}",
    `.contato a{display:block;text-decoration:none;padding:18px 20px;border:1px solid ${c.borda};border-radius:12px;background:${c.fundo}}`,
    `.contato .rot{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${c.suave};margin-bottom:6px;font-weight:700}`,
    ".contato .val{font-weight:600;font-size:15px;word-break:break-word}",

    `footer{border-top:1px solid ${c.borda};padding:34px 0;color:${c.suave};font-size:14px}`,
    "footer .env{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between}",

    ".zap{position:fixed;right:18px;bottom:18px;z-index:30;width:58px;height:58px;border-radius:50%;background:#25d366;display:grid;place-items:center;box-shadow:0 8px 22px -6px rgba(0,0,0,.5)}",

    // Fita de demonstração: quem abre precisa saber que é uma proposta, não
    // o site no ar. Some na impressão para não sujar um PDF da proposta.
    `.fita{background:${c.marca};color:${c.marcaTexto};text-align:center;padding:9px 16px;font-size:13px;font-weight:600}`,
    "@media print{.fita,.zap{display:none}}",
  ].join("\n");
}

const CHECK =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const ZAP =
  '<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.1c-.25.69-1.44 1.32-1.98 1.37-.53.05-1.02.24-3.44-.72-2.9-1.14-4.74-4.1-4.88-4.29-.14-.19-1.16-1.55-1.16-2.96s.74-2.1 1-2.39c.26-.29.57-.36.76-.36l.54.01c.17.01.41-.07.64.49.25.6.83 2.07.9 2.22.07.15.12.32.02.51-.1.19-.15.31-.29.48l-.44.51c-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.42.29.14.46.12.63-.07.17-.19.72-.85.91-1.14.19-.29.39-.24.64-.14.26.09 1.63.77 1.91.91.29.14.48.22.55.34.07.12.07.7-.17 1.39Z"/></svg>';

/** A URL do WhatsApp com a mensagem já escrita — um toque a menos para o cliente. */
function linkZap(b: Briefing, conteudo: ConteudoSite): string {
  const numero = telefoneWhatsapp(b.telefone);
  if (!numero) return "";
  const alvo = conteudo.servicos[0]?.nome ?? "os serviços";
  const texto = `Olá! Vim pelo site de vocês e queria saber mais sobre ${alvo}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function cartao(rotulo: string, valor: string, href: string): string {
  return `<a href="${href}"><span class="rot">${esc(rotulo)}</span><span class="val">${esc(valor)}</span></a>`;
}

function blocoContato(b: Briefing): string {
  const itens: string[] = [];
  const zap = telefoneWhatsapp(b.telefone);

  if (b.telefoneVisivel && zap) {
    itens.push(cartao("WhatsApp", b.telefoneVisivel, `https://wa.me/${zap}`));
  }
  if (b.endereco) {
    const busca = encodeURIComponent(b.endereco);
    itens.push(
      cartao(
        "Endereço",
        b.endereco,
        `https://www.google.com/maps/search/?api=1&amp;query=${busca}`
      )
    );
  }
  if (b.instagram) {
    itens.push(
      cartao(
        "Instagram",
        `@${b.instagram}`,
        `https://instagram.com/${encodeURIComponent(b.instagram)}`
      )
    );
  }
  if (b.email) {
    itens.push(cartao("E-mail", b.email, `mailto:${esc(b.email)}`));
  }

  if (!itens.length) return "";
  return `<div class="contato">${itens.join("")}</div>`;
}

export type OpcoesRender = {
  /**
   * Texto da fita no topo. `null` tira a fita — use só quando o cliente já
   * fechou e a página virou o site de verdade.
   */
  assinatura?: string | null;
};

const FITA_PADRAO = "Demonstração — proposta de site, ainda não é o site oficial";

export function renderizarSite(
  conteudo: ConteudoSite,
  briefing: Briefing,
  opcoes: OpcoesRender = {}
): string {
  const c = cores(conteudo.paleta, conteudo.estilo);
  const zap = linkZap(briefing, conteudo);
  const assinatura =
    opcoes.assinatura === undefined ? FITA_PADRAO : opcoes.assinatura;

  const sobre = conteudo.sobre.map((p) => `<p>${esc(p)}</p>`).join("");

  const servicos = conteudo.servicos
    .map(
      (s, i) =>
        `<article class="card"><div class="num">${i + 1}</div><h3>${esc(s.nome)}</h3><p>${esc(s.descricao)}</p></article>`
    )
    .join("");

  const diferenciais = conteudo.diferenciais.length
    ? `<ul class="dif">${conteudo.diferenciais
        .map(
          (d) =>
            `<li><span style="color:${c.marca}">${CHECK}</span><span>${esc(d)}</span></li>`
        )
        .join("")}</ul>`
    : "";

  const botao = zap
    ? `<a class="btn" href="${zap}" target="_blank" rel="noopener">${esc(conteudo.cta_botao)}</a>`
    : "";

  const titulo = `${esc(conteudo.titulo)}${briefing.regiao ? ` — ${esc(briefing.regiao)}` : ""}`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
<meta name="description" content="${esc(conteudo.subchamada)}">
<!-- Demonstracao nao pode indexar: concorreria no Google com o negocio real -->
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="${c.fundo}">
<style>${css(c)}</style>
</head>
<body>
${assinatura ? `<div class="fita">${esc(assinatura)}</div>` : ""}
<header><div class="env">
  <span class="marca">${esc(conteudo.titulo)}</span>
  ${botao}
</div></header>

<section class="hero"><div class="env">
  ${briefing.regiao ? `<p class="eyebrow">${esc(briefing.regiao)}</p>` : ""}
  <h1>${esc(conteudo.chamada)}</h1>
  <p class="sub">${esc(conteudo.subchamada)}</p>
  <div class="acoes">
    ${botao}
    <a class="btn vazado" href="#servicos">Ver serviços</a>
  </div>
</div></section>

<section class="sec"><div class="env sobre">
  <div><p class="eyebrow">Sobre</p><h2>${esc(conteudo.sobre_titulo)}</h2></div>
  <div class="corpo">${sobre}</div>
</div></section>

<section class="sec alt" id="servicos"><div class="env">
  <p class="eyebrow">O que fazemos</p>
  <h2>${esc(conteudo.servicos_titulo)}</h2>
  <div class="grade" style="margin-top:34px">${servicos}</div>
</div></section>

${diferenciais ? `<section class="sec"><div class="env">${diferenciais}</div></section>` : ""}

<section class="sec alt"><div class="env cta">
  <h2>${esc(conteudo.cta_titulo)}</h2>
  <p>${esc(conteudo.cta_texto)}</p>
  ${botao}
  ${blocoContato(briefing)}
</div></section>

<footer><div class="env">
  <span>${esc(conteudo.titulo)}${briefing.regiao ? ` · ${esc(briefing.regiao)}` : ""}</span>
  <span>${new Date().getFullYear()}</span>
</div></footer>
${zap ? `<a class="zap" href="${zap}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${ZAP}</a>` : ""}
</body>
</html>`;
}
