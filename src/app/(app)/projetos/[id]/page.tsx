import { notFound } from "next/navigation";
import {
  interacoesPorLead,
  listarLeads,
  listarMembros,
  listarTemplates,
  minhaConexao,
  obterProjeto,
  ultimaBuscaDb,
  usuarioAtual,
} from "@/lib/db";
import QuadroLeads from "@/components/leads/QuadroLeads";
import { n8nConfigurado } from "@/lib/n8n";
import { openaiConfigurado } from "@/lib/site/gerar";
import { apifyConfigurado } from "@/lib/apify";

export const dynamic = "force-dynamic";

// Evita mandar um id inválido para uma coluna uuid: cai em 404, não em erro.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjetoPage({
  params,
}: {
  params: { id: string };
}) {
  if (!UUID.test(params.id)) notFound();

  const projeto = await obterProjeto(params.id);
  if (!projeto) notFound();

  const [leads, templates, ultimaBusca, conexao, membros, euId] =
    await Promise.all([
      listarLeads(params.id),
      listarTemplates(),
      ultimaBuscaDb(params.id),
      minhaConexao(),
      listarMembros(),
      usuarioAtual(),
    ]);

  const interacoes = await interacoesPorLead(leads.map((l) => l.id));

  return (
    <QuadroLeads
      projeto={projeto}
      leadsIniciais={leads}
      templates={templates}
      interacoesIniciais={interacoes}
      n8nAtivo={n8nConfigurado() || !!conexao?.webhook_url}
      openaiAtivo={openaiConfigurado()}
      buscaAtiva={apifyConfigurado()}
      ultimaBusca={ultimaBusca}
      membros={membros}
      euId={euId}
    />
  );
}
