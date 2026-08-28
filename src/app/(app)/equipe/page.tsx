import { listarMembros, usuarioAtual } from "@/lib/db";
import { evolutionConfigurada } from "@/lib/evolution";
import PainelEquipe from "@/components/equipe/PainelEquipe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipe - Lead Hunter" };

export default async function EquipePage() {
  const [membros, euId] = await Promise.all([listarMembros(), usuarioAtual()]);

  return (
    <PainelEquipe
      membros={membros}
      euId={euId}
      evolutionPronta={evolutionConfigurada()}
    />
  );
}
