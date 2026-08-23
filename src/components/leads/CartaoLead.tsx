"use client";

import { useDraggable } from "@dnd-kit/core";
import { formatarTelefone } from "@/lib/format";
import type { Lead } from "@/lib/types";
import { IconNoSite, IconWhatsapp } from "@/components/ui/icons";

type Props = {
  lead: Lead;
  aoAbrir?: (lead: Lead, aba?: "detalhes" | "whatsapp") => void;
  /** usado no DragOverlay: nao registra o draggable */
  overlay?: boolean;
};

export default function CartaoLead({ lead, aoAbrir, overlay }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
    disabled: !!overlay,
  });

  const telefone = formatarTelefone(lead.telefone);

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
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-100">
          {lead.nome}
        </p>
        {!lead.tem_site && (
          <span
            title="Sem site"
            className="mt-0.5 shrink-0 rounded-md bg-brand/15 p-1 text-brand-soft"
          >
            <IconNoSite className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs tabular-nums text-slate-400">
          {telefone || "sem telefone"}
        </span>

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

      {lead.nota && (
        <p className="mt-2 line-clamp-2 border-t border-line pt-2 text-[11px] leading-snug text-slate-500">
          {lead.nota}
        </p>
      )}
    </div>
  );
}
