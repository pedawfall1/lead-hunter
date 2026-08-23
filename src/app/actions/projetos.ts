"use server";

import { revalidatePath } from "next/cache";
import {
  atualizarProjetoDb,
  criarProjetoDb,
  excluirProjetoDb,
} from "@/lib/db";
import { mensagemDeErro } from "@/lib/erros";
import { criteriosSugeridos } from "@/lib/servicos";
import type { ActionResult, Criterio } from "@/lib/types";

function revalidar(id?: string) {
  revalidatePath("/projetos");
  if (id) revalidatePath(`/projetos/${id}`);
  revalidatePath("/hoje");
  revalidatePath("/");
}

function ler(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const nicho = String(formData.get("nicho") ?? "").trim();
  const regiao = String(formData.get("regiao") ?? "").trim();
  const servico = String(formData.get("servico") ?? "").trim() || null;

  // Os critérios marcados viram uma cópia dentro do projeto: o catálogo pode
  // mudar depois sem alterar o que já foi definido aqui.
  const catalogo = criteriosSugeridos(servico);
  const marcados = new Set(
    [...formData.entries()]
      .filter(([k, v]) => k.startsWith("criterio:") && (v === "on" || v === "true"))
      .map(([k]) => k.slice(9))
  );
  const criterios: Criterio[] = catalogo.filter((c) => marcados.has(c.chave));

  // critérios escritos à mão, um por linha
  String(formData.get("criterios_extras") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((label) => {
      const chave = label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (chave && !criterios.some((c) => c.chave === chave)) {
        criterios.push({ chave, label });
      }
    });

  return { nome, nicho: nicho || null, regiao: regiao || null, servico, criterios };
}

export async function criarProjeto(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const dados = ler(formData);
  if (!dados.nome) return { ok: false, erro: "O nome do projeto é obrigatório." };

  try {
    const projeto = await criarProjetoDb(dados);
    revalidar();
    return { ok: true, data: { id: projeto.id } };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function atualizarProjeto(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const dados = ler(formData);
  if (!dados.nome) return { ok: false, erro: "O nome do projeto é obrigatório." };

  try {
    await atualizarProjetoDb(id, dados);
    revalidar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function excluirProjeto(id: string): Promise<ActionResult> {
  try {
    await excluirProjetoDb(id);
    revalidar();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
