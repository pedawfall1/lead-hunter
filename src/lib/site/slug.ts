/**
 * O slug é a URL pública da demo, e a URL é a única proteção dela: quem tem
 * o link entra, sem login. Por isso o sufixo aleatório não é enfeite — sem
 * ele, `/demo/advocacia-silva` seria adivinhável e daria para listar as
 * propostas de todo mundo chutando nome de negócio.
 */

/** "Advocacia Silva & Cia" -> "advocacia-silva-cia" */
export function aparar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

function sufixo(tamanho = 8): string {
  const alfabeto = "abcdefghijkmnpqrstuvwxyz23456789"; // sem l/o/0/1
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export function montarSlug(nome: string): string {
  const base = aparar(nome) || "demo";
  return `${base}-${sufixo()}`;
}
