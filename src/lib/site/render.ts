import { telefoneWhatsapp } from "@/lib/format";
import type { Briefing } from "./briefing";
import { cores, forma, type Cores, type Forma } from "./paletas";
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

function css(c: Cores, f: Forma): string {
  const r = f.raio;
  const rc = f.raioCard;
  const b = f.borda;
  /** Aplica a escala do tom a um tamanho de título, em px ou vw. */
  const t = (n: number) => Math.round(n * f.escalaTitulo * 10) / 10;
  /**
   * Borda de cartão, moldura, faixa e quadro do topo dividido.
   *
   * No tratamento `refinado` ela sai tingida na cor da marca em vez de
   * cinza neutro — é a borda dourada do institucional de advocacia. O
   * cabeçalho e os divisores de seção continuam com `c.borda` puro: só o
   * que emoldura conteúdo ganha o tom da marca, não o cromo da página.
   */
  const bordaViva = f.refinado ? `${c.marca}38` : c.borda;
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
    `.sec{padding:calc(clamp(64px,10vw,120px) * ${f.respiro}) 0}`,
    `.alt{background:${c.superficie};position:relative}`,
    /* Faixa alternada era um cinza chapado. Um brilho da marca no topo
       amarra a secao a identidade em vez de parecer bloco de sistema. */
    `.alt::before{content:"";position:absolute;inset:0 0 auto;height:180px;background:linear-gradient(180deg,${c.marca}12,transparent);pointer-events:none}`,
    ".alt > *{position:relative}",
    `.eyebrow{font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:${c.marca};font-weight:600;margin:0 0 14px}`,
    /* traço dourado antes do rótulo: assinatura do tratamento refinado */
    f.refinado
      ? `.eyebrow::before{content:"";display:inline-block;width:26px;height:1px;background:${c.marca};margin-right:10px;vertical-align:middle}`
      : "",
    `.titulo-sec{font-size:clamp(${t(28)}px,${t(4.2)}vw,${t(44)}px);max-width:18ch${f.caixaAlta ? ";text-transform:uppercase;letter-spacing:-.01em" : ""}}`,
    `.linha{height:1px;background:${c.borda};border:0;margin:0}`,

    /* introdução de seção centralizada com divisor dourado embaixo — só
       nas seções de coluna única (serviços, perguntas, como funciona). As
       de duas colunas (sobre, contato) ficam à esquerda, como no site de
       referência. */
    f.refinado
      ? `.intro-centro{text-align:center;max-width:620px;margin:0 auto}`
      : "",
    f.refinado
      ? `.intro-centro .eyebrow::before{display:none}`
      : "",
    f.refinado
      ? `.intro-centro .titulo-sec{margin:0 auto;max-width:24ch}`
      : "",
    f.refinado
      ? `.divisor-centro{width:64px;height:2px;background:${c.marca};margin:22px auto 0}`
      : "",

    `header{position:sticky;top:0;z-index:20;background:${c.fundo}f2;backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid ${c.borda};transition:box-shadow .25s ease}`,
    "header .env{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:70px;transition:min-height .25s ease}",
    /* cabeçalho que encolhe ao rolar — só no tratamento refinado, ativado
       pelo `SCRIPT_ENCOLHE` lá embaixo. Sem JS (ou se ele falhar) o
       cabeçalho fica no tamanho normal, que já funciona sozinho. */
    f.refinado
      ? `header.encolhido .env{min-height:52px}`
      : "",
    f.refinado
      ? `header.encolhido{box-shadow:0 10px 30px -20px rgba(0,0,0,.6)}`
      : "",
    /* `nowrap`: nome comprido virava duas linhas e empurrava o header para
       70px de altura logo na primeira dobra. */
    `.marca{font-family:${c.fonteTitulo};font-weight:${c.pesoTitulo};font-size:18px;letter-spacing:-.02em;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;gap:10px}`,
    /* selo em losango com a inicial do negócio, ao lado do nome — só no
       tratamento refinado. Gira de volta por dentro para a letra ficar reta. */
    f.refinado
      ? `.marca-selo{flex:none;width:28px;height:28px;border:1.5px solid ${c.marca};display:grid;place-items:center;transform:rotate(45deg)}`
      : "",
    f.refinado
      ? `.marca-selo span{display:block;transform:rotate(-45deg);font-family:${c.fonteTitulo};font-weight:${c.pesoTitulo};font-size:12.5px;color:${c.marca}}`
      : "",
    /* Menu de ancoras: some no celular, onde so atrapalharia o botao.
       O corte e 1024 e nao 860 porque entre os dois o menu cabia mas
       espremido — "Como funciona" quebrava no meio, ao lado de um nome de
       negocio tambem quebrado. Sem o menu, sobra marca e botao, que e
       exatamente o que a pessoa precisa no topo. */
    ".menu{display:none;gap:26px;margin-left:auto;margin-right:8px}",
    ".menu a{white-space:nowrap}",
    "@media(min-width:1024px){.menu{display:flex}}",
    `.menu a{text-decoration:none;font-size:14.5px;font-weight:500;color:${c.suave};transition:color .2s}`,
    `.menu a:hover{color:${c.texto}}`,
    /* menu em caixa alta rastreada: a leitura institucional do tratamento
       refinado, igual à navegação de um site de escritório sério. */
    f.refinado
      ? ".menu.refinado a{text-transform:uppercase;font-size:12px;font-weight:700;letter-spacing:.12em}"
      : "",

    `.btn{display:inline-block;background:${c.marca};color:${c.marcaTexto};text-decoration:none;font-weight:600;padding:14px 26px;border-radius:${r}px;font-size:15px;white-space:nowrap;box-shadow:0 8px 20px -10px ${c.marca};transition:transform .18s ease,box-shadow .18s ease}`,
    `.btn:hover{transform:translateY(-2px);box-shadow:0 14px 28px -12px ${c.marca}}`,
    `.btn.vazado{background:transparent;color:${c.texto};border:1px solid ${c.borda};font-weight:500;box-shadow:none}`,
    `.btn.vazado:hover{box-shadow:none;border-color:${c.marca}}`,
    `.btn.claro{background:#fff;color:#111;box-shadow:0 8px 20px -10px rgba(0,0,0,.5)}`,
    /* CTA do topo no tratamento refinado: contornado, preenche só no hover.
       Sóbrio demais para vir preenchido de cara — é o botão que abre a
       página, não o que fecha venda. */
    `.btn.contorno{background:transparent;color:${c.marca};border:1.5px solid ${c.marca};box-shadow:none}`,
    `.btn.contorno:hover{background:${c.marca};color:${c.marcaTexto};transform:translateY(-2px);box-shadow:0 14px 28px -12px ${c.marca}}`,

    /* ---------- topo ---------- */
    ".hero{position:relative;isolation:isolate;overflow:hidden}",
    ".hero .env{position:relative;z-index:2;padding:clamp(80px,14vw,168px) 0 clamp(64px,11vw,132px)}",
    `.hero h1{font-size:clamp(${t(36)}px,${t(6.6)}vw,${t(64)}px);max-width:15ch}`,
    ".hero .sub{font-size:clamp(17px,2.2vw,21px);max-width:50ch;margin-bottom:34px;opacity:.92}",
    ".acoes{display:flex;flex-wrap:wrap;gap:12px}",

    /* ---------- selo do Google ----------
       Vira uma pastilha com borda: solto no meio do texto ele lia como
       mais uma linha, e nao como o unico numero verdadeiro da pagina. */
    `.selo{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:28px;font-size:14.5px;padding:10px 18px;border-radius:999px;border:1px solid ${c.borda};background:${c.fundo}}`,
    ".selo .estrelas{display:inline-flex;gap:1px}",
    ".selo strong{font-weight:600;font-size:16px}",
    `.selo-txt{color:${c.suave}}`,
    /* no topo com foto, a pastilha fica de vidro sobre a imagem */
    ".hero.foto .selo{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);backdrop-filter:blur(6px)}",
    ".hero.foto .selo-txt{color:rgba(255,255,255,.85)}",
    ".cta .selo{margin-top:0;margin-bottom:28px}",

    /* layout dividido: texto de um lado, foto do outro, sem veu por cima */
    ".hero.dividido .env{display:grid;gap:clamp(32px,5vw,56px);grid-template-columns:1fr;align-items:center;padding-top:clamp(56px,9vw,96px);padding-bottom:clamp(56px,9vw,96px)}",
    "@media(min-width:920px){.hero.dividido .env{grid-template-columns:1.05fr .95fr}}",
    ".hero.dividido h1{max-width:none}",
    `.hero.dividido .lado{position:relative;border-radius:${rc}px;overflow:hidden;border:${b}px solid ${bordaViva};box-shadow:${f.sombra}}`,
    /* cartão flutuante com a reputação real do Google sobre a foto do
       topo — o mesmo lugar do selo de confiança do site de referência,
       mas com o único número que não é chute (ver `blocoMapa` acima). */
    f.refinado
      ? `.flutuante{position:absolute;left:20px;bottom:-20px;max-width:220px;padding:22px 24px;background:${c.fundo}f2;backdrop-filter:blur(14px);border:${b}px solid ${c.marca}45;border-radius:${rc}px;box-shadow:${f.sombra};z-index:2}`
      : "",
    f.refinado
      ? `.flutuante-nota{font-family:${c.fonteTitulo};font-weight:${c.pesoTitulo};font-size:38px;color:${c.marca};line-height:1;margin-bottom:8px}`
      : "",
    f.refinado
      ? `.flutuante-txt{font-size:12px;line-height:1.5;color:${c.suave}}`
      : "",
    f.refinado
      ? "@media(max-width:640px){.flutuante{position:static;margin-top:16px;max-width:none}}"
      : "",
    ".hero.dividido .lado img{width:100%;height:clamp(280px,40vw,460px);object-fit:cover}",

    /* layout centrado: sem foto atras do texto; ela entra logo abaixo */
    ".hero.centrado .env{text-align:center;padding-bottom:clamp(40px,6vw,64px)}",
    ".hero.centrado h1{max-width:20ch;margin-left:auto;margin-right:auto}",
    ".hero.centrado .sub{margin-left:auto;margin-right:auto}",
    ".hero.centrado .acoes{justify-content:center}",
    `.faixa{width:min(1140px,90vw);margin:0 auto clamp(56px,9vw,104px);border-radius:${rc}px;overflow:hidden;border:${b}px solid ${bordaViva};box-shadow:${f.sombra}}`,
    ".faixa img{width:100%;height:clamp(240px,34vw,420px);object-fit:cover}",
    /* Sem foto o topo era um gradiente diagonal chapado. Agora leva dois
       focos de luz da cor da marca, que dão profundidade sem custar
       imagem nenhuma. */
    `.hero.liso{background:radial-gradient(1100px 520px at 12% -10%,${c.marca}2e,transparent 62%),radial-gradient(760px 420px at 88% 8%,${c.marca}1a,transparent 66%),${c.fundo}}`,
    /* linha fina de luz no rodapé do topo, para a seção seguinte não
       começar num corte seco */
    `.hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent,${c.marca}55,transparent);z-index:3}`,
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
    `.moldura{border-radius:${rc}px;overflow:hidden;border:${b}px solid ${bordaViva};box-shadow:${f.sombra}}`,
    ".moldura img{width:100%;height:clamp(260px,36vw,400px);object-fit:cover}",

    /* ---------- servicos ---------- */
    ".grade{display:grid;gap:18px;grid-template-columns:1fr}",
    "@media(min-width:640px){.grade{grid-template-columns:repeat(2,1fr)}}",
    "@media(min-width:980px){.grade{grid-template-columns:repeat(3,1fr)}}",
    `.card{background:${c.fundo};border:${b}px solid ${bordaViva};border-radius:${rc}px;padding:30px 28px;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}`,
    `.card:hover{transform:translateY(-3px);border-color:${c.marca}66;box-shadow:0 22px 44px -26px ${c.marca}55}`,
    ".card h3{font-size:19px;margin-bottom:.35em}",
    `.card p{color:${c.suave};font-size:15px;margin:0}`,
    `.num{display:grid;place-items:center;width:38px;height:38px;border-radius:${Math.min(r,12)}px;background:${c.marca};color:${c.marcaTexto};font-weight:700;font-size:14px;margin-bottom:18px}`,

    /* ---------- como funciona ---------- */
    ".passos{display:grid;gap:clamp(26px,3.4vw,36px);grid-template-columns:1fr;margin-top:44px;counter-reset:passo}",
    "@media(min-width:820px){.passos{grid-template-columns:repeat(3,1fr)}}",
    `.passo{position:relative;padding-top:26px;border-top:2px solid ${c.borda}}`,
    /* A versao anterior punha o numero em `absolute` atras do texto, e ele
       batia no titulo. Agora ele fica no fluxo, acima: ocupa o proprio
       espaco e nao tem como colidir. */
    `.passo .passo-n{display:block;font-family:${c.fonteTitulo};font-weight:${c.pesoTitulo};font-size:clamp(34px,4vw,44px);line-height:1;color:${c.marca};margin-bottom:14px;letter-spacing:-.03em}`,
    /* a barra da cor da marca marca o comeco de cada passo */
    `.passo::after{content:"";position:absolute;top:-2px;left:0;width:42px;height:2px;background:${c.marca}}`,
    ".passo h3{font-size:18.5px;margin-bottom:.35em}",
    `.passo p{color:${c.suave};font-size:15px;margin:0}`,

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
    `.galeria figure{margin:0;border-radius:${rc}px;overflow:hidden;border:${b}px solid ${bordaViva}}`,
    ".galeria img{width:100%;height:clamp(180px,22vw,250px);object-fit:cover}",

    /* ---------- diferenciais ----------
       Eram tres tiques soltos numa faixa vazia: muito espaco morto e nada
       para o olho segurar. Viraram cartoes com o icone num circulo da cor
       da marca, que e o que da peso a uma linha de texto curta. */
    ".dif{display:grid;gap:16px;grid-template-columns:1fr;list-style:none;padding:0;margin:0}",
    "@media(min-width:760px){.dif{grid-template-columns:repeat(3,1fr)}}",
    `.dif li{display:flex;gap:16px;align-items:center;font-weight:600;font-size:16.5px;background:${c.fundo};border:${b}px solid ${bordaViva};border-radius:${rc}px;padding:22px 24px;transition:border-color .2s ease,transform .2s ease}`,
    `.dif li:hover{transform:translateY(-2px);border-color:${c.marca}66}`,
    `.faixa-dif{padding:clamp(30px,4vw,46px) 0;border-top:1px solid ${c.borda};border-bottom:1px solid ${c.borda}}`,
    ".faixa-dif::before{display:none}",
    `.dif .marcador{flex:none;display:grid;place-items:center;width:42px;height:42px;border-radius:999px;background:${c.marca}1f;color:${c.marca}}`,
    ".dif svg{flex:none}",

    /* ---------- fechamento ---------- */
    ".cta{text-align:center}",
    ".cta h2{font-size:clamp(28px,4.4vw,42px);max-width:none}",
    `.cta p{color:${c.suave};max-width:46ch;margin:0 auto 30px;font-size:17px}`,
    ".contato{display:grid;gap:14px;grid-template-columns:1fr;margin-top:38px;text-align:left}",
    "@media(min-width:700px){.contato{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}}",
    `.contato a{display:block;text-decoration:none;padding:18px 20px;border:${b}px solid ${bordaViva};border-radius:${r}px;background:${c.fundo};transition:border-color .2s ease,transform .2s ease}`,
    `.contato a:hover{border-color:${c.marca};transform:translateY(-2px)}`,
    `.contato .rot{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${c.suave};margin-bottom:6px;font-weight:700}`,
    ".contato .val{font-weight:600;font-size:15px;word-break:break-word}",

    ".mapa{margin-top:26px}",
    `.mapa iframe{width:100%;height:clamp(260px,32vw,380px);display:block;border:${b}px solid ${c.borda};border-radius:${rc}px;box-shadow:${f.sombra}}`,
    ".mapa .btn{margin-top:18px}",

    `footer{border-top:1px solid ${c.borda};padding:34px 0;color:${c.suave};font-size:14px}`,
    "footer .env{display:flex;flex-wrap:wrap;gap:14px 20px;justify-content:space-between;align-items:center}",
    ".feito-por{display:flex;align-items:center;gap:10px;text-decoration:none;opacity:.75}",
    ".feito-por:hover{opacity:1}",
    ".feito-por span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:600}",
    ".feito-por img{height:38px;width:auto}",

    ".zap{position:fixed;right:18px;bottom:18px;z-index:30;width:58px;height:58px;border-radius:50%;background:#25d366;display:grid;place-items:center;box-shadow:0 10px 26px -8px rgba(0,0,0,.55);transition:transform .2s ease}",
    ".zap:hover{transform:scale(1.06)}",
    /* Anel que pulsa devagar: chama o olho para o unico botao que importa
       sem virar aquele balao que fica saltando na tela. */
    '.zap::before{content:"";position:absolute;inset:0;border-radius:50%;background:#25d366;opacity:.45;animation:pulso 2.6s ease-out infinite;z-index:-1}',
    "@keyframes pulso{0%{transform:scale(1);opacity:.45}70%{transform:scale(1.6);opacity:0}100%{opacity:0}}",
    "@media(prefers-reduced-motion:reduce){.zap::before{animation:none}}",

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

/**
 * Cabeçalho que encolhe ao rolar — só entra na página quando `f.refinado`.
 * Sem script o cabeçalho fica no tamanho normal, que já é o suficiente.
 */
const SCRIPT_ENCOLHE = `<script>
(function(){
  var h=document.querySelector('header');
  if(!h)return;
  function ajustar(){
    if(window.scrollY>36)h.classList.add('encolhido');
    else h.classList.remove('encolhido');
  }
  addEventListener('scroll',ajustar,{passive:true});
  ajustar();
})();
</script>`;

const ESTRELA =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="m12 17.27 5.18 3.13-1.37-5.89 4.57-3.96-6.02-.51L12 4.5 9.64 10.04l-6.02.51 4.57 3.96-1.37 5.89z"/></svg>';

/**
 * Nota do Google, com as estrelas preenchidas até onde ela chega.
 *
 * O único número da página que não é chute: veio da ficha do Google na
 * importação do lead. É exatamente o que o prompt proíbe a LLM de escrever
 * — e por isso quem estampa é o template, com dado de verdade.
 */
function selo(
  google: { nota: number; avaliacoes: number },
  c: Cores
): string {
  const cheias = Math.round(google.nota);
  const estrelas = Array.from({ length: 5 }, (_, i) =>
    i < cheias
      ? `<span style="color:${c.marca}">${ESTRELA}</span>`
      : `<span style="color:${c.suave};opacity:.35">${ESTRELA}</span>`
  ).join("");

  const nota = google.nota.toFixed(1).replace(".", ",");
  return `<div class="selo">
  <span class="estrelas">${estrelas}</span>
  <strong>${nota}</strong>
  <span class="selo-txt">${google.avaliacoes} avaliações no Google</span>
</div>`;
}

/**
 * Cartão flutuante com a nota do Google sobre a foto do topo dividido.
 *
 * É o mesmo lugar que a referência usava para um número inventado
 * ("98%, segundo a Forbes"). Aqui é o único número da página que não é
 * chute — mesma regra do `selo()` acima, só que em formato de cartão em
 * vez de pastilha, porque é o que cabe sobre uma foto grande.
 */
function flutuanteGoogle(google: { nota: number; avaliacoes: number }): string {
  const nota = google.nota.toFixed(1).replace(".", ",");
  return `<div class="flutuante">
  <div class="flutuante-nota">${nota}</div>
  <div class="flutuante-txt">${google.avaliacoes} avaliações reais no Google</div>
</div>`;
}

/**
 * Rótulo + título de seção, centralizado com divisor embaixo quando o tom
 * é refinado — só faz sentido em seção de coluna única (serviços,
 * perguntas, como funciona). Sobre e contato são de duas colunas e ficam
 * à esquerda, como no site de referência.
 */
function introSecao(rotulo: string, titulo: string, f: Forma): string {
  const corpo = `<p class="eyebrow">${esc(rotulo)}</p><h2 class="titulo-sec">${esc(titulo)}</h2>`;
  if (!f.refinado) return corpo;
  return `<div class="intro-centro">${corpo}<div class="divisor-centro"></div></div>`;
}

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

/**
 * O mapa do negócio, no fim da página.
 *
 * Busca pelo NOME junto do endereço quando a reputação ajuda: aí o Google
 * abre a ficha do estabelecimento sobre o mapa, com o nome e a nota, e o
 * dono vê a própria placa em vez de um alfinete anônimo numa rua.
 *
 * **Quando a reputação NÃO ajuda, busca só pelo endereço.** O card do
 * Google estampa a nota sem perguntar, e uma demo com "3,2 ★" no rodapé
 * argumenta contra o cliente dentro da proposta que deveria vendê-lo — a
 * mesma razão pela qual `briefing.google` já corta o selo abaixo de 4,0.
 * Sem o nome na busca não há ficha, e sobra o mapa fazendo o trabalho que
 * interessa: mostrar onde fica.
 *
 * Sem chave de API. O `output=embed` é o caminho que o Google atende sem
 * cadastro nenhum — em troca, é rota não documentada: se um dia parar de
 * responder, o iframe fica em branco e o resto da página segue igual,
 * porque nada aqui depende dele. O botão "Como chegar" continua valendo
 * de qualquer forma, já que é link normal.
 *
 * `loading="lazy"` não é detalhe: o iframe carrega o Maps inteiro, e ele
 * fica no fim da página. Sem isso, uma demo aberta no 4G do cliente
 * gastaria o carregamento com um mapa que ainda está fora da tela.
 */
function blocoMapa(b: Briefing): string {
  if (!b.endereco) return "";

  const busca = b.google ? `${b.nomeCurto}, ${b.endereco}` : b.endereco;
  const alvo = encodeURIComponent(busca);
  const destino = encodeURIComponent(b.endereco);

  return `<div class="mapa rev">
  <iframe src="https://maps.google.com/maps?q=${alvo}&amp;output=embed" title="Localização de ${esc(
    b.nomeCurto
  )} no mapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
  <a class="btn vazado" href="https://www.google.com/maps/dir/?api=1&amp;destination=${destino}" target="_blank" rel="noopener">Como chegar</a>
</div>`;
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
  const c = cores(
    conteudo.paleta,
    conteudo.estilo,
    conteudo.cor_marca,
    conteudo.tom
  );
  const f = forma(conteudo.tom);
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

  /**
   * Em que ordem as seções aparecem, por temperamento.
   *
   * É o que mais diferencia um ramo do outro, mais que cor ou canto: cada
   * um vende por um argumento, e o argumento tem que vir primeiro.
   *
   * - `sobrio` abre pelo sobre: advocacia vende confiança na pessoa, e
   *   listar serviço antes de dizer quem você é soa a balcão.
   * - `caloroso` joga a galeria para cima: estética e restaurante vendem
   *   pelo olho, e esperar a terceira rolagem para mostrar foto é perder.
   * - `robusto` abre por serviço e processo: quem procura oficina quer
   *   saber se você faz aquilo e como funciona, não a sua história.
   * - `tecnico` mantém a ordem clássica, que é a mais neutra.
   */
  const ORDEM: Record<string, string[]> = {
    sobrio: ["sobre", "servicos", "diferenciais", "faq", "passos", "galeria"],
    caloroso: ["galeria", "servicos", "sobre", "diferenciais", "passos", "faq"],
    robusto: ["servicos", "passos", "diferenciais", "sobre", "faq", "galeria"],
    tecnico: ["sobre", "servicos", "galeria", "diferenciais", "passos", "faq"],
  };

  const passos = conteudo.passos.length
    ? `<section class="sec" id="como"><div class="env rev">
  ${introSecao("Como funciona", conteudo.passos_titulo, f)}
  <div class="passos">${conteudo.passos
    .map(
      (p, i) =>
        `<article class="passo"><span class="passo-n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></article>`
    )
    .join("")}</div>
