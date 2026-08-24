"use server";

import { revalidatePath } from "next/cache";
import {
  atualizarBuscaDb,
  criarBuscaDb,
  importarLugaresDb,
  obterBuscaDb,
  obterProjeto,
  type LugarImportado,
} from "@/lib/db";
import {
  estadoDaCorrida,
  iniciarCorrida,
  itensDaCorrida,
} from "@/lib/apify";
import { normalizarLugar, sinaisDoLugar } from "@/lib/mapas";
import { mensagemDeErro } from "@/lib/erros";
import type { ActionResult, Busca } from "@/lib/types";

/**
 * Dispara a raspagem no Apify e registra a corrida.
 *
 * Volta na hora, sem esperar o scraper: quem acompanha é `conferirBusca`,
 * chamada de tempos em tempos pela tela. Assim fechar a aba não perde nada.
 */
export async function iniciarBusca(
  projetoId: string,
  dados: {
    termo: string;
    local: string;
    limite: number;
    soSemSite: boolean;
    buscarContatos: boolean;
  }
): Promise<ActionResult<Busca>> {
  const termo = dados.termo.trim();
  const local = dados.local.trim();

  if (!termo) return { ok: false, erro: "Diga o que procurar." };
  if (!local) return { ok: false, erro: "Diga a cidade ou região." };

  // Teto para o crédito do Apify não sumir numa busca só.
  const limite = Math.min(Math.max(Math.round(dados.limite) || 50, 1), 300);

  try {
    const projeto = await obterProjeto(projetoId);
    if (!projeto) return { ok: false, erro: "Projeto não encontrado." };

    const corrida = await iniciarCorrida({
      termo,
      local,
      limite,
      soSemSite: dados.soSemSite,
      buscarContatos: dados.buscarContatos,
    });

    const busca = await criarBuscaDb(projetoId, {
      run_id: corrida.runId,
      dataset_id: corrida.datasetId,
      termo,
      local,
      limite,
    });

    return { ok: true, data: busca };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/**
 * Confere a corrida. Quando o Apify termina, importa os lugares na hora e
 * fecha o registro — então chamar isto de novo é barato e idempotente.
 */
export async function conferirBusca(
  buscaId: string
): Promise<ActionResult<Busca>> {
  try {
    const busca = await obterBuscaDb(buscaId);
    if (!busca) return { ok: false, erro: "Busca não encontrada." };
    if (busca.status !== "rodando") return { ok: true, data: busca };

    const corrida = await estadoDaCorrida(busca.run_id);

    if (corrida.status === "rodando") {
      return { ok: true, data: busca };
    }

    if (corrida.status === "erro") {
      const atualizada = await atualizarBuscaDb(busca.id, {
        status: "erro",
        erro:
          corrida.recado ??
          "O Apify terminou a corrida sem sucesso. Veja o log da corrida no painel do Apify.",
        concluido_em: new Date().toISOString(),
      });
      return { ok: true, data: atualizada };
    }

    const datasetId = corrida.datasetId ?? busca.dataset_id;
    if (!datasetId) {
      const atualizada = await atualizarBuscaDb(busca.id, {
        status: "erro",
        erro: "A corrida terminou mas não devolveu resultado.",
        concluido_em: new Date().toISOString(),
      });
      return { ok: true, data: atualizada };
    }

    const brutos = await itensDaCorrida(datasetId, busca.limite);
    const projeto = await obterProjeto(busca.projeto_id);

    const lugares: LugarImportado[] = [];
    for (const bruto of brutos) {
      const lugar = normalizarLugar(bruto);
      if (!lugar) continue;
      lugares.push({
        nome: lugar.nome,
        telefone: lugar.telefone,
        endereco: lugar.endereco,
        instagram: lugar.instagram,
        email: lugar.email,
        sinais: sinaisDoLugar(lugar, projeto?.criterios ?? []),
        place_id: lugar.placeId,
      });
    }

    const { inseridos, duplicados } = await importarLugaresDb(
      busca.projeto_id,
      lugares
    );

    const atualizada = await atualizarBuscaDb(busca.id, {
      dataset_id: datasetId,
      status: "concluida",
      encontrados: brutos.length,
      inseridos,
      duplicados,
      concluido_em: new Date().toISOString(),
    });

    revalidatePath(`/projetos/${busca.projeto_id}`);
    revalidatePath("/projetos");
    revalidatePath("/");

    return { ok: true, data: atualizada };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
