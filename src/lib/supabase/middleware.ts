import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_DEMO, DEMO } from "@/lib/config";

const ROTAS_PUBLICAS = [
  "/login",
  // Webhook do n8n: chega de fora, sem cookie de sessão, e se autentica
  // pelo header x-lh-token dentro da própria rota. Sem esta linha o
  // middleware devolve 307 para /login e o n8n nunca entrega evento.
  "/api/n8n",
  // Demo de site: o link vai pro cliente, que obviamente não tem login
  // aqui. A rota só serve linha publicada, e a página sai com noindex.
  "/s/",
  // endereço antigo das demos, que hoje só redireciona para /s
  "/demo/",
];

function ehPublica(pathname: string) {
  return ROTAS_PUBLICAS.some((r) => pathname.startsWith(r));
}

function redirecionar(request: NextRequest, logado: boolean) {
  const { pathname } = request.nextUrl;

  if (!logado && !ehPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (logado && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  // Modo demo: nem toca no Supabase, a sessao e so um cookie.
  if (DEMO) {
    const logado = !!request.cookies.get(COOKIE_DEMO)?.value;
    return redirecionar(request, logado) ?? NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: nao coloque codigo entre createServerClient e getUser().
  const { data, error } = await supabase.auth.getUser();

  /**
   * Sessão que o servidor não consegue validar vale menos que sessão
   * nenhuma: o cookie continua no navegador, o app acha que você está
   * logado, e cada tela quebra num erro sem saída.
   *
   * Aconteceu de verdade em produção com "JWT issued at future" — um
   * descompasso de relógio entre quem emitiu o token e quem validou. O
   * app ficou numa tela de erro que não dizia o que fazer.
   *
   * Aqui o cookie ruim é apagado e a pessoa cai no login, que é a única
   * ação que resolve. Entrar de novo emite um token limpo.
   */
  if (error && !ehPublica(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    url.searchParams.set("sessao", "expirada");

    const saida = NextResponse.redirect(url);
    for (const { name } of request.cookies.getAll()) {
      if (name.startsWith("sb-")) saida.cookies.delete(name);
    }
    return saida;
  }

  return redirecionar(request, !!data.user) ?? response;
}
