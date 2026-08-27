/**
 * O slug é o endereço público da demo: `/s/gabriela-fachini`.
 *
 * A primeira versão colava 8 caracteres aleatórios no fim, e eles eram a
 * fechadura da página — sem login, quem tem o link entra. O endereço ficava
 * `/demo/gabriela-fachini-estetica-e-depilacao-a-vwyktxd6`, que é feio de
 * mandar no WhatsApp de um cliente.
 *
 * A troca foi deliberada: endereço curto e apresentável em vez de
 * obscuridade. O custo é real e vale registrar — quem souber o nome de um
 * negócio consegue adivinhar o endereço da proposta dele. O que ainda
 * protege é o `publicado` (despublicar tira do ar na hora) e o `noindex`
 * (não entra em buscador).
 *
 * Se um dia isso incomodar, voltar o sufixo é mexer só neste arquivo.
 */

/** Ligações que não ajudam a identificar o negócio e só alongam a URL. */
const VAZIAS = new Set([
  "e", "de", "da", "do", "das", "dos", "em", "no", "na", "a", "o", "as", "os",
  "para", "por", "com", "the", "and",
]);

/** "Advocacia Silva & Cia" -> ["advocacia", "silva", "cia"] */
function palavras(nome: string): string[] {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p && !VAZIAS.has(p));
}

/** Onde o slug para de crescer. Cabe na tela do WhatsApp sem quebrar. */
const LIMITE = 18;

/**
 * As primeiras palavras que identificam o negócio, até encher a medida.
 *
 * Contar palavras não funciona: "Odonto Sorriso" precisa das duas e "La Vie
 * Estética" precisa das três. Medir o comprimento resolve os dois, e evita
 * o corte no meio do nome — "AgroPet Bom Amigo" virava "agropet-bom", que
 * parece endereço truncado.
 *
 * A palavra seguinte só entra se couber inteira: cortar no meio de uma
 * palavra é pior do que parar antes dela.
 */
export function aparar(nome: string): string {
  const ps = palavras(nome);
  if (!ps.length) return "";

  const escolhidas = [ps[0]];
  for (const p of ps.slice(1, 3)) {
    const comEla = [...escolhidas, p].join("-");
    if (comEla.length > LIMITE) break;
    escolhidas.push(p);
  }

  return escolhidas.join("-").slice(0, 32).replace(/-+$/, "");
}

/**
 * O slug livre para este nome.
 *
 * Sem sufixo aleatório, dois negócios de nome parecido colidiriam — e o
 * slug é único no banco, então o segundo simplesmente falharia. O `-2`
 * resolve do jeito que qualquer site resolve.
 */
export async function montarSlug(
  nome: string,
  emUso: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = aparar(nome) || "demo";

  if (!(await emUso(base))) return base;

  for (let n = 2; n <= 40; n++) {
    const tentativa = `${base}-${n}`;
    if (!(await emUso(tentativa))) return tentativa;
  }

  // Quarenta homônimos é sinal de que algo está errado, mas a geração não
  // pode morrer por isso: cai no aleatório, feio e funcionando.
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
