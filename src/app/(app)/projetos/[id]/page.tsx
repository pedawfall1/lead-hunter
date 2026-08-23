import { notFound } from "next/navigation";
import {
  interacoesPorLead,
  listarLeads,
  listarTemplates,
  obterProjeto,
} from "@/lib/db";
import QuadroLeads from "@/components/leads/QuadroLeads";

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

  const [leads, templates] = await Promise.all([
    listarLeads(params.id),
    listarTemplates(),
  ]);

  const interacoes = await interacoesPorLead(leads.map((l) => l.id));

  return (
    <QuadroLeads
      projeto={projeto}
      leadsIniciais={leads}
      templates={templates}
      interacoesIniciais={interacoes}
    />
  );
}
