"use server";

import { revalidatePath } from "next/cache";
import {
  atualizarProjetoDb,
  criarProjetoDb,
  excluirProjetoDb,
} from "@/lib/db";
import { mensagemDeErro } from "@/lib/erros";
import type { ActionResult } from "@/lib/types";

function revalidar(id?: string) {
  revalidatePath("/projetos");
  if (id) revalidatePath(`/projetos/${id}`);
  revalidatePath("/");
}

function ler(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const nicho = String(formData.get("nicho") ?? "").trim();
  const regiao = String(formData.get("regiao") ?? "").trim();
  return { nome, nicho: nicho || null, regiao: regiao || null };
}

export async function criarProjeto(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const dados = ler(formData);
  if (!dados.nome) return { ok: false, erro: "O nome do projeto e obrigatorio." };

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
  if (!dados.nome) return { ok: false, erro: "O nome do projeto e obrigatorio." };

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
