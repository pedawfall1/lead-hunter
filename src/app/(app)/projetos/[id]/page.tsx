import { notFound } from "next/navigation";
import {
  interacoesPorLead,
  listarLeads,
  listarTemplates,
  obterProjeto,
  ultimaBuscaDb,
} from "@/lib/db";
import QuadroLeads from "@/components/leads/QuadroLeads";
import { n8nConfigurado } from "@/lib/n8n";
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

  const [leads, templates, ultimaBusca] = await Promise.all([
    listarLeads(params.id),
    listarTemplates(),
    ultimaBuscaDb(params.id),
  ]);

  const interacoes = await interacoesPorLead(leads.map((l) => l.id));

  return (
    <QuadroLeads
      projeto={projeto}
      leadsIniciais={leads}
      templates={templates}
      interacoesIniciais={interacoes}
      n8nAtivo={n8nConfigurado()}
      buscaAtiva={apifyConfigurado()}
      ultimaBusca={ultimaBusca}
    />
  );
}
