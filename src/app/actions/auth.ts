"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE_DEMO, DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/** Retorna a mensagem de erro; em caso de sucesso redireciona e nao retorna nada. */
export async function entrar(
  formData: FormData
): Promise<{ erro: string } | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const bruto = String(formData.get("next") ?? "/");
  const proximo = bruto.startsWith("/") ? bruto : "/";

  if (!email) return { erro: "Informe um email." };

  if (DEMO) {
    // Sem Supabase configurado: qualquer credencial entra, o cookie faz as vezes de sessao.
    cookies().set(COOKIE_DEMO, encodeURIComponent(email), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    revalidatePath("/", "layout");
    redirect(proximo);
  }

  if (!senha) return { erro: "Informe a senha." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return {
      erro: /invalid login credentials/i.test(error.message)
        ? "Email ou senha incorretos."
        : error.message,
    };
  }

  revalidatePath("/", "layout");
  // redirect() lanca por dentro: precisa ficar fora de try/catch.
  redirect(proximo);
}

export async function sair() {
  if (DEMO) {
    cookies().delete(COOKIE_DEMO);
  } else {
    await createClient().auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
