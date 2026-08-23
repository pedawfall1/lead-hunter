import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com service_role: ignora RLS.
 *
 * Existe só para o webhook do n8n, que chega sem sessão de usuário e
 * precisa gravar em nome do dono do lead. NUNCA importe isto de um
 * componente cliente — a chave daria acesso total ao banco.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient só pode rodar no servidor.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chave) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — o webhook do n8n precisa dela."
    );
  }

  return createSupabaseClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
