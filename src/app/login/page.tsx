import { DEMO } from "@/lib/config";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar - Lead Hunter" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const proximo = searchParams?.next ?? "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-2xl">
            🎯
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Lead Hunter
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Prospecção de clientes, sem planilha bagunçada.
          </p>
        </div>

        {DEMO && (
          <div className="mb-4 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2.5 text-xs leading-relaxed text-brand-soft">
            <span className="font-semibold">Modo demonstração.</span>{" "}
            <span className="text-slate-300">
              Sem Supabase configurado — entre com qualquer email para dar uma
              volta com dados fictícios.
            </span>
          </div>
        )}

        <div className="card p-6">
          <LoginForm proximo={proximo} demo={DEMO} />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          {DEMO
            ? "Nada digitado aqui sai desta máquina."
            : "Acesso restrito. Crie o usuário admin no painel do Supabase."}
        </p>
      </div>
    </main>
  );
}
