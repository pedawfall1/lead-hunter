"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { atualizarStatus } from "@/app/actions/leads";
import { STATUS_ORDER, ehStatus } from "@/lib/status";
import { soDigitos } from "@/lib/format";
import type { Lead, LeadStatus, Projeto, Template } from "@/lib/types";
import Tooltip from "@/components/ui/Tooltip";
import {
  IconChevron,
  IconMap,
  IconNoSite,
  IconPlus,
  IconSearch,
  IconUpload,
} from "@/components/ui/icons";
import CartaoLead from "./CartaoLead";
import ColunaStatus from "./ColunaStatus";
import ModalLead from "./ModalLead";
import ModalNovoLead from "./ModalNovoLead";
import ModalImportarCsv from "./ModalImportarCsv";

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function QuadroLeads({
  projeto,
  leadsIniciais,
  templates,
}: {
  projeto: Projeto;
  leadsIniciais: Lead[];
  templates: Template[];
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();

  const [leads, setLeads] = useState<Lead[]>(leadsIniciais);
  const [busca, setBusca] = useState("");
  const [soSemSite, setSoSemSite] = useState(false);

  const [selecionado, setSelecionado] = useState<{
    id: string;
    aba: "detalhes" | "whatsapp";
  } | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalCsv, setModalCsv] = useState(false);
  const [arrastando, setArrastando] = useState<Lead | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Mantem o quadro em sincronia quando o servidor revalida.
  useEffect(() => setLeads(leadsIniciais), [leadsIniciais]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    })
  );

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const digitos = soDigitos(busca);

    return leads.filter((l) => {
      if (soSemSite && l.tem_site) return false;
      if (!termo) return true;

      const alvo = normalizar(
        `${l.nome} ${l.instagram ?? ""} ${l.endereco ?? ""}`
      );
      if (alvo.includes(termo)) return true;
      if (digitos.length >= 3 && soDigitos(l.telefone).includes(digitos))
        return true;
      return false;
    });
  }, [leads, busca, soSemSite]);

  const porStatus = useMemo(() => {
    const mapa: Record<LeadStatus, Lead[]> = {
      novo: [],
      contatado: [],
      respondeu: [],
      negociando: [],
      fechou: [],
      descartado: [],
    };
    for (const l of filtrados) mapa[l.status]?.push(l);
    return mapa;
  }, [filtrados]);

  const semSite = leads.filter((l) => !l.tem_site).length;
  const leadSelecionado = selecionado
    ? leads.find((l) => l.id === selecionado.id) ?? null
    : null;

  function abrirLead(lead: Lead, aba: "detalhes" | "whatsapp" = "detalhes") {
    setSelecionado({ id: lead.id, aba });
  }

  function aoIniciarArraste(e: DragStartEvent) {
    const lead = leads.find((l) => l.id === e.active.id);
    setArrastando(lead ?? null);
  }

  function aoTerminarArraste(e: DragEndEvent) {
    setArrastando(null);
    const { active, over } = e;
    if (!over) return;

    const destino = String(over.id);
    if (!ehStatus(destino)) return;

    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.status === destino) return;

    const anterior = lead.status;
    setLeads((ls) =>
      ls.map((l) => (l.id === lead.id ? { ...l, status: destino } : l))
    );

    iniciar(async () => {
      const r = await atualizarStatus(lead.id, projeto.id, destino);
      if (!r.ok) {
        setLeads((ls) =>
          ls.map((l) => (l.id === lead.id ? { ...l, status: anterior } : l))
        );
        setAviso(`Nao consegui mover o lead: ${r.erro}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* ---------- cabecalho ---------- */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/projetos"
            className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <IconChevron className="h-3.5 w-3.5 rotate-180" />
            Projetos
          </Link>
          <h1 className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {projeto.nome}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {[projeto.nicho, projeto.regiao].filter(Boolean).join(" · ") ||
              "sem nicho / regiao"}
            {" · "}
            {leads.length} {leads.length === 1 ? "lead" : "leads"}
            {semSite > 0 && ` · ${semSite} sem site`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setModalNovo(true)}>
            <IconPlus className="h-4 w-4" />
            Adicionar lead
          </button>
          <button className="btn-ghost" onClick={() => setModalCsv(true)}>
            <IconUpload className="h-4 w-4" />
            Importar CSV
          </button>
          <Tooltip texto="Em breve">
            <button
              className="btn-ghost pointer-events-none"
              disabled
              aria-disabled="true"
              title="Em breve"
            >
              <IconMap className="h-4 w-4" />
              Buscar no Google Maps
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ---------- filtros ---------- */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone, @..."
            inputMode="search"
          />
        </div>

        <button
          onClick={() => setSoSemSite((v) => !v)}
          className={`chip transition-colors ${
            soSemSite
              ? "border-brand/50 bg-brand/15 text-brand-soft"
              : "border-line bg-ink-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <IconNoSite className="h-3.5 w-3.5" />
          Sem site
        </button>

        {(busca || soSemSite) && (
          <span className="text-xs text-slate-500">
            {filtrados.length} de {leads.length}
            <button
              onClick={() => {
                setBusca("");
                setSoSemSite(false);
              }}
              className="ml-2 text-slate-400 underline underline-offset-2 hover:text-slate-200"
            >
              limpar
            </button>
          </span>
        )}
      </div>

      {/* ---------- kanban ---------- */}
      {leads.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="text-3xl">📋</span>
          <h2 className="text-base font-semibold text-white">
            Nenhum lead nesse projeto
          </h2>
          <p className="max-w-sm text-sm text-slate-400">
            Importe uma lista em CSV ou cadastre na mao enquanto prospecta na
            rua.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={() => setModalNovo(true)}>
              <IconPlus className="h-4 w-4" />
              Adicionar lead
            </button>
            <button className="btn-ghost" onClick={() => setModalCsv(true)}>
              <IconUpload className="h-4 w-4" />
              Importar CSV
            </button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCorners}
          onDragStart={aoIniciarArraste}
          onDragEnd={aoTerminarArraste}
          onDragCancel={() => setArrastando(null)}
        >
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:snap-none sm:px-0">
            {STATUS_ORDER.map((s) => (
              <ColunaStatus
                key={s}
                status={s}
                leads={porStatus[s]}
                aoAbrir={abrirLead}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {arrastando ? <CartaoLead lead={arrastando} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <p className="text-center text-xs text-slate-600 sm:text-left">
        Arraste os cards entre as colunas para mudar o status. No celular,
        segure o card por um instante antes de arrastar.
      </p>

      {/* ---------- modais ---------- */}
      {leadSelecionado && selecionado && (
        <ModalLead
          lead={leadSelecionado}
          projeto={projeto}
          templates={templates}
          abaInicial={selecionado.aba}
          aoFechar={() => setSelecionado(null)}
          aoAtualizar={(atualizado) =>
            setLeads((ls) =>
              ls.map((l) => (l.id === atualizado.id ? atualizado : l))
            )
          }
          aoExcluir={(id) => setLeads((ls) => ls.filter((l) => l.id !== id))}
        />
      )}

      {modalNovo && (
        <ModalNovoLead
          projetoId={projeto.id}
          aoFechar={() => setModalNovo(false)}
          aoCriado={(lead) => setLeads((ls) => [lead, ...ls])}
        />
      )}

      {modalCsv && (
        <ModalImportarCsv
          projetoId={projeto.id}
          aoFechar={() => setModalCsv(false)}
          aoImportar={(qtd) => {
            setAviso(`${qtd} ${qtd === 1 ? "lead importado" : "leads importados"}.`);
            router.refresh();
          }}
        />
      )}

      {aviso && (
        <div className="fixed bottom-20 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-lg border border-line bg-ink-700 px-4 py-3 text-sm text-slate-200 shadow-card md:bottom-6">
          {aviso}
        </div>
      )}
    </div>
  );
}
