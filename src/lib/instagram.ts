import type { Criterio, Sinais } from "./types";

/**
 * O perfil do Instagram do lead, como o scraper devolve e como o app usa.
 *
 * Isto fecha um buraco antigo: o catálogo em `servicos.ts` já declarava
 * `parado_30d`, `poucos_seguidores` e `so_linktree`, mas ninguém preenchia
 * — o Google Maps não sabe nada disso. Agora sabe.
 *
 * Mesma filosofia do `mapas.ts`: aceitar apelido de campo em vez de apostar
 * num nome, porque cada actor batiza as coisas do seu jeito.
 */

export type PerfilBruto = {
  username?: string;
  fullName?: string;
  full_name?: string;
  biography?: string;
  bio?: string;
  externalUrl?: string;
  external_url?: string;
  followersCount?: number | string;
  followers?: number | string;
  edge_followed_by?: { count?: number };
  followsCount?: number | string;
  postsCount?: number | string;
  posts?: number | string;
  private?: boolean;
  is_private?: boolean;
  verified?: boolean;
  is_verified?: boolean;
  profilePicUrl?: string;
  latestPosts?: PostBruto[];
  posts_list?: PostBruto[];
  error?: string;
};

type PostBruto = {
  timestamp?: string | number;
  taken_at_timestamp?: number;
  likesCount?: number | string;
  likes?: number | string;
  commentsCount?: number | string;
  comments?: number | string;
  caption?: string;
  type?: string;
};

export type Post = {
  quando: string | null;
  curtidas: number;
  comentarios: number;
  legenda: string;
};

/** O que fica gravado no lead e alimenta relatório, sinais e briefing. */
export type PerfilInstagram = {
  usuario: string;
  nome: string | null;
  bio: string | null;
  link: string | null;
  seguidores: number | null;
  seguindo: number | null;
  publicacoes: number | null;
  privado: boolean;
  verificado: boolean;
  posts: Post[];
  /** dias desde a última publicação; null se não deu para saber */
  diasSemPostar: number | null;
  /** (curtidas + comentários) médios ÷ seguidores, em % */
  engajamento: number | null;
  /** publicações por mês, pela janela dos posts lidos */
  postsPorMes: number | null;
  /** o link da bio é agregador (linktree e afins)? */
  soLinkNaBio: boolean;
  analisadoEm: string;
};

