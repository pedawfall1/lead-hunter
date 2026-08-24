"use client";

import { useDraggable } from "@dnd-kit/core";
import { formatarTelefone } from "@/lib/format";
import { rotulosDosSinais } from "@/lib/servicos";
import { balde, rotuloPrazo } from "@/lib/agenda";
import type { Criterio, Lead } from "@/lib/types";
import { IconInstagram, IconWhatsapp } from "@/components/ui/icons";
import { TagsSinais } from "./Sinais";

type Props = {
  lead: Lead;
  criterios: Criterio[];
  tentativas?: number;
  aoAbrir?: (lead: Lead, aba?: "detalhes" | "whatsapp") => void;
  /** usado no DragOverlay: não registra o draggable */
  overlay?: boolean;
};

const CORES_PRAZO: Record<string, string> = {
  atrasado: "border-st-descartado/40 bg-st-descartado/10 text-st-descartado",
  hoje: "border-st-negociando/40 bg-st-negociando/10 text-st-negociando",
  semana: "border-line bg-ink-800 text-slate-400",
  depois: "border-line bg-ink-800 text-slate-500",
};

export default function CartaoLead({
  lead,
  criterios,
  tentativas = 0,
  aoAbrir,
  overlay,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
    disabled: !!overlay,
  });

  const telefone = formatarTelefone(lead.telefone);
  const sinais = rotulosDosSinais(lead.sinais, criterios);
  const prazo = balde(lead.proximo_contato);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners ?? {})}
      {...(overlay ? {} : attributes)}
      onClick={() => aoAbrir?.(lead)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !overlay) {
          e.preventDefault();
          aoAbrir?.(lead);
        }
      }}
      className={`group w-full cursor-grab touch-manipulation select-none rounded-lg border border-line bg-ink-700 p-3 text-left
                  transition-colors hover:border-slate-600 hover:bg-ink-600 active:cursor-grabbing
                  ${isDragging ? "opacity-30" : ""}
                  ${overlay ? "rotate-2 border-brand/50 shadow-card" : ""}`}
    >
      <p className="text-sm font-medium leading-snug text-slate-100">{lead.nome}</p>

      {sinais.length > 0 && (
        <div className="mt-2">
          <TagsSinais rotulos={sinais} max={2} compacto />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-xs tabular-nums text-slate-400">
          {telefone || "sem telefone"}
        </span>

        {/* canais que a busca no mapa costuma trazer e ninguem via aqui */}
        {lead.instagram && (
          <span
            className="shrink-0 text-slate-600"
            title={`@${lead.instagram.replace(/^@/, "")}`}
          >
            <IconInstagram className="h-3.5 w-3.5" />
          </span>
        )}
        {lead.email && (
          <span className="shrink-0 text-[11px] text-slate-600" title={lead.email}>
            ✉
          </span>
        )}

        {telefone && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              aoAbrir?.(lead, "whatsapp");
            }}
            className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-[#25D366]/15 hover:text-[#25D366]"
            aria-label={`Enviar WhatsApp para ${lead.nome}`}
          >
            <IconWhatsapp className="h-4 w-4" />
          </button>
        )}
      </div>

      {(prazo || tentativas > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {prazo && (
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${CORES_PRAZO[prazo]}`}
            >
              {rotuloPrazo(lead.proximo_contato)}
            </span>
          )}
          {tentativas > 0 && (
            <span className="text-[10px] text-slate-500">
              {tentativas} {tentativas === 1 ? "toque" : "toques"}
            </span>
          )}
        </div>
      )}

      {lead.nota && (
        <p className="mt-2 line-clamp-2 border-t border-line pt-2 text-[11px] leading-snug text-slate-500">
          {lead.nota}
        </p>
      )}
    </div>
  );
}
