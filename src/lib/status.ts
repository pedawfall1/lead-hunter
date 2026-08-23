import { STATUS, type LeadStatus } from "./types";

type Meta = {
  label: string;
  /** cor hex - usada em graficos e estilos inline */
  cor: string;
  /** classes do "pill" de status */
  chip: string;
  /** classe da bolinha */
  dot: string;
};

export const STATUS_META: Record<LeadStatus, Meta> = {
  novo: {
    label: "Novo",
    cor: "#94a3b8",
    chip: "border-st-novo/30 bg-st-novo/10 text-st-novo",
    dot: "bg-st-novo",
  },
  contatado: {
    label: "Contatado",
    cor: "#38bdf8",
    chip: "border-st-contatado/30 bg-st-contatado/10 text-st-contatado",
    dot: "bg-st-contatado",
  },
  respondeu: {
    label: "Respondeu",
    cor: "#a78bfa",
    chip: "border-st-respondeu/30 bg-st-respondeu/10 text-st-respondeu",
    dot: "bg-st-respondeu",
  },
  negociando: {
    label: "Negociando",
    cor: "#fbbf24",
    chip: "border-st-negociando/30 bg-st-negociando/10 text-st-negociando",
    dot: "bg-st-negociando",
  },
  fechou: {
    label: "Fechou",
    cor: "#34d399",
    chip: "border-st-fechou/30 bg-st-fechou/10 text-st-fechou",
    dot: "bg-st-fechou",
  },
  descartado: {
    label: "Descartado",
    cor: "#fb7185",
    chip: "border-st-descartado/30 bg-st-descartado/10 text-st-descartado",
    dot: "bg-st-descartado",
  },
};

export const STATUS_ORDER = STATUS;

/** Leads que ja receberam contato (base da taxa de resposta). */
export const CONTATADOS: LeadStatus[] = [
  "contatado",
  "respondeu",
  "negociando",
  "fechou",
];

/** Leads que responderam ou avancaram alem disso. */
export const RESPONDERAM: LeadStatus[] = ["respondeu", "negociando", "fechou"];

export function ehStatus(v: unknown): v is LeadStatus {
  return typeof v === "string" && (STATUS as readonly string[]).includes(v);
}
