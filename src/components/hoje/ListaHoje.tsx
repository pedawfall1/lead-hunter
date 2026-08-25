"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adiarLead } from "@/app/actions/leads";
import { montarAgenda, rotuloPrazo, somarDias, type Balde } from "@/lib/agenda";
import { formatarTelefone } from "@/lib/format";
import { rotulosDosSinais } from "@/lib/servicos";
import { STATUS_META } from "@/lib/status";
import type { Interacao, Lead, Projeto, Template } from "@/lib/types";
import { IconCheck, IconChevron, IconWhatsapp } from "@/components/ui/icons";
import { TagsSinais } from "@/components/leads/Sinais";
import ModalLead from "@/components/leads/ModalLead";

const BALDES: { chave: Balde; titulo: string; cor: string; vazio: string }[] = [
  { chave: "atrasado", titulo: "Atrasados", cor: "#fb7185", vazio: "Nada atrasado. Bom sinal." },
  { chave: "hoje", titulo: "Hoje", cor: "#fbbf24", vazio: "Nenhum retorno marcado para hoje." },
  { chave: "semana", titulo: "Próximos 7 dias", cor: "#38bdf8", vazio: "Semana livre." },
];

export default function ListaHoje({
  leads: leadsIniciais,
  projetos,
  templates,
  interacoesIniciais,
  n8nAtivo,
  openaiAtivo,
}: {
  leads: Lead[];
  projetos: Projeto[];
  templates: Template[];
  interacoesIniciais: Record<string, Interacao[]>;
  n8nAtivo: boolean;
  openaiAtivo: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [leads, setLeads] = useState(leadsIniciais);
  const [interacoes, setInteracoes] = useState(interacoesIniciais);
  const [aberto, setAberto] = useState<{
    id: string;
    aba: "detalhes" | "whatsapp";
  } | null>(null);

  useEffect(() => setLeads(leadsIniciais), [leadsIniciais]);
  useEffect(() => setInteracoes(interacoesIniciais), [interacoesIniciais]);

  const porId = useMemo(
    () => Object.fromEntries(projetos.map((p) => [p.id, p])) as Record<string, Projeto>,
    [projetos]
  );
  const agenda = useMemo(() => montarAgenda(leads), [leads]);
  const total = agenda.atrasado.length + agenda.hoje.length;

  const leadAberto = aberto ? leads.find((l) => l.id === aberto.id) ?? null : null;
  const projetoAberto = leadAberto ? porId[leadAberto.projeto_id] : null;

  function adiar(lead: Lead, dias: number) {
    iniciar(async () => {
      const r = await adiarLead(lead.id, lead.projeto_id, somarDias(dias));
      if (r.ok && r.data) {
        const atualizado = r.data;
        setLeads((ls) => ls.map((l) => (l.id === atualizado.id ? atualizado : l)));
      }
    });
  }

  function concluir(lead: Lead) {
    iniciar(async () => {
      const r = await adiarLead(lead.id, lead.projeto_id, null);
      if (r.ok) setLeads((ls) => ls.filter((l) => l.id !== lead.id));
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Hoje
        </h1>
        <p className="mt-0.5 text-sm text-slate-400">
          {total === 0
            ? "Nenhum retorno pendente agora."
            : `${total} ${total === 1 ? "lead pedindo" : "leads pedindo"} contato`}
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="text-3xl">☕</span>
          <h2 className="text-base font-semibold text-white">Agenda vazia</h2>
          <p className="max-w-sm text-sm text-slate-400">
            Quando você abre o WhatsApp de um lead, o próximo retorno é agendado
            sozinho e aparece aqui. Também dá pra marcar a data na mão no card do
            lead.
          </p>
          <Link href="/projetos" className="btn-primary mt-2">
            Ir para os projetos
          </Link>
        </div>
      ) : (
        BALDES.map(({ chave, titulo, cor, vazio }) => {
          const lista = agenda[chave];
          return (
            <section key={chave}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cor }}
                />
                <h2 className="text-sm font-semibold text-slate-200">{titulo}</h2>
                <span className="rounded-full bg-ink-700 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-400">
                  {lista.length}
                </span>
              </div>

              {lista.length === 0 ? (
                <p className="rounded-xl border border-line/70 bg-ink-900/60 px-4 py-5 text-center text-xs text-slate-600">
                  {vazio}
                </p>
              ) : (
                <ul className="space-y-2">
                  {lista.map((lead) => {
                    const projeto = porId[lead.projeto_id];
                    const meta = STATUS_META[lead.status];
                    const sinais = rotulosDosSinais(
                      lead.sinais,
                      projeto?.criterios ?? []
                    );
                    return (
                      <li key={lead.id} className="card p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setAberto({ id: lead.id, aba: "detalhes" })}
                          >
                            <p className="truncate text-[15px] font-medium text-slate-100">
                              {lead.nome}
                            </p>
                            <p className="mt-0.5 text-xs leading-snug text-slate-500">
                              {projeto?.nome ?? "—"} ·{" "}
                              <span style={{ color: meta.cor }}>{meta.label}</span>{" "}
                              · {rotuloPrazo(lead.proximo_contato)}
                            </p>
                          </button>

                          <button
                            onClick={() => setAberto({ id: lead.id, aba: "whatsapp" })}
                            className="btn-wa shrink-0 px-3 py-1.5 text-xs"
                            disabled={!lead.telefone}
                          >
                            <IconWhatsapp className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Abordar</span>
                          </button>
                        </div>

                        {sinais.length > 0 && (
                          <div className="mt-2">
                            <TagsSinais rotulos={sinais} max={3} compacto />
                          </div>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                          <span className="mr-1 text-[11px] tabular-nums text-slate-500">
                            {formatarTelefone(lead.telefone) || "sem telefone"}
                          </span>
                          <button
                            className="chip border-line bg-ink-700 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
                            onClick={() => adiar(lead, 1)}
                            disabled={pendente}
                          >
                            +1 dia
                          </button>
                          <button
                            className="chip border-line bg-ink-700 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
                            onClick={() => adiar(lead, 7)}
                            disabled={pendente}
                          >
                            +1 semana
                          </button>
                          <button
                            className="chip border-st-fechou/30 bg-st-fechou/10 px-2 py-0.5 text-[11px] text-st-fechou hover:bg-st-fechou/20"
                            onClick={() => concluir(lead)}
                            disabled={pendente}
                          >
                            <IconCheck className="h-3 w-3" />
                            resolvido
                          </button>
                          <Link
                            href={`/projetos/${lead.projeto_id}`}
                            className="ml-auto text-[11px] text-slate-500 hover:text-slate-300"
                          >
                            no quadro <IconChevron className="inline h-3 w-3" />
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}

      {leadAberto && projetoAberto && aberto && (
        <ModalLead
          lead={leadAberto}
          projeto={projetoAberto}
          templates={templates}
          interacoes={interacoes[leadAberto.id] ?? []}
          n8nAtivo={n8nAtivo}
          openaiAtivo={openaiAtivo}
          abaInicial={aberto.aba}
          aoFechar={() => {
            setAberto(null);
            router.refresh();
          }}
          aoAtualizar={(atualizado) =>
            setLeads((ls) => ls.map((l) => (l.id === atualizado.id ? atualizado : l)))
          }
          aoExcluir={(id) => setLeads((ls) => ls.filter((l) => l.id !== id))}
          aoMudarInteracoes={(leadId, lista) =>
            setInteracoes((m) => ({ ...m, [leadId]: lista }))
          }
        />
      )}
    </div>
  );
}
