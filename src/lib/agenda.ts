import type { Lead } from "./types";

/** Data local no formato YYYY-MM-DD, sem passar por UTC. */
export function hojeISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function somarDias(dias: number, base = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return hojeISO(d);
}

/** Diferença em dias entre uma data ISO e hoje. Negativo = atrasado. */
export function diasAte(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const hoje = new Date(hojeISO() + "T00:00:00");
  const alvo = new Date(iso.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(alvo.getTime())) return null;
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

export function rotuloPrazo(iso: string | null | undefined): string {
  const d = diasAte(iso);
  if (d === null) return "";
  if (d < -1) return `${Math.abs(d)} dias atrasado`;
  if (d === -1) return "1 dia atrasado";
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d <= 7) return `em ${d} dias`;
  return new Date(iso!.slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export type Balde = "atrasado" | "hoje" | "semana" | "depois";

export function balde(iso: string | null | undefined): Balde | null {
  const d = diasAte(iso);
  if (d === null) return null;
  if (d < 0) return "atrasado";
  if (d === 0) return "hoje";
  if (d <= 7) return "semana";
  return "depois";
}

export type Agenda = {
  atrasado: Lead[];
  hoje: Lead[];
  semana: Lead[];
  depois: Lead[];
};

/** Separa os leads agendados em baldes, do mais urgente ao mais distante. */
export function montarAgenda(leads: Lead[]): Agenda {
  const vazio: Agenda = { atrasado: [], hoje: [], semana: [], depois: [] };

  for (const l of leads) {
    const b = balde(l.proximo_contato);
    if (b) vazio[b].push(l);
  }

  const porData = (a: Lead, b: Lead) =>
    (a.proximo_contato ?? "").localeCompare(b.proximo_contato ?? "");

  vazio.atrasado.sort(porData);
  vazio.hoje.sort(porData);
  vazio.semana.sort(porData);
  vazio.depois.sort(porData);

  return vazio;
}

/** Quantos pedem atenção agora: atrasados + hoje. */
export function pendentesHoje(leads: Lead[]): number {
  return leads.filter((l) => {
    const b = balde(l.proximo_contato);
    return b === "atrasado" || b === "hoje";
  }).length;
}

/** Dias sugeridos de cadência conforme quantas vezes já tentou. */
export function cadenciaSugerida(tentativas: number): number {
  if (tentativas <= 1) return 3;
  if (tentativas === 2) return 7;
  if (tentativas === 3) return 14;
  return 30;
}
