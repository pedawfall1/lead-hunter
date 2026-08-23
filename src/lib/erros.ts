export function mensagemDeErro(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Algo deu errado. Tente de novo.";
}
