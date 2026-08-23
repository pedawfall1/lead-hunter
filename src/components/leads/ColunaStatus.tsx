"use client";

import { useDroppable } from "@dnd-kit/core";
import { STATUS_META } from "@/lib/status";
import type { Criterio, Lead, LeadStatus } from "@/lib/types";
import CartaoLead from "./CartaoLead";

export default function ColunaStatus({
  status,
  leads,
  criterios,
  tentativas,
  aoAbrir,
}: {
  status: LeadStatus;
  leads: Lead[];
  criterios: Criterio[];
  tentativas: Record<string, number>;
  aoAbrir: (lead: Lead, aba?: "detalhes" | "whatsapp") => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <div className="flex w-[78vw] max-w-[19rem] shrink-0 snap-start flex-col sm:w-72">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: meta.cor }}
        />
        <h2 className="text-sm font-semibold text-slate-200">{meta.label}</h2>
        <span className="rounded-full bg-ink-700 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-400">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[8rem] flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors
          ${
            isOver
              ? "border-brand/60 bg-brand/5"
              : "border-line/70 bg-ink-900/60"
          }`}
      >
        {leads.map((lead) => (
          <CartaoLead
            key={lead.id}
            lead={lead}
            criterios={criterios}
            tentativas={tentativas[lead.id] ?? 0}
            aoAbrir={aoAbrir}
          />
        ))}

        {leads.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-600">
            {isOver ? "Solte aqui" : "vazio"}
          </p>
        )}
      </div>
    </div>
  );
}
