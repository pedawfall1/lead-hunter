/** Mantem apenas digitos. */
export function soDigitos(v: string | null | undefined): string {
  return (v ?? "").replace(/\D+/g, "");
}

/**
 * Normaliza um telefone brasileiro para o formato exigido pelo wa.me
 * (DDI + DDD + numero, so digitos). Retorna "" se nao houver digitos suficientes.
 */
export function telefoneWhatsapp(tel: string | null | undefined): string {
  let d = soDigitos(tel);
  if (!d) return "";
  // remove zeros de operadora / prefixo interurbano
  if (d.length > 11 && d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return "55" + d;
  if (d.length >= 12) return d; // ja tem DDI de outro pais
  return "";
}

/** (49) 99999-9999 — apenas visual. */
export function formatarTelefone(tel: string | null | undefined): string {
  let d = soDigitos(tel);
  if (!d) return "";
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel ?? "";
}

const CEP = /^\d{5}-?\d{3}$/;
const UF = /^[A-Za-z]{2}$/;

/**
 * Tenta adivinhar o bairro a partir do endereco.
 * Ex.: "Rua Brasil, 120 - Centro, Videira - SC, 89560-000" -> "Centro"
 * Se nao achar nada confiavel, cai no fallback (regiao do projeto).
 */
export function extrairBairro(
  endereco: string | null | undefined,
  fallback?: string | null
): string {
  const limpo = (endereco ?? "").trim();
  if (!limpo) return (fallback ?? "").trim();

  const partes = limpo
    .split(",")
    .flatMap((p) => p.split(" - "))
    .map((p) => p.trim())
    .filter(
      (p) =>
        p.length > 1 &&
        !CEP.test(p) &&
        !UF.test(p) &&
        !/^\d+$/.test(p) &&
        !/^(s\/?n|sn)$/i.test(p)
    );

  // partes[0] costuma ser a rua; partes[1] o bairro.
  const candidato = partes[1] ?? partes[0];
  if (!candidato) return (fallback ?? "").trim();
  return candidato.replace(/^\d+\s+/, "").trim();
}

/**
 * A cidade do lead.
 *
 * A cidade é o trecho logo antes da sigla do estado. O Google separa os
 * dois de duas formas, e as duas aparecem na mesma busca:
 *   `... - Cibrazém, Videira - SC, 89564-001`   (hífen)
 *   `R. Duque de Caxias, 215 - Joaçaba, SC`     (vírgula)
 * Por isso os dois separadores entram na regex. Aceitar só o hífen fazia
 * metade dos endereços cair no fallback sem ninguém perceber.
 *
 * Sem endereço, cai na região do projeto — que costuma ser "Videira - SC" e
 * também precisa perder a sigla, senão a mensagem sai com "aqui em Videira
 * - SC", que ninguém escreve.
 */
const ANTES_DA_UF =
  /[,–-]\s*([^,–-]{2,}?)\s*[,–-]\s*([A-Za-z]{2})\s*(?:,|$)/;

/**
 * Quando o Google omite a cidade, o que sobra antes da sigla é o bairro —
 * e "Centro, SC" viraria a cidade "Centro". Nenhum município brasileiro se
 * chama assim, então é seguro recusar e cair na região do projeto.
 */
const NAO_E_CIDADE = /^(centro|centro hist[oó]rico|bairro|distrito)$/i;

export function extrairCidade(
  endereco: string | null | undefined,
  regiao?: string | null
): string {
  const achada = (endereco ?? "").match(ANTES_DA_UF)?.[1]?.trim();
  if (achada && !NAO_E_CIDADE.test(achada)) return achada;

  return (regiao ?? "").replace(/\s*[,–-]\s*[A-Za-z]{2}\s*$/, "").trim();
}

/** A sigla do estado, do endereço do lead ou da região do projeto. */
export function extrairUf(...textos: (string | null | undefined)[]): string {
  for (const t of textos) {
    const m = (t ?? "").match(/[-–,]\s*([A-Za-z]{2})\s*(?:,|$)/);
    if (m?.[1]) return m[1].toUpperCase();
  }
  return "";
}

/**
 * "Joaçaba - SC" — a praça do lead, pronta para estampar na página.
 *
 * Sai do endereço do próprio lead, não da região do projeto. São coisas
 * diferentes: a região é onde você mandou buscar, o endereço é onde o
 * negócio está. Quando as duas discordam, quem manda é o endereço — é o
 * que o dono vai ler na proposta dele.
 */
export function cidadeComUf(
  endereco: string | null | undefined,
  regiao?: string | null
): string {
  const cidade = extrairCidade(endereco, regiao);
  if (!cidade) return (regiao ?? "").trim();
  const uf = extrairUf(endereco, regiao);
  return uf ? `${cidade} - ${uf}` : cidade;
}

export type VariaveisTemplate = {
  nome?: string | null;
  bairro?: string | null;
  /** o que este projeto vende: "Social mídia", "Tráfego pago"... */
  servico?: string | null;
  /** a frase do sinal que qualificou o lead */
  motivo?: string | null;
  /** a cidade do lead — quando citar o bairro é informação demais */
  cidade?: string | null;
  /** o link da demo de site mais recente que está no ar */
  demo?: string | null;
};

export const VARIAVEIS: { chave: keyof VariaveisTemplate; ajuda: string }[] = [
  { chave: "nome", ajuda: "nome do lead, sem Ltda/ME" },
  { chave: "bairro", ajuda: "bairro do endereço, ou a região do projeto" },
  { chave: "servico", ajuda: "o serviço que o projeto vende" },
  { chave: "motivo", ajuda: "o sinal que qualificou o lead, em frase" },
  { chave: "cidade", ajuda: "a cidade do lead, sem a sigla do estado" },
  { chave: "demo", ajuda: "link da demo de site (gere na aba Demo)" },
];

/**
 * Substitui as variáveis do template.
 * Variável sem valor fica como está, para não deixar buraco na mensagem —
 * assim você percebe na prévia que faltou preencher algo.
 */
export function preencherTemplate(
  texto: string,
  vars: VariaveisTemplate
): string {
  return texto.replace(
    /\{\s*(nome|bairro|cidade|servico|serviço|motivo|demo)\s*\}/gi,
    (m, chave: string) => {
      const k = chave
        .toLowerCase()
        .replace("ç", "c") as keyof VariaveisTemplate;
      const valor = (vars[k] ?? "").toString().trim();
      return valor || m;
    }
  );
}

/** Nome curto para a saudacao: "Padaria do Joao Ltda ME" -> "Padaria do Joao". */
export function nomeCurto(nome: string): string {
  return nome
    .replace(/\b(ltda|me|epp|eireli|s\/?a|sa|cnpj)\b\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function linkWhatsapp(tel: string | null | undefined, msg: string): string {
  const numero = telefoneWhatsapp(tel);
  if (!numero) return "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}

/**
 * A ficha do lead no Google, em um clique.
 *
 * Com `place_id` abre exatamente aquele estabelecimento — é o identificador
 * que a própria busca no Maps já trouxe e que o app guardava só para
 * deduplicar importação.
 *
 * Sem ele (lead de CSV ou digitado na mão) cai numa busca por nome e
 * endereço. Não é a ficha exata, mas cai em cima dela na quase totalidade
 * dos casos — e é infinitamente melhor que abrir o Google e digitar.
 */
export function linkGoogleNegocio(lead: {
  nome: string;
  endereco?: string | null;
  place_id?: string | null;
}): string {
  if (lead.place_id) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
      lead.place_id
    )}`;
  }

  const busca = [lead.nome, lead.endereco].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    busca
  )}`;
}

export function linkInstagram(handle: string | null | undefined): string {
  const h = (handle ?? "").trim();
  if (!h) return "";
  if (/^https?:\/\//i.test(h)) return h;
  return `https://instagram.com/${h.replace(/^@/, "")}`;
}

export function porcento(parte: number, total: number): number {
  if (!total) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

export function dataCurta(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ----------------------------- variações ------------------------------ */

/**
 * Grupos de alternativa no template: {Oi|Olá|Bom dia}.
 *
 * Só conta como variação o grupo que tem barra dentro — {nome} e {bairro}
 * continuam sendo variáveis e passam ilesos por aqui.
 */
const GRUPO_VARIACAO = /\{([^{}]*\|[^{}]*)\}/g;

/** Sorteia uma versão do texto, resolvendo cada grupo de alternativa. */
export function sortearVariacao(texto: string, sorteio = Math.random): string {
  return texto.replace(GRUPO_VARIACAO, (_, grupo: string) => {
    const opcoes = grupo.split("|").map((o) => o.trim());
    return opcoes[Math.floor(sorteio() * opcoes.length)] ?? opcoes[0] ?? "";
  });
}

/**
 * Quantas mensagens diferentes este template consegue gerar.
 * É o produto do número de opções de cada grupo.
 */
export function contarVariacoes(texto: string): number {
  let total = 1;
  for (const [, grupo] of texto.matchAll(GRUPO_VARIACAO)) {
    total *= grupo.split("|").length;
  }
  return total;
}
