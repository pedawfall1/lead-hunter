"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import {
  IconCheck,
  IconCopy,
  IconInstagram,
  IconTrash,
  IconWhatsapp,
} from "@/components/ui/icons";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { acharServico, motivoDoLead, rotulosDosSinais } from "@/lib/servicos";
import { rotuloPrazo, somarDias } from "@/lib/agenda";
import {
  dataCurta,
  extrairBairro,
  formatarTelefone,
  linkInstagram,
  linkWhatsapp,
  nomeCurto,
  preencherTemplate,
  sortearVariacao,
  contarVariacoes,
  telefoneWhatsapp,
} from "@/lib/format";
import {
  adiarLead,
  atualizarLead,
  excluirLead,
  registrarDisparo,
} from "@/app/actions/leads";
import { dispararPeloN8n } from "@/app/actions/disparo";
import { listarDemos } from "@/app/actions/site";
import type { Demo, Interacao, Lead, Projeto, Template } from "@/lib/types";
import AbaDemo from "./AbaDemo";
import AbaInstagram from "./AbaInstagram";
import { EditorSinais, TagsSinais } from "./Sinais";
import Timeline from "./Timeline";

type Aba = "detalhes" | "historico" | "whatsapp" | "instagram" | "demo";

type Props = {
  lead: Lead;
  projeto: Projeto;
  templates: Template[];
  interacoes: Interacao[];
  /** o n8n está configurado no servidor? habilita o disparo automático */
  n8nAtivo?: boolean;
  /** OPENAI_API_KEY existe no servidor? liga a geração de demo */
  openaiAtivo?: boolean;
  /** APIFY_TOKEN existe no servidor? liga a análise de Instagram */
  buscaAtiva?: boolean;
  abaInicial: Aba;
  aoFechar: () => void;
  aoAtualizar: (lead: Lead) => void;
  aoExcluir: (id: string) => void;
  aoMudarInteracoes: (leadId: string, lista: Interacao[]) => void;
};

const ATALHOS: [string, number][] = [
  ["amanhã", 1],
  ["+3 dias", 3],
  ["+1 semana", 7],
  ["+15 dias", 15],
];

