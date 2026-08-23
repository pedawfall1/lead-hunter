"use server";

import { revalidatePath } from "next/cache";
import {
  atualizarTemplateDb,
  criarTemplateDb,
  excluirTemplateDb,
} from "@/lib/db";
import { mensagemDeErro } from "@/lib/erros";
import type { ActionResult, Template } from "@/lib/types";

function ler(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    texto: String(formData.get("texto") ?? "").trim(),
  };
}

function validar({ nome, texto }: { nome: string; texto: string }) {
  if (!nome) return "Dê um nome ao template.";
  if (!texto) return "A mensagem não pode ficar vazia.";
  return null;
}

export async function criarTemplate(
  formData: FormData
): Promise<ActionResult<Template>> {
  const dados = ler(formData);
  const invalido = validar(dados);
  if (invalido) return { ok: false, erro: invalido };

  try {
    const template = await criarTemplateDb(dados);
    revalidatePath("/templates");
    return { ok: true, data: template };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function atualizarTemplate(
  id: string,
  formData: FormData
): Promise<ActionResult<Template>> {
  const dados = ler(formData);
  const invalido = validar(dados);
  if (invalido) return { ok: false, erro: invalido };

  try {
    const template = await atualizarTemplateDb(id, dados);
    revalidatePath("/templates");
    return { ok: true, data: template };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function excluirTemplate(id: string): Promise<ActionResult> {
  try {
    await excluirTemplateDb(id);
    revalidatePath("/templates");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
