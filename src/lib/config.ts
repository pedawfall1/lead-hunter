/**
 * Modo demonstracao.
 *
 * Liga sozinho quando as chaves do Supabase nao existem — assim da pra rodar
 * `npm run dev` sem configurar nada e clicar em tudo com dados de mentira.
 * Force com NEXT_PUBLIC_DEMO=1 mesmo tendo Supabase configurado.
 *
 * Este arquivo nao importa nada de propósito: e seguro no servidor e no browser.
 */
export const DEMO =
  process.env.NEXT_PUBLIC_DEMO === "1" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cookie que faz as vezes de sessao no modo demo. */
export const COOKIE_DEMO = "lh_demo";
