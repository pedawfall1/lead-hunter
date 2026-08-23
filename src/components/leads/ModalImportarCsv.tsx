"use client";

import { useMemo, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import { CSV_EXEMPLO, parseCsv } from "@/lib/csv";
import { importarLeads } from "@/app/actions/leads";
import { IconCheck, IconUpload } from "@/components/ui/icons";
import type { Criterio } from "@/lib/types";

export default function ModalImportarCsv({
  projetoId,
  criterios,
  aoFechar,
  aoImportar,
}: {
  projetoId: string;
  criterios: Criterio[];
  aoFechar: () => void;
  aoImportar: (quantidade: number) => void;
}) {
  const [texto, setTexto] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const resultado = useMemo(
    () => (texto.trim() ? parseCsv(texto, criterios) : null),
    [texto, criterios]
  );
  const linhas = resultado?.linhas ?? [];

  async function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    try {
      const conteudo = await arquivo.text();
      setTexto(conteudo);
      setNomeArquivo(arquivo.name);
    } catch {
      setErro("Não consegui ler o arquivo.");
    }
  }

  function importar() {
    if (!linhas.length) return;
    setErro(null);
    iniciar(async () => {
      const r = await importarLeads(projetoId, linhas);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aoImportar(r.data?.inseridos ?? linhas.length);
      aoFechar();
    });
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo="Importar CSV"
      subtitulo="Colunas: nome, telefone, endereco, tem_site, instagram"
      largura="lg"
      rodape={
        <>
          <button className="btn-ghost" onClick={aoFechar} disabled={pendente}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={importar}
            disabled={pendente || !linhas.length}
          >
            {pendente
              ? "Importando..."
              : `Importar ${linhas.length || ""} ${
                  linhas.length === 1 ? "lead" : "leads"
                }`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="btn-ghost cursor-pointer">
            <IconUpload className="h-4 w-4" />
            Escolher arquivo .csv
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={lerArquivo}
            />
          </label>
          {nomeArquivo && (
            <span className="truncate text-xs text-slate-400">{nomeArquivo}</span>
          )}
        </div>

        <div>
          <label className="label" htmlFor="csv">
            ...ou cole o conteúdo aqui
          </label>
          <textarea
            id="csv"
            rows={6}
            className="input resize-y font-mono text-xs"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setNomeArquivo(null);
            }}
            placeholder={CSV_EXEMPLO}
          />
        </div>

        {resultado && (
          <div className="space-y-3">
            {resultado.erros.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {resultado.erros.slice(0, 5).map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
                {resultado.erros.length > 5 && (
                  <p>+ {resultado.erros.length - 5} avisos</p>
                )}
              </div>
            )}

            {resultado.colunasIgnoradas.length > 0 && (
              <p className="text-xs text-slate-500">
                Colunas ignoradas: {resultado.colunasIgnoradas.join(", ")}
              </p>
            )}

            {linhas.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                  <IconCheck className="h-4 w-4 text-st-fechou" />
                  {linhas.length} {linhas.length === 1 ? "lead" : "leads"} prontos
                  <span className="text-slate-500">
                    ({linhas.filter((l) => Object.keys(l.sinais).length).length} já qualificados)
                  </span>
                </p>

                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[34rem] text-left text-xs">
                    <thead className="bg-ink-900 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Nome</th>
                        <th className="px-3 py-2 font-medium">Telefone</th>
                        <th className="px-3 py-2 font-medium">Endereço</th>
                        <th className="px-3 py-2 font-medium">Sinais</th>
                        <th className="px-3 py-2 font-medium">Instagram</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {linhas.slice(0, 8).map((l, i) => (
                        <tr key={i} className="text-slate-300">
                          <td className="max-w-[10rem] truncate px-3 py-2">
                            {l.nome}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {l.telefone ?? "—"}
                          </td>
                          <td className="max-w-[12rem] truncate px-3 py-2">
                            {l.endereco ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {Object.keys(l.sinais).length ? (
                              <span className="text-brand-soft">
                                {Object.keys(l.sinais).length}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="max-w-[8rem] truncate px-3 py-2">
                            {l.instagram ? `@${l.instagram}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {linhas.length > 8 && (
                  <p className="mt-2 text-xs text-slate-500">
                    ...e mais {linhas.length - 8}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {erro && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {erro}
          </p>
        )}

        <details className="rounded-lg border border-line bg-ink-900 px-3 py-2">
          <summary className="cursor-pointer text-xs text-slate-400">
            Formato esperado
          </summary>
          <pre className="mt-2 overflow-x-auto text-[11px] leading-relaxed text-slate-400">
            {CSV_EXEMPLO}
          </pre>
          <p className="mt-1 text-[11px] text-slate-500">
            Aceita separador vírgula ou ponto e vírgula. Em tem_site valem
            sim/não, true/false, 1/0 — ou a própria URL do site; quando for
            &ldquo;não&rdquo;, o lead já entra com o sinal <em>Não tem site</em>.
            Colunas com o nome de um critério do projeto viram sinais também.
            Todos os leads entram como &ldquo;Novo&rdquo;.
          </p>
        </details>
      </div>
    </Modal>
  );
}
