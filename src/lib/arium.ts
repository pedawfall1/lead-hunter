import { createClient } from "./supabase/server";
import type { Lead, Projeto } from "./types";

/**
 * Ponte manual com o Arium CRM — mesmo Supabase (auth.users compartilhado,
 * mesma convenção de outros sistemas como o mc_*), tabela crm_contacts.
 *
 * Não é automático de propósito: só o clique em "Enviar pro Arium" no lead
 * cria o contato lá. Isso evita que qualquer lead frio da prospecção vire
 * "cliente" no CRM sem você decidir.
 */
const TABELA_CONTATOS_ARIUM = "crm_contacts";

export type ResultadoEnvioArium = {
  contactId: string;
  /** true quando já existia um contato ligado a este lead — não duplicou. */
  jaExistia: boolean;
};

function montarNotas(lead: Lead, projeto: Projeto): string | null {
  return (
    [
      `Lead Hunter · projeto: ${projeto.nome}`,
      lead.endereco,
      lead.instagram ? `Instagram: @${lead.instagram}` : null,
      lead.site_url ? `Site: ${lead.site_url}` : null,
      lead.nota,
    ]
      .filter(Boolean)
      .join(" • ") || null
  );
}

export async function enviarLeadParaArium(
  lead: Lead,
  projeto: Projeto
): Promise<ResultadoEnvioArium> {
  const supabase = createClient();

  // Dedup pelo id do lead — mais preciso que telefone, que pode repetir
  // entre projetos ou nem existir.
  const { data: existente, error: erroBusca } = await supabase
    .from(TABELA_CONTATOS_ARIUM)
    .select("id")
    .eq("lh_lead_id", lead.id)
    .maybeSingle();
  if (erroBusca) throw new Error(erroBusca.message);
  if (existente) return { contactId: existente.id as string, jaExistia: true };

  const { data, error } = await supabase
    .from(TABELA_CONTATOS_ARIUM)
    .insert({
      nome: lead.nome,
      telefone: lead.telefone,
      email: lead.email,
      origem: "Lead Hunter",
      estagio: "lead",
      notas: montarNotas(lead, projeto),
      lh_lead_id: lead.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { contactId: data.id as string, jaExistia: false };
}
