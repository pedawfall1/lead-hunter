import {
  interacoesPorLead,
  listarLeads,
  listarProjetos,
  listarTemplates,
} from "@/lib/db";
import PainelRelatorios from "@/components/relatorios/PainelRelatorios";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const [leads, projetos, templates] = await Promise.all([
    listarLeads(),
    listarProjetos(),
    listarTemplates(),
  ]);

  const porLead = await interacoesPorLead(leads.map((l) => l.id));
  const interacoes = Object.values(porLead).flat();

  return (
    <PainelRelatorios
      leads={leads}
      interacoes={interacoes}
      projetos={projetos}
      templates={templates}
    />
  );
}
