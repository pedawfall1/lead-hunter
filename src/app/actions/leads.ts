"use server";

import { revalidatePath } from "next/cache";
import {
  ajustarLeadDb,
  atualizarLeadDb,
  criarInteracaoDb,
  criarLeadDb,
  excluirLeadDb,
  inserirLeadsDb,
  listarInteracoes,
  type DadosLead,
} from "@/lib/db";
import { cadenciaSugerida, somarDias } from "@/lib/agenda";
import { mensagemDeErro } from "@/lib/erros";
import { ehStatus } from "@/lib/status";
import type { ActionResult, Lead, LeadStatus, Sinais } from "@/lib/types";
import type { LinhaCsv } from "@/lib/csv";

function revalidar(projetoId: string) {
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
  revalidatePath("/hoje");
  revalidatePath("/");
}

function limpar(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Checkboxes `sinal:<chave>` viram o objeto de sinais. */
function lerSinais(formData: FormData): Sinais {
  const sinais: Sinais = {};
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("sinal:")) continue;
    if (valor === "on" || valor === "true") sinais[chave.slice(6)] = true;
  }
  return sinais;
}

/**
 * Campo numérico do formulário.
 *
 * `min`/`max` no input só valem no browser: o valor chega aqui como texto e
 * pode vir de qualquer lugar. Fora da faixa vira `null` em vez de gravar
 * uma nota de 9 estrelas no banco.
 */
function numero(
  v: FormDataEntryValue | null,
  min: number,
  max: number
): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function ler(formData: FormData): DadosLead {
  const statusBruto = String(formData.get("status") ?? "novo");
  const instagram = limpar(formData.get("instagram"));

  return {
    nome: String(formData.get("nome") ?? "").trim(),
    telefone: limpar(formData.get("telefone")),
    endereco: limpar(formData.get("endereco")),
    instagram: instagram ? instagram.replace(/^@/, "") : null,
    email: limpar(formData.get("email")),
    site_url: limpar(formData.get("site_url")),
    sinais: lerSinais(formData),
    status: ehStatus(statusBruto) ? statusBruto : "novo",
    nota: limpar(formData.get("nota")),
    proximo_contato: limpar(formData.get("proximo_contato")),
    google_nota: numero(formData.get("google_nota"), 1, 5),
    google_avaliacoes: numero(formData.get("google_avaliacoes"), 0, 1_000_000),
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
): Promise<ActionResult<Lead>> {
  if (!ehStatus(status)) return { ok: false, erro: "Status inválido." };

  try {
    const lead = await ajustarLeadDb(id, { status });
    revalidar(projetoId);
    return { ok: true, data: lead };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/** Reagenda o retorno. `null` limpa a data. */
export async function adiarLead(
  id: string,
  projetoId: string,
  data: string | null
): Promise<ActionResult<Lead>> {
  try {
    const lead = await ajustarLeadDb(id, { proximo_contato: data });
    revalidar(projetoId);
    return { ok: true, data: lead };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/**
 * Chamado quando o WhatsApp é aberto: registra a interação, promove quem
 * ainda estava em "novo" e já agenda o próximo toque conforme a cadência.
 */
export async function registrarDisparo(
  id: string,
  projetoId: string,
  dados: { texto: string; templateId: string | null; statusAtual: LeadStatus }
): Promise<ActionResult<Lead>> {
  try {
    await criarInteracaoDb(id, {
      tipo: "whatsapp",
      texto: dados.texto,
      template_id: dados.templateId,
    });

    const anteriores = await listarInteracoes(id);
    const tentativas = anteriores.filter((i) => i.tipo === "whatsapp").length;

    const campos: { status?: LeadStatus; proximo_contato: string } = {
      proximo_contato: somarDias(cadenciaSugerida(tentativas)),
    };
    if (dados.statusAtual === "novo") campos.status = "contatado";

    const lead = await ajustarLeadDb(id, campos);
    revalidar(projetoId);
    return { ok: true, data: lead };
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
      instagram: l.instagram?.trim().replace(/^@/, "") || null,
      sinais: l.sinais ?? {},
    }));

  try {
    const inseridos = await inserirLeadsDb(projetoId, registros);
    revalidar(projetoId);
    return { ok: true, data: { inseridos } };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}