export default function ModalLead({
  lead,
  projeto,
  templates,
  interacoes,
  n8nAtivo,
  openaiAtivo,
  buscaAtiva,
  abaInicial,
  aoFechar,
  aoAtualizar,
  aoExcluir,
  aoMudarInteracoes,
}: Props) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  // As demos moram aqui, e nao dentro da aba Demo, porque a aba WhatsApp
  // tambem precisa delas: e de onde sai a variavel {demo} da mensagem.
  const [demos, setDemos] = useState<Demo[]>([]);

  useEffect(() => {
    let vivo = true;
    listarDemos(lead.id).then((r) => {
      if (vivo && r.ok) setDemos(r.data ?? []);
    });
    return () => {
      vivo = false;
    };
  }, [lead.id]);

  // A demo mais recente que esta no ar. Despublicada nao entra: o link
  // levaria o cliente a uma pagina que nao existe mais.
  const linkDemo = useMemo(() => {
    const d = demos.find((x) => x.publicado);
    if (!d) return null;
    const origem = typeof window === "undefined" ? "" : window.location.origin;
    return `${origem}/demo/${d.slug}`;
  }, [demos]);

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);
  // muda para sortear outra variacao do mesmo template
  const [semente, setSemente] = useState(0);

  const bairro = useMemo(
    () => extrairBairro(lead.endereco, projeto.regiao),
    [lead.endereco, projeto.regiao]
  );
  const servicoLabel = acharServico(projeto.servico)?.label ?? "";
  const motivo = useMemo(
    () => motivoDoLead(lead.sinais, projeto.criterios),
    [lead.sinais, projeto.criterios]
  );
  const sinaisAtivos = rotulosDosSinais(lead.sinais, projeto.criterios);
  const tentativas = interacoes.filter((i) => i.tipo === "whatsapp").length;

  const templateAtual = templates.find((t) => t.id === templateId) ?? null;
  const variacoes = templateAtual ? contarVariacoes(templateAtual.texto) : 1;

  useEffect(() => {
    if (!templateAtual) {
      setMensagem("");
      return;
    }
    setMensagem(
      preencherTemplate(sortearVariacao(templateAtual.texto), {
        nome: nomeCurto(lead.nome),
        bairro,
        servico: servicoLabel.toLowerCase(),
        motivo,
        demo: linkDemo,
      })
    );
    // `semente` entra de proposito: mexer nela sorteia outra variacao
  }, [templateAtual, lead.nome, bairro, servicoLabel, motivo, linkDemo, semente]);

  const numero = telefoneWhatsapp(lead.telefone);
  const link = numero ? linkWhatsapp(lead.telefone, mensagem) : "";

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    iniciar(async () => {
      const r = await atualizarLead(lead.id, lead.projeto_id, fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.data) aoAtualizar(r.data);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1800);
    });
  }

  function remover() {
    if (!window.confirm(`Excluir o lead "${lead.nome}"?`)) return;
    iniciar(async () => {
      const r = await excluirLead(lead.id, lead.projeto_id);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aoExcluir(lead.id);
      aoFechar();
    });
  }

  function reagendar(dias: number | null) {
    iniciar(async () => {
      const r = await adiarLead(
        lead.id,
        lead.projeto_id,
        dias === null ? null : somarDias(dias)
      );
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.data) aoAtualizar(r.data);
    });
  }

  function aoAbrirWhatsapp() {
    const texto = mensagem;
    const statusAtual = lead.status;
    iniciar(async () => {
      const r = await registrarDisparo(lead.id, lead.projeto_id, {
        texto,
        templateId: templateId || null,
        statusAtual,
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.data) aoAtualizar(r.data);
      aoMudarInteracoes(lead.id, [
        {
          id: `tmp-${Date.now()}`,
          lead_id: lead.id,
          tipo: "whatsapp",
          direcao: "saida",
          texto,
          template_id: templateId || null,
          externo_id: null,
          entregue_em: null,
          lido_em: null,
          erro: null,
          criado_em: new Date().toISOString(),
        },
        ...interacoes,
      ]);
    });
  }

  function dispararAutomatico() {
    setErro(null);
    const texto = mensagem;
    iniciar(async () => {
      const r = await dispararPeloN8n(
        {
          id: lead.id,
          projeto_id: lead.projeto_id,
          nome: lead.nome,
          telefone: lead.telefone,
          status: lead.status,
        },
        {
          mensagem: texto,
          templateId: templateId || null,
          projeto: projeto.nome,
          servico: servicoLabel || null,
        }
      );
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.data) aoAtualizar(r.data);
      aoMudarInteracoes(lead.id, [
        {
          id: `tmp-${Date.now()}`,
          lead_id: lead.id,
          tipo: "whatsapp",
          direcao: "saida",
          texto,
          template_id: templateId || null,
          externo_id: null,
          entregue_em: null,
          lido_em: null,
          erro: null,
          criado_em: new Date().toISOString(),
        },
        ...interacoes,
      ]);
      setAba("historico");
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      setErro("Não consegui copiar. Selecione o texto manualmente.");
    }
  }

  const meta = STATUS_META[lead.status];

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={lead.nome}
      subtitulo={`${projeto.nome} · atualizado em ${dataCurta(lead.atualizado_em)}`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`chip ${meta.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        {lead.proximo_contato && (
          <span className="chip border-line bg-ink-700 text-slate-300">
            retorno {rotuloPrazo(lead.proximo_contato)}
          </span>
        )}
        {tentativas > 0 && (
          <span className="chip border-line bg-ink-700 text-slate-400">
            {tentativas} {tentativas === 1 ? "toque" : "toques"}
          </span>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="chip border-line bg-ink-700 text-slate-300 hover:bg-ink-600"
          >
            ✉ {lead.email}
          </a>
        )}
        {lead.instagram && (
          <a
            href={linkInstagram(lead.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="chip border-line bg-ink-700 text-slate-300 hover:bg-ink-600"
          >
            <IconInstagram className="h-3.5 w-3.5" />@
            {lead.instagram.replace(/^@/, "")}
          </a>
        )}
      </div>

      {sinaisAtivos.length > 0 && (
        <div className="mb-4">
          <TagsSinais rotulos={sinaisAtivos} max={8} />
        </div>
      )}

      {/* Cinco abas não cabem lado a lado no celular. Rolagem horizontal
          com `shrink-0` mantém cada rótulo inteiro em vez de espremer todos
          até o texto quebrar no meio. */}
      <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full gap-1 rounded-lg bg-ink-900 p-1">
          {(
            [
              ["detalhes", "Detalhes"],
              ["historico", `Histórico${interacoes.length ? ` (${interacoes.length})` : ""}`],
              ["whatsapp", "WhatsApp"],
              ["instagram", "Instagram"],
              ["demo", demos.length ? `Demo (${demos.length})` : "Demo"],
            ] as [Aba, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={`shrink-0 flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                aba === id
                  ? "bg-ink-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {erro}
        </p>
      )}

      {aba === "detalhes" && (
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label" htmlFor="nome">Nome</label>
            <input id="nome" name="nome" className="input" required defaultValue={lead.nome} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="telefone">Telefone</label>
              <input
                id="telefone"
                name="telefone"
                className="input"
                inputMode="tel"
                defaultValue={lead.telefone ?? ""}
                placeholder="(49) 99999-9999"
              />
            </div>
            <div>
              <label className="label" htmlFor="instagram">Instagram</label>
              <input
                id="instagram"
                name="instagram"
                className="input"
                defaultValue={lead.instagram ?? ""}
                placeholder="@perfil"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              defaultValue={lead.email ?? ""}
              placeholder="contato@empresa.com.br"
            />
          </div>

          <div>
            <label className="label" htmlFor="endereco">Endereço</label>
            <input
              id="endereco"
              name="endereco"
              className="input"
              defaultValue={lead.endereco ?? ""}
              placeholder="Rua Brasil, 120 - Centro"
            />
            {bairro && (
              <p className="mt-1 text-xs text-slate-500">
                {"{bairro}"} = <span className="text-brand-soft">{bairro}</span>
              </p>
            )}
          </div>

          <div>
            <span className="label">
              Sinais de qualificação
              {servicoLabel && (
                <span className="ml-1 font-normal normal-case tracking-normal text-slate-500">
                  · {servicoLabel}
                </span>
              )}
            </span>
            <EditorSinais criterios={projeto.criterios} valor={lead.sinais} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" name="status" className="input" defaultValue={lead.status}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="proximo_contato">Próximo contato</label>
              <input
                id="proximo_contato"
                name="proximo_contato"
                type="date"
                className="input"
                defaultValue={lead.proximo_contato ?? ""}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="nota">Nota fixa</label>
            <textarea
              id="nota"
              name="nota"
              rows={3}
              className="input resize-y"
              defaultValue={lead.nota ?? ""}
              placeholder="O que precisa lembrar sempre que abrir este lead."
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={remover} className="btn-danger" disabled={pendente}>
              <IconTrash className="h-4 w-4" />
              Excluir
            </button>

            <div className="flex items-center gap-2">
              {salvo && (
                <span className="flex items-center gap-1 text-xs text-st-fechou">
                  <IconCheck className="h-4 w-4" /> salvo
                </span>
              )}
              <button type="submit" className="btn-primary" disabled={pendente}>
                {pendente ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      )}

      {aba === "historico" && (
        <div className="space-y-4">
          <div>
            <span className="label">Reagendar retorno</span>
            <div className="flex flex-wrap gap-1.5">
              {ATALHOS.map(([label, dias]) => (
                <button
                  key={label}
                  type="button"
                  className="chip border-line bg-ink-700 text-slate-300 hover:bg-ink-600"
                  onClick={() => reagendar(dias)}
                  disabled={pendente}
                >
                  {label}
                </button>
              ))}
              {lead.proximo_contato && (
                <button
                  type="button"
                  className="chip border-line bg-ink-800 text-slate-500 hover:text-slate-300"
                  onClick={() => reagendar(null)}
                  disabled={pendente}
                >
                  limpar
                </button>
              )}
            </div>
          </div>

          <Timeline
            leadId={lead.id}
            projetoId={lead.projeto_id}
            interacoes={interacoes}
            aoMudar={(lista) => aoMudarInteracoes(lead.id, lista)}
          />
        </div>
      )}

      {aba === "whatsapp" && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <p className="rounded-lg border border-line bg-ink-900 px-3 py-4 text-sm text-slate-400">
              Você ainda não tem templates. Crie um em{" "}
              <span className="text-brand-soft">Templates</span> para montar a
              mensagem automaticamente.
            </p>
          ) : (
            <div>
              <label className="label" htmlFor="template">Template</label>
              <select
                id="template"
                className="input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* {demo} sem demo no ar sobra literal na mensagem. Melhor avisar
              aqui do que o lead receber um "{demo}" cru no WhatsApp. */}
          {templateAtual &&
            /\{\s*demo\s*\}/i.test(templateAtual.texto) &&
            !linkDemo && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                Esse template usa <code>{"{demo}"}</code>, mas este lead não tem
                demo publicada. Gere uma na aba <strong>Demo</strong> ou a
                variável vai sair crua na mensagem.
              </p>
            )}

          <div>
            <div className="mb-1.5 flex items-end justify-between gap-2">
              <span className="label mb-0">Mensagem</span>
              {variacoes > 1 && (
                <button
                  type="button"
                  onClick={() => setSemente((n) => n + 1)}
                  className="btn-sub mr-auto px-2 py-1 text-xs"
                  title={`${variacoes} variações possíveis`}
                >
                  🎲 sortear outra
                </button>
              )}
              <button
                type="button"
                onClick={copiar}
                className="btn-sub px-2 py-1 text-xs"
                disabled={!mensagem}
              >
                {copiado ? (
                  <><IconCheck className="h-3.5 w-3.5" /> copiado</>
                ) : (
                  <><IconCopy className="h-3.5 w-3.5" /> copiar</>
                )}
              </button>
            </div>
            <textarea
              rows={6}
              className="input resize-y"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva a mensagem ou escolha um template."
            />
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              <span>nome: <span className="text-slate-400">{nomeCurto(lead.nome)}</span></span>
              {bairro && <span>bairro: <span className="text-slate-400">{bairro}</span></span>}
              {servicoLabel && <span>serviço: <span className="text-slate-400">{servicoLabel.toLowerCase()}</span></span>}
              {motivo && <span>motivo: <span className="text-slate-400">{motivo}</span></span>}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-ink-900 p-3">
            <p className="text-xs leading-relaxed text-slate-400">
              Abre o WhatsApp com a mensagem pronta para{" "}
              <span className="tabular-nums text-slate-200">
                {formatarTelefone(lead.telefone) || "—"}
              </span>
              . O envio continua manual, sem risco de bloqueio do número. Ao abrir,
              o contato fica registrado no histórico e o próximo retorno é agendado.
            </p>
          </div>

          {numero ? (
            <div className="space-y-2">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={aoAbrirWhatsapp}
                className={`btn-wa w-full ${!mensagem ? "pointer-events-none opacity-45" : ""}`}
              >
                <IconWhatsapp className="h-4 w-4" />
                Abrir no WhatsApp
              </a>

              {n8nAtivo && (
                <>
                  <button
                    type="button"
                    onClick={dispararAutomatico}
                    disabled={pendente || !mensagem}
                    className="btn-ghost w-full"
                  >
                    {pendente ? "Enfileirando..." : "⚡ Disparar pelo n8n"}
                  </button>
                  <p className="text-center text-[11px] leading-relaxed text-slate-500">
                    Vai para a fila do n8n, que envia pela Evolution no ritmo
                    dele. Entrega, leitura e resposta voltam para o histórico.
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              Esse lead não tem um telefone válido. Adicione o número na aba Detalhes.
            </p>
          )}
        </div>
      )}
      {aba === "instagram" && (
        <AbaInstagram
          lead={lead}
          buscaAtiva={buscaAtiva}
          aoAtualizar={aoAtualizar}
        />
      )}

      {aba === "demo" && (
        <AbaDemo
          lead={lead}
          projeto={projeto}
          openaiAtivo={openaiAtivo}
          demos={demos}
          aoMudarDemos={setDemos}
        />
      )}
    </Modal>
  );
}
