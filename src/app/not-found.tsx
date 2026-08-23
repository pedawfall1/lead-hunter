import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl">🕳️</span>
      <h1 className="text-lg font-semibold text-white">Pagina nao encontrada</h1>
      <p className="max-w-sm text-sm text-slate-400">
        O projeto pode ter sido excluido ou o link esta errado.
      </p>
      <Link href="/projetos" className="btn-primary mt-2">
        Voltar para os projetos
      </Link>
    </main>
  );
}
