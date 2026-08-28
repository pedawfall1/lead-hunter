"use client";

import Link from "next/link";
import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { sair } from "@/app/actions/auth";
import { acharServico } from "@/lib/servicos";
import type { ProjetoNav } from "@/lib/db";
import {
  IconChevron,
  IconEquipe,
  IconFolder,
  IconLogout,
  IconMessage,
  IconPlus,
  IconRelatorio,
  IconSino,
} from "./ui/icons";

const LINKS = [
  { href: "/hoje", label: "Hoje", Icone: IconSino, exato: false },
  { href: "/", label: "Painel", Icone: IconRelatorio, exato: true },
  { href: "/projetos", label: "Projetos", Icone: IconFolder, exato: false },
  { href: "/templates", label: "Templates", Icone: IconMessage, exato: false },
  { href: "/equipe", label: "Equipe", Icone: IconEquipe, exato: false },
];

function ativo(pathname: string, href: string, exato: boolean) {
  return exato ? pathname === href : pathname.startsWith(href);
}

/* Alvo em SVG no lugar do emoji: o emoji muda de desenho em cada sistema
   e nunca acerta o peso do texto ao lado. */
function Marca({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-brand to-[#c2410c] shadow-[0_2px_10px_-2px_rgba(249,115,22,.6)]"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[62%] w-[62%]"
        fill="none"
        stroke="#0b1017"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="3.4" />
        <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
      </svg>
    </span>
  );
}

function Logo({ compacto }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Marca tamanho={compacto ? 30 : 34} />
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-white">
          Lead Hunter
        </span>
        {!compacto && (
          <span className="block text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Prospecção
          </span>
        )}
      </span>
    </div>
  );
}

function BotaoSair({ compacto }: { compacto?: boolean }) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      onClick={() => iniciar(async () => void (await sair()))}
      disabled={pendente}
      className={
        compacto
          ? "rounded-lg p-2 text-slate-400 transition-colors hover:bg-ink-700 hover:text-slate-200"
          : "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-ink-700 hover:text-slate-200"
      }
      aria-label="Sair"
      title="Sair"
    >
      <IconLogout className="h-4 w-4" />
      {!compacto && <span>{pendente ? "Saindo..." : "Sair"}</span>}
    </button>
  );
}

function Contador({ n, forte }: { n: number; forte?: boolean }) {
  if (n <= 0) return null;
  return (
    <span
      className={`ml-auto min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ${
        forte
          ? "bg-brand text-ink-950"
          : "bg-ink-700 text-slate-400 group-hover:text-slate-200"
      }`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function Nav({
  email,
  pendentes = 0,
  projetos = [],
}: {
  email: string | null;
  pendentes?: number;
  projetos?: ProjetoNav[];
}) {
  const pathname = usePathname() ?? "/";

  return (
    <>
      {/* ================= Sidebar (desktop) ================= */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-gradient-to-b from-ink-900 to-ink-950 md:flex">
        <div className="px-4 pb-4 pt-5">
          <Logo />
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          {LINKS.map(({ href, label, Icone, exato }) => {
            const on = ativo(pathname, href, exato);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-lg py-2 pl-3 pr-2.5 text-sm font-medium transition-colors ${
                  on
                    ? "bg-brand-dim text-brand-soft"
                    : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                }`}
              >
                {/* trilho: diz onde você está sem depender só da cor de fundo */}
                <span
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand transition-opacity ${
                    on ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icone className="h-[17px] w-[17px]" />
                {label}
                {href === "/hoje" && <Contador n={pendentes} forte />}
              </Link>
            );
          })}
        </nav>

        {/* ---- projetos: tira um clique do caminho mais usado ---- */}
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3">
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-600">
              Projetos
            </span>
            <Link
              href="/projetos"
              className="rounded p-0.5 text-slate-600 transition-colors hover:text-brand-soft"
              title="Novo projeto"
            >
              <IconPlus className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projetos.length === 0 ? (
            <Link
              href="/projetos"
              className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2.5 text-xs text-slate-500 transition-colors hover:border-brand/40 hover:text-slate-300"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Criar o primeiro
            </Link>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {projetos.map((p) => {
                const on = pathname === `/projetos/${p.id}`;
                const servico = acharServico(p.servico);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/projetos/${p.id}`}
                      className={`group flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] transition-colors ${
                        on
                          ? "bg-ink-700 text-white"
                          : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                      }`}
                      title={
                        servico
                          ? `${p.nome} · ${servico.label}`
                          : p.nome
                      }
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                          p.atrasados > 0
                            ? "bg-brand"
                            : on
                              ? "bg-slate-400"
                              : "bg-slate-700 group-hover:bg-slate-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                      <Contador n={p.total} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ---- pulso: só aparece quando há o que cobrar ---- */}
        {pendentes > 0 && (
          <Link
            href="/hoje"
            className="mx-3 mb-3 mt-4 flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.07] px-3 py-2.5 transition-colors hover:bg-brand/[0.12]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand-soft">
              <IconSino className="h-4 w-4" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[13px] font-semibold text-brand-soft">
                {pendentes} {pendentes === 1 ? "lead espera" : "leads esperam"}
              </span>
              <span className="block text-[11px] text-slate-500">
                retorno atrasado ou de hoje
              </span>
            </span>
            <IconChevron className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-soft/60" />
          </Link>
        )}

        <div className="border-t border-line px-3 py-3">
          {email && (
            <div className="mb-1 flex items-center gap-2.5 px-2.5 py-1">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-700 text-[10px] font-semibold uppercase text-slate-400">
                {email.slice(0, 2)}
              </span>
              <span className="truncate text-xs text-slate-500" title={email}>
                {email}
              </span>
            </div>
          )}
          <BotaoSair />
        </div>
      </aside>

      {/* ================= Topo (mobile) ================= */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink-900/90 px-4 py-2.5 backdrop-blur-md md:hidden">
        <Logo compacto />
        <BotaoSair compacto />
      </header>

      {/* ================= Barra inferior (mobile) ================= */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-900/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="grid grid-cols-4">
          {LINKS.map(({ href, label, Icone, exato }) => {
            const on = ativo(pathname, href, exato);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-medium transition-colors ${
                  on ? "text-brand-soft" : "text-slate-500"
                }`}
              >
                {/* traço no topo: marca a aba sem depender só da cor */}
                <span
                  className={`absolute top-0 h-[2.5px] w-8 rounded-b-full bg-brand transition-opacity ${
                    on ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="relative">
                  <Icone className="h-[21px] w-[21px]" />
                  {href === "/hoje" && pendentes > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-brand px-1 text-center text-[9px] font-bold leading-4 text-ink-950">
                      {pendentes > 9 ? "9+" : pendentes}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
