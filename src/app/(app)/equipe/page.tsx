import { listarMembros, minhaConexao, usuarioAtual } from "@/lib/db";
import { evolutionConfigurada } from "@/lib/evolution";
import PainelEquipe from "@/components/equipe/PainelEquipe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipe - Lead Hunter" };

export default async function EquipePage() {
  const [membros, euId, conexao] = await Promise.all([
    listarMembros(),
    usuarioAtual(),
    minhaConexao(),
  ]);

  return (
    <PainelEquipe
      membros={membros}
      euId={euId}
      evolutionPronta={evolutionConfigurada()}
      webhook={conexao?.webhook_url ?? null}
    />
  );
}
