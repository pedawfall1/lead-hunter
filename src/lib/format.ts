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

export type VariaveisTemplate = {
  nome?: string | null;
  bairro?: string | null;
  /** o que este projeto vende: "Social mídia", "Tráfego pago"... */
  servico?: string | null;
  /** a frase do sinal que qualificou o lead */
  motivo?: string | null;
};

export const VARIAVEIS: { chave: keyof VariaveisTemplate; ajuda: string }[] = [
  { chave: "nome", ajuda: "nome do lead, sem Ltda/ME" },
  { chave: "bairro", ajuda: "bairro do endereço, ou a região do projeto" },
  { chave: "servico", ajuda: "o serviço que o projeto vende" },
  { chave: "motivo", ajuda: "o sinal que qualificou o lead, em frase" },
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
    /\{\s*(nome|bairro|servico|serviço|motivo)\s*\}/gi,
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
