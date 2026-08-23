import { notFound } from "next/navigation";
import { listarLeads, listarTemplates, obterProjeto } from "@/lib/db";
import QuadroLeads from "@/components/leads/QuadroLeads";

export const dynamic = "force-dynamic";

// Evita mandar um id invalido para uma coluna uuid: cai em 404, nao em erro.
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

  return (
    <QuadroLeads projeto={projeto} leadsIniciais={leads} templates={templates} />
  );
}
