"use client";

import Link from "next/link";
import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { sair } from "@/app/actions/auth";
import {
  IconFolder,
  IconLogout,
  IconMessage,
  IconRelatorio,
  IconSino,
} from "./ui/icons";

const LINKS = [
  { href: "/hoje", label: "Hoje", Icone: IconSino, exato: false },
  { href: "/", label: "Painel", Icone: IconRelatorio, exato: true },
  { href: "/projetos", label: "Projetos", Icone: IconFolder, exato: false },
  { href: "/templates", label: "Templates", Icone: IconMessage, exato: false },
];

function ativo(pathname: string, href: string, exato: boolean) {
  return exato ? pathname === href : pathname.startsWith(href);
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-base">
        🎯
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-white">
        Lead Hunter
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
          : "btn-sub w-full justify-start"
      }
      aria-label="Sair"
      title="Sair"
    >
      <IconLogout className="h-4 w-4" />
      {!compacto && <span>{pendente ? "Saindo..." : "Sair"}</span>}
    </button>
  );
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-950">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function Nav({
  email,
  pendentes = 0,
}: {
  email: string | null;
  pendentes?: number;
}) {
  const pathname = usePathname() ?? "/";

  return (
    <>
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-ink-900 px-4 py-5 md:flex">
        <Logo />

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {LINKS.map(({ href, label, Icone, exato }) => {
            const on = ativo(pathname, href, exato);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  on
                    ? "bg-brand-dim text-brand-soft"
                    : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                }`}
              >
                <Icone className="h-4 w-4" />
                {label}
                {href === "/hoje" && <Badge n={pendentes} />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line pt-3">
          {email && (
            <p className="mb-2 truncate px-3 text-xs text-slate-500" title={email}>
              {email}
            </p>
          )}
          <BotaoSair />
        </div>
      </aside>

      {/* ---------- Topo (mobile) ---------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink-900/95 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <BotaoSair compacto />
      </header>

      {/* ---------- Barra inferior (mobile) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {LINKS.map(({ href, label, Icone, exato }) => {
          const on = ativo(pathname, href, exato);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                on ? "text-brand-soft" : "text-slate-500"
              }`}
            >
              <Icone className="h-5 w-5" />
              {href === "/hoje" && pendentes > 0 && (
                <span className="absolute right-[22%] top-1.5 min-w-[16px] rounded-full bg-brand px-1 text-[9px] font-semibold leading-4 text-ink-950">
                  {pendentes > 9 ? "9+" : pendentes}
                </span>
              )}
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
