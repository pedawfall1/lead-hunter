import { cookies } from "next/headers";
import { COOKIE_DEMO, DEMO } from "./config";
import { createClient } from "./supabase/server";

export type Usuario = { email: string };

export async function usuarioAtual(): Promise<Usuario | null> {
  if (DEMO) {
    const valor = cookies().get(COOKIE_DEMO)?.value;
    return valor ? { email: decodeURIComponent(valor) } : null;
  }

  const {
    data: { user },
  } = await createClient().auth.getUser();

  return user ? { email: user.email ?? "" } : null;
}
