import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl">🕳️</span>
      <h1 className="text-lg font-semibold text-white">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-slate-400">
        O projeto pode ter sido excluído ou o link está errado.
      </p>
      <Link href="/projetos" className="btn-primary mt-2">
        Voltar para os projetos
      </Link>
    </main>
  );
}
