import {
  interacoesPorLead,
  listarAgendados,
  listarProjetos,
  listarTemplates,
} from "@/lib/db";
import ListaHoje from "@/components/hoje/ListaHoje";
import { n8nConfigurado } from "@/lib/n8n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hoje - Lead Hunter" };

export default async function HojePage() {
  const [leads, projetos, templates] = await Promise.all([
    listarAgendados(),
    listarProjetos(),
    listarTemplates(),
  ]);

  const interacoes = await interacoesPorLead(leads.map((l) => l.id));

  return (
    <ListaHoje
      leads={leads}
      projetos={projetos}
      templates={templates}
      interacoesIniciais={interacoes}
      n8nAtivo={n8nConfigurado()}
    />
  );
}
