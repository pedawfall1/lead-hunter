"use server";

import { revalidatePath } from "next/cache";
import {
  atualizarLeadDb,
  atualizarStatusDb,
  criarLeadDb,
  excluirLeadDb,
  inserirLeadsDb,
  marcarContatadoDb,
  type DadosLead,
} from "@/lib/db";
import { mensagemDeErro } from "@/lib/erros";
import { ehStatus } from "@/lib/status";
import type { ActionResult, Lead, LeadStatus } from "@/lib/types";
import type { LinhaCsv } from "@/lib/csv";

function revalidar(projetoId: string) {
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
  revalidatePath("/");
}

function limpar(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function ler(formData: FormData): DadosLead {
  const statusBruto = String(formData.get("status") ?? "novo");
  const instagram = limpar(formData.get("instagram"));
  const temSite = formData.get("tem_site");

  return {
    nome: String(formData.get("nome") ?? "").trim(),
    telefone: limpar(formData.get("telefone")),
    endereco: limpar(formData.get("endereco")),
    tem_site: temSite === "on" || temSite === "true",
    instagram: instagram ? instagram.replace(/^@/, "") : null,
    status: ehStatus(statusBruto) ? statusBruto : "novo",
    nota: limpar(formData.get("nota")),
  };
}

export async function criarLead(
  projetoId: string,
  formData: FormData
): Promise<ActionResult<Lead>> {
  const dados = ler(formData);
  if (!dados.nome) return { ok: false, erro: "O nome do lead é obrigatório." };

  try {
    const lead = await criarLeadDb(projetoId, dados);
    revalidar(projetoId);
    return { ok: true, data: lead };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function atualizarLead(
  id: string,
  projetoId: string,
  formData: FormData
): Promise<ActionResult<Lead>> {
  const dados = ler(formData);
  if (!dados.nome) return { ok: false, erro: "O nome do lead é obrigatório." };

  try {
    const lead = await atualizarLeadDb(id, dados);
    revalidar(projetoId);
    return { ok: true, data: lead };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function atualizarStatus(
  id: string,
  projetoId: string,
  status: LeadStatus
): Promise<ActionResult> {
  if (!ehStatus(status)) return { ok: false, erro: "Status inválido." };

  try {
    await atualizarStatusDb(id, status);
    revalidar(projetoId);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/**
 * Marca como "contatado" apenas se o lead ainda estiver em "novo",
 * para nao regredir alguem que ja respondeu ou fechou.
 */
export async function marcarContatado(
  id: string,
  projetoId: string
): Promise<ActionResult> {
  try {
    await marcarContatadoDb(id);
    revalidar(projetoId);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function excluirLead(
  id: string,
  projetoId: string
): Promise<ActionResult> {
  try {
    await excluirLeadDb(id);
    revalidar(projetoId);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function importarLeads(
  projetoId: string,
  linhas: LinhaCsv[]
): Promise<ActionResult<{ inseridos: number }>> {
  if (!linhas.length) return { ok: false, erro: "Nada para importar." };
  if (linhas.length > 2000)
    return { ok: false, erro: "Máximo de 2000 leads por importação." };

  const registros = linhas
    .filter((l) => l.nome?.trim())
    .map((l) => ({
      nome: l.nome.trim(),
      telefone: l.telefone?.trim() || null,
      endereco: l.endereco?.trim() || null,
      tem_site: !!l.tem_site,
      instagram: l.instagram?.trim().replace(/^@/, "") || null,
    }));

  try {
    const inseridos = await inserirLeadsDb(projetoId, registros);
    revalidar(projetoId);
    return { ok: true, data: { inseridos } };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
