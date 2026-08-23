import Link from "next/link";
import { listarLeads, listarProjetos } from "@/lib/db";
import { contarSinais } from "@/lib/servicos";
import { CONTATADOS, RESPONDERAM } from "@/lib/status";
import { porcento } from "@/lib/format";
import type { LeadStatus } from "@/lib/types";
import FiltroProjeto from "@/components/dashboard/FiltroProjeto";
import CardMetrica from "@/components/dashboard/CardMetrica";
import GraficoStatus from "@/components/dashboard/GraficoStatus";
import { IconPlus } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { projeto?: string };
}) {
  const filtro = searchParams?.projeto ?? "todos";
  const projetos = await listarProjetos();

  const projetoValido =
    filtro !== "todos" && projetos.some((p) => p.id === filtro)
      ? filtro
      : "todos";

  const leads = await listarLeads(
    projetoValido === "todos" ? undefined : projetoValido
  );

  const contagem: Record<LeadStatus, number> = {
    novo: 0,
    contatado: 0,
    respondeu: 0,
    negociando: 0,
    fechou: 0,
    descartado: 0,
  };
  const criteriosPorProjeto = new Map(projetos.map((p) => [p.id, p.criterios]));
  let qualificados = 0;
  for (const l of leads) {
    if (contagem[l.status] !== undefined) contagem[l.status] += 1;
    const criterios = criteriosPorProjeto.get(l.projeto_id) ?? [];
    if (contarSinais(l.sinais, criterios) > 0) qualificados += 1;
  }

  const total = leads.length;
  const totalContatados = CONTATADOS.reduce((a, s) => a + contagem[s], 0);
  const totalResponderam = RESPONDERAM.reduce((a, s) => a + contagem[s], 0);
  const taxaResposta = porcento(totalResponderam, totalContatados);
  const taxaFechamento = porcento(contagem.fechou, total);

  const nomeProjeto =
    projetoValido === "todos"
      ? "Todos os projetos"
      : projetos.find((p) => p.id === projetoValido)?.nome ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">{nomeProjeto}</p>
        </div>
        <FiltroProjeto
          projetos={projetos.map((p) => ({ id: p.id, nome: p.nome }))}
          selecionado={projetoValido}
        />
      </div>

      {projetos.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="text-3xl">🎯</span>
          <h2 className="text-base font-semibold text-white">
            Comece criando um projeto
          </h2>
          <p className="max-w-sm text-sm text-slate-400">
            Um projeto agrupa os leads de um nicho e uma região. Ex.:
            &ldquo;Advogados - Videira&rdquo;.
          </p>
          <Link href="/projetos" className="btn-primary mt-2">
            <IconPlus className="h-4 w-4" />
            Criar projeto
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <CardMetrica
              titulo="Total de leads"
              valor={String(total)}
              detalhe={`${contagem.novo} ainda sem contato`}
            />
            <CardMetrica
              titulo="Leads qualificados"
              valor={String(qualificados)}
              detalhe={
                total ? `${porcento(qualificados, total)}% da base` : "—"
              }
              destaque="#fb923c"
            />
            <CardMetrica
              titulo="Taxa de resposta"
              valor={`${taxaResposta}%`}
              detalhe={`${totalResponderam} de ${totalContatados} contatados`}
              destaque="#a78bfa"
            />
            <CardMetrica
              titulo="Taxa de fechamento"
              valor={`${taxaFechamento}%`}
              detalhe={`${contagem.fechou} de ${total} leads`}
              destaque="#34d399"
            />
          </div>

          <GraficoStatus contagem={contagem} />

          {projetoValido !== "todos" && (
            <Link
              href={`/projetos/${projetoValido}`}
              className="btn-ghost w-full sm:w-auto"
            >
              Abrir kanban deste projeto
            </Link>
          )}
        </>
      )}
    </div>
  );
}
