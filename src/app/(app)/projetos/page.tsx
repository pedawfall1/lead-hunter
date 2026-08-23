import { listarLeads, listarProjetos } from "@/lib/db";
import ListaProjetos, {
  type ProjetoResumo,
} from "@/components/projetos/ListaProjetos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projetos - Lead Hunter" };

export default async function ProjetosPage() {
  const [projetos, leads] = await Promise.all([listarProjetos(), listarLeads()]);

  const resumo = new Map<
    string,
    { total: number; semSite: number; fechou: number }
  >();

  for (const l of leads) {
    const r = resumo.get(l.projeto_id) ?? { total: 0, semSite: 0, fechou: 0 };
    r.total += 1;
    if (!l.tem_site) r.semSite += 1;
    if (l.status === "fechou") r.fechou += 1;
    resumo.set(l.projeto_id, r);
  }

  const lista: ProjetoResumo[] = projetos.map((p) => ({
    ...p,
    ...(resumo.get(p.id) ?? { total: 0, semSite: 0, fechou: 0 }),
  }));

  return <ListaProjetos projetos={lista} />;
}
