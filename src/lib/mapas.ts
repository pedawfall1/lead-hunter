import { soDigitos, telefoneWhatsapp } from "./format";
import type { Criterio, Sinais } from "./types";

/**
 * Resultado de busca no mapa, vindo do Apify (ou de qualquer scraper) via n8n.
 *
 * Os nomes de campo variam entre actors, então aceitamos apelidos: o fluxo do
 * n8n não precisa remapear nada, só repassar o item como veio.
 */
export type LugarBruto = {
  // nome
  title?: string;
  name?: string;
  nome?: string;
  // telefone
  phone?: string;
  phoneUnformatted?: string;
  telefone?: string;
  // endereço
  address?: string;
  fullAddress?: string;
  endereco?: string;
  // presença digital
  website?: string;
  url?: string;
  instagram?: string;
  // reputação
  totalScore?: number | string;
  rating?: number | string;
  reviewsCount?: number | string;
  userRatingsTotal?: number | string;
  imagesCount?: number | string;
  // identidade
  placeId?: string;
  place_id?: string;
  categoryName?: string;
  // vem do add-on de contatos, ou dos "Perfis" da ficha do Google
  emails?: string[];
  email?: string;
  instagrams?: string[];
  facebooks?: string[];
  socialMedias?: string[];
  profiles?: string[];
  socialProfiles?: string[];
  additionalInfo?: unknown;
};

export type LugarNormalizado = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  placeId: string | null;
  email: string | null;
  temSite: boolean;
  nota: number | null;
  avaliacoes: number | null;
  fotos: number | null;
};

function texto(...vs: (string | undefined)[]): string | null {
  for (const v of vs) {
    const t = (v ?? "").toString().trim();
    if (t) return t;
  }
  return null;
}

function numero(...vs: (number | string | undefined)[]): number | null {
  for (const v of vs) {
    if (v === undefined || v === null || v === "") continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Extrai @perfil de uma URL de Instagram, se o scraper trouxer uma. */
function primeiro(lista: string[] | undefined): string | undefined {
  return Array.isArray(lista) ? lista.find((v) => !!v?.trim()) : undefined;
}

/**
 * Acha o Instagram onde quer que o actor tenha posto.
 *
 * Cada scraper devolve os "Perfis" da ficha do Google num campo diferente —
 * e alguns só trazem isso com o add-on de contatos ligado. Em vez de apostar
 * num nome, varremos as listas conhecidas atrás de um link do Instagram.
 */
function instagramDe(bruto: LugarBruto): string | null {
  const candidatos: (string | undefined)[] = [
    texto(bruto.instagram) ?? undefined,
    primeiro(bruto.instagrams),
    ...[bruto.socialMedias, bruto.profiles, bruto.socialProfiles].flatMap(
      (lista) =>
        Array.isArray(lista)
          ? lista.filter((v) => /instagram\.com/i.test(String(v)))
          : []
    ),
  ];

  const cru = texto(...candidatos);
  if (!cru) return null;

  const m = cru.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = (m ? m[1] : cru).replace(/^@/, "").replace(/\/$/, "");
  // "explore", "p" e afins sao caminhos do proprio Instagram, nao perfis
  if (!handle || ["p", "explore", "reel", "reels"].includes(handle.toLowerCase()))
    return null;
  return handle;
}

export function normalizarLugar(bruto: LugarBruto): LugarNormalizado | null {
  const nome = texto(bruto.title, bruto.name, bruto.nome);
  if (!nome) return null;

  const telBruto = texto(bruto.phoneUnformatted, bruto.phone, bruto.telefone);
  const site = texto(bruto.website);

  return {
    nome,
    telefone: telBruto && soDigitos(telBruto).length >= 10 ? telBruto : null,
    endereco: texto(bruto.fullAddress, bruto.address, bruto.endereco),
    instagram: instagramDe(bruto),
    placeId: texto(bruto.placeId, bruto.place_id),
    email: texto(bruto.email, primeiro(bruto.emails))?.toLowerCase() ?? null,
    // "url" de scraper de mapa costuma ser o link do próprio Google, não o site
    temSite: !!site && !/google\.[a-z.]+\/maps/i.test(site),
    nota: numero(bruto.totalScore, bruto.rating),
    avaliacoes: numero(bruto.reviewsCount, bruto.userRatingsTotal),
    fotos: numero(bruto.imagesCount),
  };
}

/**
 * Traduz o que a busca achou em sinais de qualificação.
 *
 * Só marca critério que o projeto realmente usa: um projeto de site não
 * ganha "sem Instagram" só porque o dado veio na resposta.
 */
export function sinaisDoLugar(
  lugar: LugarNormalizado,
  criterios: Criterio[]
): Sinais {
  const aceita = new Set(criterios.map((c) => c.chave));
  const sinais: Sinais = {};
  const marcar = (chave: string, condicao: boolean) => {
    if (condicao && aceita.has(chave)) sinais[chave] = true;
  };

  marcar("sem_site", !lugar.temSite);
  marcar("so_linktree", !lugar.temSite && !!lugar.instagram);
  marcar("sem_instagram", !lugar.instagram);
  marcar("sem_google_negocio", !lugar.placeId);
  marcar("gmn_sem_foto", lugar.fotos !== null && lugar.fotos === 0);
  marcar("nota_baixa", lugar.nota !== null && lugar.nota < 4);
  marcar("poucas_avaliacoes", lugar.avaliacoes !== null && lugar.avaliacoes < 10);

  return sinais;
}

/** Chave de deduplicação por telefone: só os 8 últimos dígitos. */
export function chaveTelefone(tel: string | null | undefined): string | null {
  const d = soDigitos(telefoneWhatsapp(tel) || tel || "");
  return d.length >= 8 ? d.slice(-8) : null;
}
