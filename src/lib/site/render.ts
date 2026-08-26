import { telefoneWhatsapp } from "@/lib/format";
import type { Briefing } from "./briefing";
import { cores, type Cores } from "./paletas";
import type { ImagemSite } from "./pexels";
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

/**
 * URL de imagem que vai para dentro de `url(...)` no CSS.
 *
 * `esc` não basta aqui: parêntese e aspas fecham a função e deixariam
 * escrever CSS arbitrário. Só deixo passar http(s) do Pexels.
 */
function urlSegura(u: string | null | undefined): string | null {
  const s = String(u ?? "").trim();
  if (!/^https:\/\/[\w.-]*pexels\.com\/[^\s'"()]*$/i.test(s)) return null;
  // A URL do Pexels traz query string (?auto=compress&cs=...), e `&` cru em
  // atributo HTML e invalido. `esc` nao estraga: aspas e parenteses ja foram
  // barrados acima, entao so o & muda.
  return esc(s);
}

function css(c: Cores): string {
  return [
    "*,*::before,*::after{box-sizing:border-box}",
    "html{scroll-behavior:smooth}",
    "@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}",
    `body{margin:0;background:${c.fundo};color:${c.texto};font-family:${c.fonteCorpo};line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}`,
    `h1,h2,h3{font-family:${c.fonteTitulo};font-weight:${c.pesoTitulo};line-height:1.1;margin:0 0 .5em;letter-spacing:-.025em}`,
    "p{margin:0 0 1em}",
    "a{color:inherit}",
    "img{max-width:100%;display:block}",
    ".env{width:min(1140px,90vw);margin:0 auto}",
    ".sec{padding:clamp(64px,10vw,120px) 0}",
    `.alt{background:${c.superficie}}`,
    `.eyebrow{font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:${c.marca};font-weight:600;margin:0 0 14px}`,
    ".titulo-sec{font-size:clamp(28px,4.2vw,44px);max-width:18ch}",
    `.linha{height:1px;background:${c.borda};border:0;margin:0}`,

    `header{position:sticky;top:0;z-index:20;background:${c.fundo}f2;backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid ${c.borda}}`,
    "header .env{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:70px}",
    `.marca{font-family:${c.fonteTitulo};font-weight:${c.pesoTitulo};font-size:18px;letter-spacing:-.02em;text-decoration:none}`,
    /* Menu de ancoras: some no celular, onde so atrapalharia o botao. */
    ".menu{display:none;gap:26px;margin-left:auto;margin-right:8px}",
    "@media(min-width:860px){.menu{display:flex}}",
    `.menu a{text-decoration:none;font-size:14.5px;font-weight:500;color:${c.suave};transition:color .2s}`,
    `.menu a:hover{color:${c.texto}}`,

    `.btn{display:inline-block;background:${c.marca};color:${c.marcaTexto};text-decoration:none;font-weight:600;padding:14px 26px;border-radius:11px;font-size:15px;white-space:nowrap;box-shadow:0 8px 20px -10px ${c.marca};transition:transform .18s ease,box-shadow .18s ease}`,
    `.btn:hover{transform:translateY(-2px);box-shadow:0 14px 28px -12px ${c.marca}}`,
    `.btn.vazado{background:transparent;color:${c.texto};border:1px solid ${c.borda};font-weight:500;box-shadow:none}`,
    `.btn.vazado:hover{box-shadow:none;border-color:${c.marca}}`,
    `.btn.claro{background:#fff;color:#111;box-shadow:0 8px 20px -10px rgba(0,0,0,.5)}`,

    /* ---------- topo ---------- */
    ".hero{position:relative;isolation:isolate;overflow:hidden}",
    ".hero .env{position:relative;z-index:2;padding:clamp(80px,14vw,168px) 0 clamp(64px,11vw,132px)}",
    ".hero h1{font-size:clamp(36px,6.6vw,64px);max-width:15ch}",
    ".hero .sub{font-size:clamp(17px,2.2vw,21px);max-width:50ch;margin-bottom:34px;opacity:.92}",
    ".acoes{display:flex;flex-wrap:wrap;gap:12px}",

    /* layout dividido: texto de um lado, foto do outro, sem veu por cima */
    ".hero.dividido .env{display:grid;gap:clamp(32px,5vw,56px);grid-template-columns:1fr;align-items:center;padding-top:clamp(56px,9vw,96px);padding-bottom:clamp(56px,9vw,96px)}",
    "@media(min-width:920px){.hero.dividido .env{grid-template-columns:1.05fr .95fr}}",
    ".hero.dividido h1{max-width:none}",
    `.hero.dividido .lado{border-radius:18px;overflow:hidden;border:1px solid ${c.borda};box-shadow:0 30px 60px -34px rgba(0,0,0,.6)}`,
    ".hero.dividido .lado img{width:100%;height:clamp(280px,40vw,460px);object-fit:cover}",

    /* layout centrado: sem foto atras do texto; ela entra logo abaixo */
    ".hero.centrado .env{text-align:center;padding-bottom:clamp(40px,6vw,64px)}",
    ".hero.centrado h1{max-width:20ch;margin-left:auto;margin-right:auto}",
    ".hero.centrado .sub{margin-left:auto;margin-right:auto}",
    ".hero.centrado .acoes{justify-content:center}",
    `.faixa{width:min(1140px,90vw);margin:0 auto clamp(56px,9vw,104px);border-radius:18px;overflow:hidden;border:1px solid ${c.borda};box-shadow:0 30px 60px -34px rgba(0,0,0,.6)}`,
    ".faixa img{width:100%;height:clamp(240px,34vw,420px);object-fit:cover}",
    /* sem foto: o gradiente da marca continua sendo o fundo */
    `.hero.liso{background:linear-gradient(158deg,${c.marca}26,transparent 60%)}`,
    /* com foto: ela vai atras, e a camada escura garante o contraste do
       texto — foto clara com texto branco e o jeito classico de a demo
       chegar ilegivel no celular do cliente */
    ".hero.foto{color:#fff}",
    ".hero .fundo{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center}",
    ".hero .veu{position:absolute;inset:0;z-index:1;background:linear-gradient(105deg,rgba(8,10,14,.86) 0%,rgba(8,10,14,.66) 46%,rgba(8,10,14,.34) 100%)}",
    ".hero.foto .eyebrow{color:#fff;opacity:.82}",

    /* ---------- sobre ---------- */
    ".sobre{display:grid;gap:clamp(30px,5vw,64px);grid-template-columns:1fr;align-items:center}",
    "@media(min-width:900px){.sobre{grid-template-columns:1.05fr .95fr}}",
    `.sobre .corpo{font-size:17px;color:${c.suave}}`,
    `.moldura{border-radius:16px;overflow:hidden;border:1px solid ${c.borda};box-shadow:0 24px 48px -32px rgba(0,0,0,.55)}`,
    ".moldura img{width:100%;height:clamp(260px,36vw,400px);object-fit:cover}",

    /* ---------- servicos ---------- */
    ".grade{display:grid;gap:18px;grid-template-columns:1fr}",
    "@media(min-width:640px){.grade{grid-template-columns:repeat(2,1fr)}}",
    "@media(min-width:980px){.grade{grid-template-columns:repeat(3,1fr)}}",
    `.card{background:${c.fundo};border:1px solid ${c.borda};border-radius:16px;padding:30px 28px;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}`,
    `.card:hover{transform:translateY(-3px);border-color:${c.marca}66;box-shadow:0 20px 40px -28px rgba(0,0,0,.5)}`,
    ".card h3{font-size:19px;margin-bottom:.35em}",
    `.card p{color:${c.suave};font-size:15px;margin:0}`,
    `.num{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:${c.marca};color:${c.marcaTexto};font-weight:700;font-size:14px;margin-bottom:18px}`,

    /* ---------- como funciona ---------- */
    ".passos{display:grid;gap:clamp(22px,3vw,30px);grid-template-columns:1fr;margin-top:38px;counter-reset:passo}",
    "@media(min-width:820px){.passos{grid-template-columns:repeat(3,1fr)}}",
    ".passo{position:relative;padding-top:22px}",
    /* numero grande e apagado atras do texto: da hierarquia sem pesar */
    `.passo::before{counter-increment:passo;content:counter(passo,decimal-leading-zero);position:absolute;top:-14px;left:-4px;font-family:${c.fonteTitulo};font-weight:${c.pesoTitulo};font-size:60px;line-height:1;color:${c.marca};opacity:.16;pointer-events:none}`,
    ".passo h3{position:relative;font-size:18px;margin-bottom:.3em}",
    `.passo p{position:relative;color:${c.suave};font-size:15px;margin:0}`,

    /* ---------- perguntas ---------- */
    ".faq{max-width:760px;margin:34px auto 0}",
    `.faq details{border-bottom:1px solid ${c.borda}}`,
    ".faq summary{cursor:pointer;list-style:none;padding:20px 34px 20px 0;font-weight:600;font-size:16.5px;position:relative}",
    ".faq summary::-webkit-details-marker{display:none}",
    /* o + vira x quando abre; sem imagem, so tipografia girando */
    `.faq summary::after{content:'+';position:absolute;right:4px;top:17px;font-size:24px;line-height:1;color:${c.marca};transition:transform .2s ease}`,
    ".faq details[open] summary::after{transform:rotate(45deg)}",
    `.faq p{color:${c.suave};font-size:15.5px;margin:0 0 22px;padding-right:34px}`,

    /* ---------- galeria ---------- */
    ".galeria{display:grid;gap:14px;grid-template-columns:1fr}",
    "@media(min-width:700px){.galeria{grid-template-columns:repeat(3,1fr)}}",
    `.galeria figure{margin:0;border-radius:14px;overflow:hidden;border:1px solid ${c.borda}}`,
    ".galeria img{width:100%;height:clamp(180px,22vw,250px);object-fit:cover}",

    /* ---------- diferenciais ---------- */
    ".dif{display:grid;gap:16px;grid-template-columns:1fr;list-style:none;padding:0;margin:0}",
    "@media(min-width:760px){.dif{grid-template-columns:repeat(3,1fr)}}",
    ".dif li{display:flex;gap:12px;align-items:flex-start;font-weight:600;font-size:16.5px}",
    ".dif svg{flex:none;margin-top:3px}",

    /* ---------- fechamento ---------- */
    ".cta{text-align:center}",
    ".cta h2{font-size:clamp(28px,4.4vw,42px);max-width:none}",
    `.cta p{color:${c.suave};max-width:46ch;margin:0 auto 30px;font-size:17px}`,
    ".contato{display:grid;gap:14px;grid-template-columns:1fr;margin-top:38px;text-align:left}",
    "@media(min-width:700px){.contato{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}}",
    `.contato a{display:block;text-decoration:none;padding:18px 20px;border:1px solid ${c.borda};border-radius:12px;background:${c.fundo}}`,
    `.contato .rot{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${c.suave};margin-bottom:6px;font-weight:700}`,
    ".contato .val{font-weight:600;font-size:15px;word-break:break-word}",

    `footer{border-top:1px solid ${c.borda};padding:34px 0;color:${c.suave};font-size:14px}`,
    "footer .env{display:flex;flex-wrap:wrap;gap:14px 20px;justify-content:space-between;align-items:center}",
    ".feito-por{display:flex;align-items:center;gap:10px;text-decoration:none;opacity:.75}",
    ".feito-por:hover{opacity:1}",
    ".feito-por span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:600}",
    ".feito-por img{height:38px;width:auto}",

    ".zap{position:fixed;right:18px;bottom:18px;z-index:30;width:58px;height:58px;border-radius:50%;background:#25d366;display:grid;place-items:center;box-shadow:0 10px 26px -8px rgba(0,0,0,.55)}",

    /* Fita de demonstração: quem abre precisa saber que é uma proposta, não
       o site no ar. Some na impressão para não sujar um PDF da proposta. */
    `.fita{background:${c.marca};color:${c.marcaTexto};text-align:center;padding:9px 16px;font-size:13px;font-weight:600}`,
    "@media print{.fita,.zap{display:none}}",

    /* Entrada das seções ao rolar. Começa visível e só some quando o JS
       assume: sem script — ou se ele falhar — a página continua legível,
       em vez de ficar em branco para sempre. */
    ".rev{opacity:1}",
    "html.js .rev{opacity:0;transform:translateY(22px);transition:opacity .6s ease,transform .6s cubic-bezier(.22,.61,.36,1)}",
    "html.js .rev.dentro{opacity:1;transform:none}",
    "@media(prefers-reduced-motion:reduce){html.js .rev{opacity:1;transform:none;transition:none}}",
  ].join("\n");
}

/**
 * Revelação ao rolar.
 *
 * A classe `js` entra antes do CSS pintar, então não há flash: sem script,
 * a regra `html.js .rev` nunca casa e tudo nasce visível. `once` porque
 * seção que reaparece a cada rolagem irrita em vez de impressionar.
 */
const SCRIPT_ANIMACAO = `<script>
(function(){
  document.documentElement.classList.add('js');
  function tudo(alvos){
    for(var i=0;i<alvos.length;i++)alvos[i].classList.add('dentro');
  }
  function iniciar(){
    var alvos=document.querySelectorAll('.rev');
    if(!('IntersectionObserver' in window)){tudo(alvos);return;}
    var o=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){e.target.classList.add('dentro');o.unobserve(e.target)}
      })
    },{rootMargin:'0px 0px -12% 0px'});
    for(var i=0;i<alvos.length;i++)o.observe(alvos[i]);

    // Rede de seguranca: se em 2,5s nada apareceu, o observer nao esta
    // entregando (navegador estranho, aba em segundo plano, webview de
    // rede social). Melhor a pagina inteira de uma vez do que uma pagina
    // em branco na mao do cliente.
    setTimeout(function(){
      if(!document.querySelector('.rev.dentro'))tudo(alvos);
    },2500);
  }
  if(document.readyState==='loading'){
    addEventListener('DOMContentLoaded',iniciar);
  }else{
    iniciar();
  }
})();
</script>`;

const CHECK =
  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

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

function figura(img: ImagemSite, papel: "moldura" | "galeria"): string {
  const moldura = papel === "moldura";
  const src = urlSegura(moldura ? img.url : img.urlMedia);
  if (!src) return "";

  // A do "sobre" fica acima da dobra em tela grande: lazy ali so atrasa o
  // carregamento do que o cliente ja esta vendo. A galeria fica bem embaixo
  // e ganha com lazy.
  const carga = moldura ? "" : ' loading="lazy"';
  // `background` com a cor media do Pexels: o espaco ja nasce na cor certa
  // em vez de piscar branco enquanto a foto vem.
  const tag = `<img src="${src}" alt="${esc(img.alt)}"${carga} style="background:${esc(img.cor)}">`;

  return moldura
    ? `<div class="moldura">${tag}</div>`
    : `<figure>${tag}</figure>`;
}

const ARIUM_URL = "https://arium-ia.cloud";

/**
 * Favicon desenhado na hora: um quadrado na cor da marca com a inicial do
 * negócio. Vai como data URI, então não custa requisição nenhuma.
 *
 * Sem isso a aba do cliente mostra o ícone de página em branco — detalhe
 * pequeno que denuncia rascunho.
 */
function favicon(titulo: string, c: Cores): string {
  const letra = esc((titulo.trim()[0] ?? "•").toUpperCase());
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${c.marca}"/>` +
    `<text x="32" y="44" font-family="sans-serif" font-size="36" font-weight="700" ` +
    `text-anchor="middle" fill="${c.marcaTexto}">${letra}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Assinatura da agência no rodapé.
 *
 * O PNG passa pelo otimizador de imagem do próprio Next em vez de ir por
 * caminho direto: o arquivo original tem mais de 1 MB, e a demo é aberta
 * no celular do cliente, muitas vezes em 4G ruim. Assim chega com 20 KB.
 */
function assinaturaArium(): string {
  const logo = "/_next/image?url=%2Farium.png&amp;w=256&amp;q=80";
  return `<a class="feito-por" href="${ARIUM_URL}" target="_blank" rel="noopener">
  <span>Desenvolvido por</span>
  <img src="${logo}" alt="Arium" width="41" height="48" loading="lazy">
</a>`;
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
  const c = cores(conteudo.paleta, conteudo.estilo, conteudo.cor_marca);
  const zap = linkZap(briefing, conteudo);
  const assinatura =
    opcoes.assinatura === undefined ? FITA_PADRAO : opcoes.assinatura;

  const imagens = conteudo.imagens ?? [];
  const heroImg = urlSegura(imagens[0]?.url);
  const sobreImg = imagens[1];
  const galeria = imagens.slice(2);

  const sobre = conteudo.sobre.map((p) => `<p>${esc(p)}</p>`).join("");

  const servicos = conteudo.servicos
    .map(
      (s, i) =>
        `<article class="card"><div class="num">${i + 1}</div><h3>${esc(s.nome)}</h3><p>${esc(s.descricao)}</p></article>`
    )
    .join("");

  const passos = conteudo.passos.length
    ? `<section class="sec" id="como"><div class="env rev">
  <p class="eyebrow">Como funciona</p>
  <h2 class="titulo-sec">${esc(conteudo.passos_titulo)}</h2>
  <div class="passos">${conteudo.passos
    .map(
      (p) =>
        `<article class="passo"><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></article>`
    )
    .join("")}</div>
</div></section>`
    : "";

  // <details> nativo: abre e fecha sem uma linha de JavaScript, e continua
  // funcionando se o script da animação não rodar.
  const faq = conteudo.faq.length
    ? `<section class="sec alt" id="perguntas"><div class="env rev">
  <p class="eyebrow">Perguntas frequentes</p>
  <h2 class="titulo-sec">Antes de você perguntar</h2>
  <div class="faq">${conteudo.faq
    .map(
      (f) =>
        `<details><summary>${esc(f.pergunta)}</summary><p>${esc(f.resposta)}</p></details>`
    )
    .join("")}</div>
</div></section>`
    : "";

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
  // No topo com foto o botao vazado some sobre a imagem: vira branco solido.
  const botaoHero = zap
    ? `<a class="btn${heroImg ? " claro" : ""}" href="${zap}" target="_blank" rel="noopener">${esc(conteudo.cta_botao)}</a>`
    : "";

  const titulo = `${esc(conteudo.titulo)}${briefing.regiao ? ` — ${esc(briefing.regiao)}` : ""}`;

  const eyebrow = briefing.regiao
    ? `<p class="eyebrow">${esc(briefing.regiao)}</p>`
    : "";
  const textoTopo = `
    ${eyebrow}
    <h1>${esc(conteudo.chamada)}</h1>
    <p class="sub">${esc(conteudo.subchamada)}</p>
    <div class="acoes">
      ${botaoHero}
      <a class="btn vazado" href="#servicos"${
        conteudo.layout === "classico" && heroImg
          ? ' style="color:#fff;border-color:rgba(255,255,255,.45)"'
          : ""
      }>Ver serviços</a>
    </div>`;

  // Cada layout usa a primeira foto de um jeito: ao fundo, ao lado, ou
  // numa faixa logo abaixo do texto.
  let topo: string;
  if (conteudo.layout === "dividido" && imagens[0]) {
    topo = `<section class="hero dividido liso"><div class="env">
  <div>${textoTopo}</div>
  <div class="lado"><img src="${heroImg}" alt="${esc(imagens[0].alt)}" style="background:${esc(imagens[0].cor)}"></div>
</div></section>`;
  } else if (conteudo.layout === "centrado") {
    topo = `<section class="hero centrado liso"><div class="env">${textoTopo}</div></section>
${
  imagens[0] && heroImg
    ? `<div class="faixa rev"><img src="${heroImg}" alt="${esc(imagens[0].alt)}" style="background:${esc(imagens[0].cor)}"></div>`
    : ""
}`;
  } else {
    topo = `<section class="hero ${heroImg ? "foto" : "liso"}">
  ${heroImg ? `<div class="fundo" style="background-image:url('${heroImg}')"></div><div class="veu"></div>` : ""}
  <div class="env">${textoTopo}</div>
</section>`;
  }

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
<link rel="icon" href="${favicon(conteudo.titulo, c)}">
${c.fontesLink}
${heroImg ? `<link rel="preconnect" href="https://images.pexels.com">` : ""}
<style>${css(c)}</style>
</head>
<body>
<span id="topo"></span>
${assinatura ? `<div class="fita">${esc(assinatura)}</div>` : ""}
<header><div class="env">
  <a class="marca" href="#topo">${esc(conteudo.titulo)}</a>
  <nav class="menu">
    <a href="#sobre">Sobre</a>
    <a href="#servicos">Serviços</a>
    ${passos ? `<a href="#como">Como funciona</a>` : ""}
    ${faq ? `<a href="#perguntas">Perguntas</a>` : ""}
    <a href="#contato">Contato</a>
  </nav>
  ${botao}
</div></header>

${topo}

<section class="sec" id="sobre"><div class="env sobre rev">
  <div>
    <p class="eyebrow">Sobre</p>
    <h2 class="titulo-sec">${esc(conteudo.sobre_titulo)}</h2>
    <div class="corpo">${sobre}</div>
  </div>
  ${sobreImg ? figura(sobreImg, "moldura") : ""}
</div></section>

<section class="sec alt" id="servicos"><div class="env rev">
  <p class="eyebrow">O que fazemos</p>
  <h2 class="titulo-sec">${esc(conteudo.servicos_titulo)}</h2>
  <div class="grade" style="margin-top:38px">${servicos}</div>
</div></section>

${
  galeria.length
    ? `<section class="sec"><div class="env"><div class="galeria rev">${galeria
        .map((i) => figura(i, "galeria"))
        .join("")}</div></div></section>`
    : ""
}

${diferenciais ? `<section class="sec${galeria.length ? " alt" : ""}"><div class="env rev">${diferenciais}</div></section>` : ""}

${passos}

${faq}

<section class="sec" id="contato"><div class="env cta rev">
  <h2>${esc(conteudo.cta_titulo)}</h2>
  <p>${esc(conteudo.cta_texto)}</p>
  ${botao}
  ${blocoContato(briefing)}
</div></section>

<footer><div class="env">
  <span>${esc(conteudo.titulo)}${briefing.regiao ? ` · ${esc(briefing.regiao)}` : ""} · ${new Date().getFullYear()}</span>
  ${assinaturaArium()}
</div></footer>
${zap ? `<a class="zap" href="${zap}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${ZAP}</a>` : ""}
${SCRIPT_ANIMACAO}
</body>
</html>`;
}