</div></section>`
    : "";

  // <details> nativo: abre e fecha sem uma linha de JavaScript, e continua
  // funcionando se o script da animação não rodar.
  const faq = conteudo.faq.length
    ? `<section class="sec" id="perguntas"><div class="env rev">
  ${introSecao("Perguntas frequentes", "Antes de você perguntar", f)}
  <div class="faq">${conteudo.faq
    .map(
      (f) =>
        `<details><summary>${esc(f.pergunta)}</summary><p>${esc(f.resposta)}</p></details>`
    )
    .join("")}</div>
</div></section>`
    : "";

  const blocoSobre = `<section class="sec" id="sobre"><div class="env sobre rev">
  <div>
    <p class="eyebrow">Sobre</p>
    <h2 class="titulo-sec">${esc(conteudo.sobre_titulo)}</h2>
    <div class="corpo">${sobre}</div>
  </div>
  ${sobreImg ? figura(sobreImg, "moldura") : ""}
</div></section>`;

  const blocoServicos = `<section class="sec" id="servicos"><div class="env rev">
  ${introSecao("O que fazemos", conteudo.servicos_titulo, f)}
  <div class="grade" style="margin-top:38px">${servicos}</div>
</div></section>`;

  const blocoGaleria = galeria.length
    ? `<section class="sec"><div class="env"><div class="galeria rev">${galeria
        .map((i) => figura(i, "galeria"))
        .join("")}</div></div></section>`
    : "";

  const diferenciais = conteudo.diferenciais.length
    ? `<ul class="dif">${conteudo.diferenciais
        .map(
          (d) =>
            `<li><span class="marcador">${CHECK}</span><span>${esc(d)}</span></li>`
        )
        .join("")}</ul>`
    : "";

  //  e nao : uma linha de conteudo dentro do respiro de
  // uma secao inteira deixava 240px de vazio em volta, e a secao lia como
  // esquecida. Aqui ela vira uma barra de reforco entre duas secoes
  // grandes, com respiro proprio.
  const blocoDiferenciais = diferenciais
    ? `<section class="sec faixa-dif"><div class="env rev">${diferenciais}</div></section>`
    : "";

  /**
   * As seções na ordem do temperamento, com as faixas de fundo alternando
   * de verdade.
   *
   * A alternância é calculada aqui, e não escrita à mão em cada seção: com
   * a ordem variando, `alt` fixo no HTML deixaria duas faixas iguais
   * coladas em alguns tons e a página perderia o ritmo.
   */
  const disponiveis: Record<string, string> = {
    sobre: blocoSobre,
    servicos: blocoServicos,
    galeria: blocoGaleria,
    diferenciais: blocoDiferenciais,
    passos,
    faq,
  };

  const ordem = ORDEM[conteudo.tom] ?? ORDEM.tecnico;
  let claraAgora = false;
  const miolo = ordem
    .map((nome) => disponiveis[nome])
    .filter(Boolean)
    .map((html) => {
      // A galeria é só imagem: dar fundo a ela não muda nada e ainda
      // gastaria uma alternância à toa.
      const soImagem = html.includes('class="galeria');
      if (soImagem) return html;
      claraAgora = !claraAgora;
      return claraAgora ? html.replace('class="sec"', 'class="sec alt"') : html;
    })
    .join("\n\n");

  const botao = zap
    ? `<a class="btn" href="${zap}" target="_blank" rel="noopener">${esc(conteudo.cta_botao)}</a>`
    : "";
  // No topo com foto o botao vazado some sobre a imagem: vira branco solido.
  // No tratamento refinado o CTA do topo vem contornado em vez de solido ou
  // branco — o veu escuro por tras da foto ja garante contraste suficiente.
  const botaoHero = zap
    ? `<a class="btn${f.refinado ? " contorno" : heroImg ? " claro" : ""}" href="${zap}" target="_blank" rel="noopener">${esc(conteudo.cta_botao)}</a>`
    : "";

  const titulo = `${esc(conteudo.titulo)}${briefing.regiao ? ` — ${esc(briefing.regiao)}` : ""}`;

  const provaSocial = briefing.google ? selo(briefing.google, c) : "";

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
    </div>
    ${provaSocial}`;

  // Cada layout usa a primeira foto de um jeito: ao fundo, ao lado, ou
  // numa faixa logo abaixo do texto.
  let topo: string;
  if (conteudo.layout === "dividido" && imagens[0]) {
    // O cartão flutuante só entra com nota real do Google: sem prova
    // social de verdade, não inventa um número no lugar dele.
    const flutuante =
      f.refinado && briefing.google ? flutuanteGoogle(briefing.google) : "";
    topo = `<section class="hero dividido liso"><div class="env">
  <div>${textoTopo}</div>
  <div class="lado"><img src="${heroImg}" alt="${esc(imagens[0].alt)}" style="background:${esc(imagens[0].cor)}">${flutuante}</div>
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
<style>${css(c, f)}</style>
</head>
<body>
<span id="topo"></span>
${assinatura ? `<div class="fita">${esc(assinatura)}</div>` : ""}
<header><div class="env">
  <a class="marca" href="#topo">${
    f.refinado
      ? `<span class="marca-selo"><span>${esc((conteudo.titulo.trim()[0] ?? "•").toUpperCase())}</span></span>`
      : ""
  }${esc(conteudo.titulo)}</a>
  <nav class="menu${f.refinado ? " refinado" : ""}">
    <a href="#sobre">Sobre</a>
    <a href="#servicos">Serviços</a>
    ${passos ? `<a href="#como">Como funciona</a>` : ""}
    ${faq ? `<a href="#perguntas">Perguntas</a>` : ""}
    <a href="#contato">Contato</a>
  </nav>
  ${botao}
</div></header>

${topo}

${miolo}

<section class="sec" id="contato"><div class="env cta rev">
  <h2>${esc(conteudo.cta_titulo)}</h2>
  <p>${esc(conteudo.cta_texto)}</p>
  ${provaSocial}
  ${botao}
  ${blocoContato(briefing)}
  ${blocoMapa(briefing)}
</div></section>

<footer><div class="env">
  <span>${esc(conteudo.titulo)}${briefing.regiao ? ` · ${esc(briefing.regiao)}` : ""} · ${new Date().getFullYear()}</span>
  ${assinaturaArium()}
</div></footer>
${zap ? `<a class="zap" href="${zap}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${ZAP}</a>` : ""}
${SCRIPT_ANIMACAO}
${f.refinado ? SCRIPT_ENCOLHE : ""}
</body>
</html>`;
}