function num(...vs: (number | string | undefined)[]): number | null {
  for (const v of vs) {
    if (v === undefined || v === null || v === "") continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function txt(...vs: (string | undefined)[]): string | null {
  for (const v of vs) {
    const t = (v ?? "").toString().trim();
    if (t) return t;
  }
  return null;
}

/** Instagram manda data em ISO ou em epoch de segundos, conforme o actor. */
function quandoDoPost(p: PostBruto): string | null {
  if (typeof p.taken_at_timestamp === "number") {
    return new Date(p.taken_at_timestamp * 1000).toISOString();
  }
  if (typeof p.timestamp === "number") {
    // epoch em segundos vira ms; epoch em ms passa direto
    const ms = p.timestamp < 1e12 ? p.timestamp * 1000 : p.timestamp;
    return new Date(ms).toISOString();
  }
  const t = txt(typeof p.timestamp === "string" ? p.timestamp : undefined);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const AGREGADORES =
  /(linktr\.ee|beacons\.|linkr\.bio|bio\.link|linklist|campsite\.bio|linkme|many\.link|lnk\.bio)/i;

export function normalizarPerfil(bruto: PerfilBruto): PerfilInstagram | null {
  const usuario = txt(bruto.username);
  if (!usuario) return null;

  const brutos = bruto.latestPosts ?? bruto.posts_list ?? [];
  const posts: Post[] = brutos.slice(0, 12).map((p) => ({
    quando: quandoDoPost(p),
    curtidas: num(p.likesCount, p.likes) ?? 0,
    comentarios: num(p.commentsCount, p.comments) ?? 0,
    legenda: txt(p.caption) ?? "",
  }));

  const seguidores = num(
    bruto.followersCount,
    bruto.followers,
    bruto.edge_followed_by?.count
  );

  const datas = posts
    .map((p) => p.quando)
    .filter((d): d is string => !!d)
    .sort()
    .reverse();

  const diasSemPostar = datas.length
    ? Math.floor((Date.now() - new Date(datas[0]).getTime()) / 86_400_000)
    : null;

  // Engajamento sobre os posts lidos. Sem seguidores o número não significa
  // nada — perfil de 50 seguidores com 40 curtidas nao e 80% de alcance.
  let engajamento: number | null = null;
  if (seguidores && seguidores > 0 && posts.length) {
    const soma = posts.reduce((s, p) => s + p.curtidas + p.comentarios, 0);
    engajamento = Math.round((soma / posts.length / seguidores) * 1000) / 10;
  }

  // Ritmo pela janela real entre o primeiro e o último post lido, não pela
  // contagem total: perfil que postava muito em 2019 e parou continuaria
  // com média alta se dividisse tudo pela idade da conta.
  let postsPorMes: number | null = null;
  if (datas.length >= 2) {
    const dias =
      (new Date(datas[0]).getTime() - new Date(datas[datas.length - 1]).getTime()) /
      86_400_000;
    if (dias > 0) postsPorMes = Math.round((datas.length / dias) * 30 * 10) / 10;
  }

  const link = txt(bruto.externalUrl, bruto.external_url);

  return {
    usuario,
    nome: txt(bruto.fullName, bruto.full_name),
    bio: txt(bruto.biography, bruto.bio),
    link,
    seguidores,
    seguindo: num(bruto.followsCount),
    publicacoes: num(bruto.postsCount, bruto.posts),
    privado: !!(bruto.private ?? bruto.is_private),
    verificado: !!(bruto.verified ?? bruto.is_verified),
    posts,
    diasSemPostar,
    engajamento,
    postsPorMes,
    soLinkNaBio: !!link && AGREGADORES.test(link),
    analisadoEm: new Date().toISOString(),
  };
}

/**
 * Traduz o perfil em sinais de qualificação.
 *
 * Só marca critério que o projeto usa, igual `sinaisDoLugar`: um projeto de
 * site não ganha "sem post há 30 dias" só porque o dado veio na resposta.
 *
 * Devolve também o que precisa ser DESMARCADO: reanalisar um perfil que
 * voltou a postar tem que apagar o `parado_30d` de antes, senão a etiqueta
 * mente e você aborda o cliente com um motivo que não existe mais.
 */
export function sinaisDoPerfil(
  perfil: PerfilInstagram | null,
  criterios: Criterio[],
  temSite: boolean
): { marcar: Sinais; desmarcar: string[] } {
  const aceita = new Set(criterios.map((c) => c.chave));
  const marcar: Sinais = {};
  const desmarcar: string[] = [];

  const avaliar = (chave: string, condicao: boolean | null) => {
    if (!aceita.has(chave) || condicao === null) return;
    if (condicao) marcar[chave] = true;
    else desmarcar.push(chave);
  };

  // Perfil não encontrado: o lead simplesmente não tem Instagram.
  if (!perfil) {
    avaliar("sem_instagram", true);
    return { marcar, desmarcar };
  }

  avaliar("sem_instagram", false);

  // Seguidores e link da bio aparecem mesmo em perfil privado.
  avaliar(
    "poucos_seguidores",
    perfil.seguidores === null ? null : perfil.seguidores < 500
  );
  avaliar("so_linktree", perfil.soLinkNaBio && !temSite);

  // Os posts, não. Perfil privado esconde o feed, então ritmo e engajamento
  // ficam desconhecidos — e chutar viraria etiqueta errada no card.
  if (perfil.privado) return { marcar, desmarcar };

  avaliar(
    "parado_30d",
    perfil.diasSemPostar === null ? null : perfil.diasSemPostar >= 30
  );

  return { marcar, desmarcar };
}

/** As palavras que mais aparecem nas legendas — o que o perfil fala. */
export function temasDasLegendas(perfil: PerfilInstagram, quantas = 8): string[] {
  const vazias = new Set([
    "para", "com", "que", "uma", "por", "mais", "seu", "sua", "nos", "nas",
    "dos", "das", "você", "voce", "aqui", "hoje", "the", "and", "for", "você",
    "nossa", "nosso", "pelo", "pela", "está", "esta", "são", "sao", "tem",
  ]);

  const contagem = new Map<string, number>();
  for (const p of perfil.posts) {
    for (const palavra of p.legenda.toLowerCase().split(/[^a-zà-ÿ0-9]+/)) {
      if (palavra.length < 4 || vazias.has(palavra)) continue;
      contagem.set(palavra, (contagem.get(palavra) ?? 0) + 1);
    }
  }

  return [...contagem.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, quantas)
    .map(([p]) => p);
}
