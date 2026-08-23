import { usuarioAtual } from "@/lib/auth";
import { DEMO } from "@/lib/config";
import Nav from "@/components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioAtual();

  return (
    <div className="min-h-screen">
      <Nav email={usuario?.email ?? null} />
      <main className="px-4 pb-24 pt-4 md:ml-60 md:px-8 md:pb-10 md:pt-8">
        {DEMO && (
          <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand-soft">
            <span className="font-semibold">Modo demonstracao</span>
            <span className="text-slate-400">
              dados ficticios, na memoria. Configure o Supabase no .env.local
              para valer de verdade.
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
