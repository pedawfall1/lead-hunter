import { listarLeads, listarProjetos } from "@/lib/db";
import { contarSinais } from "@/lib/servicos";
import ListaProjetos, {
  type ProjetoResumo,
} from "@/components/projetos/ListaProjetos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projetos - Lead Hunter" };

export default async function ProjetosPage() {
  const [projetos, leads] = await Promise.all([listarProjetos(), listarLeads()]);

  const porProjeto = new Map(projetos.map((p) => [p.id, p]));
  const resumo = new Map<
    string,
    { total: number; qualificados: number; fechou: number }
  >();

  for (const l of leads) {
    const r = resumo.get(l.projeto_id) ?? { total: 0, qualificados: 0, fechou: 0 };
    r.total += 1;
    const criterios = porProjeto.get(l.projeto_id)?.criterios ?? [];
    if (contarSinais(l.sinais, criterios) > 0) r.qualificados += 1;
    if (l.status === "fechou") r.fechou += 1;
    resumo.set(l.projeto_id, r);
  }

  const lista: ProjetoResumo[] = projetos.map((p) => ({
    ...p,
    ...(resumo.get(p.id) ?? { total: 0, qualificados: 0, fechou: 0 }),
  }));

  return <ListaProjetos projetos={lista} />;
}
