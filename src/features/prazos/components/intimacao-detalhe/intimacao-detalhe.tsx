"use client";

import { Menu } from "@base-ui/react/menu";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { AnalisarLoading } from "@/features/intimacoes/components/shared/analisar-card";
import {
  Avatar,
  initials,
} from "@/features/intimacoes/components/shared/avatar";
import { useAprovarProvidencia } from "@/features/intimacoes/hooks/use-intimacoes";
import type { IntimacaoProvidencia } from "@/features/intimacoes/types";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { useCriarPecaDaIntimacao } from "@/features/pecas-v2/hooks/use-criar-peca";
import { sanitizeContentHtml } from "@/lib/html/sanitize-content";
import { cn } from "@/lib/utils";

import { useIntimacaoDetalhe } from "../../hooks/use-intimacao-detalhe";

const POPUP_CLASS =
  "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-72 min-w-48 origin-(--transform-origin) overflow-y-auto rounded-lg p-1 shadow-md ring-1 duration-100 outline-none";

const ITEM_CLASS =
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-[13px] outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50";

// Detalhe da intimação (unidade de trabalho), ligado ao backend real via
// useIntimacaoDetalhe. Faixa de identidade + stepper de ciclo de vida; 2 colunas:
// providências geradas por IA (sob demanda) à esquerda, teor + trilha à direita;
// rodapé de ações (resolver/ignorar/reabrir + responsável).
export function IntimacaoDetalhe({ id }: { id: string }) {
  const det = useIntimacaoDetalhe(id);
  const peca = useCriarPecaDaIntimacao();
  const m = det.model;

  if (det.isPending) {
    return (
      <div className="text-fg3 flex flex-1 items-center justify-center text-[13px]">
        Carregando intimação…
      </div>
    );
  }

  if (det.isError || !m) {
    return (
      <div
        className="text-fg3 flex flex-1 items-center justify-center text-[13px]"
        role="alert"
      >
        Não foi possível carregar esta intimação.
      </div>
    );
  }

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] px-8 pt-4 pb-10">
          <div className="mb-3.5 flex items-center gap-2">
            <Link
              href="/intimacoes"
              className="navi text-fg2 hover:bg-hover inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px]"
            >
              <ChevronLeft className="size-3.5" strokeWidth={2} />
              Intimações
            </Link>
            <span className="text-fg3">·</span>
            <Link
              href={`/processos/${encodeURIComponent(m.courtRecordId)}`}
              className="navi text-primary hover:bg-hover inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px]"
            >
              <FileText className="size-3.5" strokeWidth={1.8} />
              {m.cnj}
            </Link>
          </div>

          {/* faixa de identidade */}
          <div className="border-line bg-panel overflow-hidden rounded-[14px] border">
            <div className="flex items-start gap-6 px-[22px] py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {m.urgencia ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-[9px] py-[3px] text-[11.5px] font-medium"
                      style={{
                        background: m.urgencia.fundo,
                        color: m.urgencia.cor,
                      }}
                    >
                      {m.urgencia.label}
                    </span>
                  ) : null}
                  {/* 💀 Divergente + selo — dimensões do motor de prazos (memória
                      de cálculo). Placeholders estáticos até o motor existir. */}
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-[9px] py-[3px] text-[11.5px] font-medium"
                    style={{
                      background:
                        "color-mix(in oklch, var(--gold) 12%, transparent)",
                      color: "var(--gold)",
                    }}
                    title="Divergência declarado × calculado — em reformulação"
                  >
                    Divergente
                  </span>
                  <span
                    className="border-line text-fg3 inline-flex items-center gap-1.5 rounded-md border border-dashed px-[9px] py-[3px] text-[11px] font-medium"
                    title="Selo de confiança — em reformulação"
                  >
                    selo · a apurar
                  </span>
                  <span className="text-fg3 text-[11.5px]">{m.orgao}</span>
                </div>
                <h1 className="font-display mt-2.5 text-[27px] leading-[1.1] tracking-[-0.01em]">
                  {m.titulo}
                </h1>
                <p className="text-fg3 mt-2 text-[12px]">
                  publicado em {m.publicadoEm}
                </p>
              </div>
              <div className="border-line2 flex shrink-0 items-baseline gap-2.5 border-l pl-[22px]">
                <span
                  className="text-[40px] leading-none font-semibold tabular-nums"
                  style={{ color: m.prazoCor }}
                >
                  {m.prazoNum}
                </span>
                <span className="text-fg3 text-[12px] leading-[1.5]">
                  {m.prazoFrase}
                  {m.fatalData ? (
                    <>
                      <br />
                      fatal{" "}
                      <strong className="text-foreground font-medium">
                        {m.fatalData}
                      </strong>
                    </>
                  ) : null}
                </span>
              </div>
            </div>
            {/* stepper do ciclo de trabalho (recebida → protocolado) */}
            <div className="border-line2 bg-bg flex items-center border-t px-[22px] py-3.5">
              {m.stepper.map((s) => {
                const cor =
                  s.estado === "todo" ? "var(--fg3)" : "var(--foreground)";
                return (
                  <div
                    key={s.key}
                    className="flex items-center"
                    style={{ flex: s.flex }}
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <StepMarcador estado={s.estado} />
                      <span
                        className="text-[10.5px] leading-[1.2]"
                        style={{
                          color: cor,
                          fontWeight: s.estado === "current" ? 500 : 400,
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {s.temLinha ? (
                      <span
                        className="mx-2 h-0.5 flex-1"
                        style={{
                          background: s.linhaFeita
                            ? "var(--primary)"
                            : "var(--line)",
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2 colunas */}
          <div className="mt-5 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start gap-5">
            {/* PRIMÁRIA: providências (sob demanda) */}
            <div className="border-line bg-panel overflow-hidden rounded-xl border">
              <div className="border-line2 flex items-center gap-2 border-b px-4 pt-3.5 pb-3">
                <Sparkles
                  className="text-primary size-[15px]"
                  strokeWidth={1.8}
                />
                <span className="text-[13px] font-semibold">Providências</span>
                {m.analisada && !m.degradado ? (
                  <>
                    <span className="text-fg3 text-[11.5px]">
                      geradas pela IA · revise antes de executar
                    </span>
                    <span className="text-fg3 ml-auto font-mono text-[11px]">
                      {m.nProvidencias}
                    </span>
                  </>
                ) : null}
              </div>

              {det.analisando ? <AnalisarLoading /> : null}

              {!det.analisando && !m.analisada ? (
                <div className="px-[22px] py-[26px] text-center">
                  <div className="bg-selected mx-auto mb-3 grid size-10 place-items-center rounded-[10px]">
                    <Sparkles
                      className="text-primary size-5"
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="font-display mb-1.5 text-[16px]">
                    Gerar providências com IA
                  </div>
                  <p className="text-fg3 mx-auto mb-4 max-w-[330px] text-[12px] leading-[1.55]">
                    A IA lê o teor, classifica o ato, deriva o prazo e sugere as
                    providências. A geração é sob demanda para controlar custo.
                  </p>
                  {det.analiseErro ? (
                    <p
                      role="alert"
                      className="text-destructive mb-3 text-[12px]"
                    >
                      Não foi possível gerar a análise. Tente novamente.
                    </p>
                  ) : null}
                  <button
                    onClick={det.onAnalisar}
                    className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-medium"
                  >
                    <Sparkles className="size-[15px]" strokeWidth={1.8} />
                    Gerar providências
                  </button>
                  <div className="text-fg3 mt-2.5 text-[10.5px]">
                    Consome 1 crédito de análise · ~15s
                  </div>
                </div>
              ) : null}

              {!det.analisando && m.analisada ? (
                <>
                  {m.degradado ? (
                    <p
                      role="alert"
                      className="text-fg3 px-4 py-6 text-[12.5px] leading-[1.6]"
                    >
                      Análise indisponível no momento. Tente gerar novamente.
                    </p>
                  ) : m.providencias.length === 0 ? (
                    <p className="text-fg3 px-4 py-6 text-[12.5px] leading-[1.6]">
                      Nenhuma providência sugerida para esta intimação.
                    </p>
                  ) : (
                    <ProvidenciasLista
                      intimacaoId={m.id}
                      providencias={m.providencias}
                      ato={m.ato}
                    />
                  )}
                  {/* rodapé da peça (minuta): status vem do work_stage; abre o editor */}
                  <div className="border-line2 bg-bg flex items-center gap-3 border-t px-4 py-3">
                    <FileText
                      className="text-fg3 size-[17px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium">
                        Minuta — {m.titulo}
                      </span>
                      <span className="text-fg3 block text-[11px]">
                        {m.pecaLabel}
                      </span>
                    </span>
                    <button
                      onClick={() => peca.abrirConstrucao(id)}
                      className="border-line bg-panel text-foreground hover:bg-hover shrink-0 rounded-md border px-3 py-1.5 text-[12px] font-medium"
                    >
                      {m.pecaExiste ? "Abrir editor" : "Gerar peça"}
                    </button>
                  </div>
                  <div className="border-line2 text-fg3 flex items-center justify-between gap-3 border-t px-4 py-3 text-[11.5px]">
                    <span>Gerado em {m.analisadaEm}</span>
                    <button
                      onClick={det.onAnalisar}
                      className="navi text-fg2 hover:bg-hover rounded-md px-2 py-1 text-[11.5px] font-medium"
                    >
                      Gerar novamente
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {/* SECUNDÁRIA: como a IA leu + teor + trilha */}
            <div className="flex flex-col gap-3.5">
              {m.analisada && !m.degradado && m.resumo ? (
                <div
                  className="rounded-xl border p-[14px_16px]"
                  style={{
                    borderColor:
                      "color-mix(in oklch, var(--primary) 26%, transparent)",
                    background:
                      "color-mix(in oklch, var(--primary) 5%, transparent)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-[11px] font-semibold tracking-[0.03em] uppercase">
                      Análise
                    </span>
                  </div>
                  <p className="text-fg2 mt-2 text-[12.5px] leading-[1.55]">
                    {m.resumo}
                  </p>
                </div>
              ) : null}

              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                <div className="border-line2 border-b px-3.5 py-2.5">
                  <span className="text-fg2 text-[11px] font-semibold tracking-[0.03em] uppercase">
                    Teor da intimação
                  </span>
                </div>
                {m.teor ? (
                  // O teor vem em HTML (DJEN). sanitizeContentHtml remove
                  // scripts/handlers/URIs perigosas antes de renderizar — sem
                  // isso apareciam as tags cruas (<html><head>…).
                  <div
                    className="prose-intimacao text-fg2 px-3.5 py-3 text-[12.5px] leading-[1.6]"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeContentHtml(m.teor),
                    }}
                  />
                ) : (
                  <p className="text-fg3 px-3.5 py-3 text-[12.5px] leading-[1.6]">
                    Teor integral indisponível — publicação capturada do DJEN.
                  </p>
                )}
              </div>

              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                <div className="border-line2 border-b px-3.5 py-2.5">
                  <span className="text-fg2 text-[11px] font-semibold tracking-[0.03em] uppercase">
                    Trilha
                  </span>
                </div>
                <div className="px-3.5 pt-1 pb-2.5">
                  {m.trilha.length === 0 ? (
                    <p className="text-fg3 py-2 text-[11.5px]">
                      Sem eventos ainda.
                    </p>
                  ) : (
                    m.trilha.map((t, i) => (
                      <div
                        key={i}
                        className="border-line2 grid grid-cols-[58px_1fr] gap-2.5 border-t py-[7px] first:border-t-0"
                      >
                        <span className="text-fg3 font-mono text-[10.5px]">
                          {t.data}
                        </span>
                        <span className="text-fg2 text-[11.5px]">
                          {t.label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* rodapé de ações */}
      <div className="border-line bg-panel flex shrink-0 items-center gap-2 border-t px-8 py-3">
        <div className="mx-auto flex w-full max-w-[1080px] items-center gap-2">
          {/* 💀 Confirmar prazo / Ajustar — ações do motor de prazos (em
              reformulação). Placeholders desabilitados até o motor existir. */}
          <button
            type="button"
            disabled
            title="Em reformulação"
            className="bg-primary text-primary-foreground cursor-not-allowed rounded-lg px-4 py-2.5 text-[13px] font-medium opacity-50"
          >
            Confirmar prazo
          </button>
          <button
            type="button"
            disabled
            title="Em reformulação"
            className="border-line bg-panel text-foreground cursor-not-allowed rounded-lg border px-3.5 py-2.5 text-[13px] opacity-50"
          >
            Ajustar
          </button>

          <ResponsavelMenu
            value={m.responsavelId}
            nome={m.responsavelNome}
            membros={det.membros}
            emVoo={det.assignEmVoo}
            onAssign={det.onAssign}
          />

          <button
            onClick={() => peca.abrirConstrucao(id)}
            className="border-line bg-panel text-foreground hover:bg-hover ml-auto inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium"
          >
            <Sparkles className="text-primary size-4" strokeWidth={1.8} />
            Gerar peça com IA
          </button>
        </div>
      </div>
    </div>
  );
}

/** Lista de providências no layout do design: banner de herança + "Criar todas"
 *  + linhas (Criar tarefa / Tarefa criada). Chips (tipo/fluxo/selo) ficam de fora
 *  por ora — dependem de dado do BE ainda inexistente. */
function ProvidenciasLista({
  intimacaoId,
  providencias,
  ato,
}: {
  intimacaoId: string;
  providencias: { p: IntimacaoProvidencia; idx: number }[];
  ato: string;
}) {
  const aprovar = useAprovarProvidencia(intimacaoId);
  const pendentes = providencias.filter(({ p }) => p.status === "SUGGESTED");

  const criarTodas = async () => {
    for (const { p, idx } of pendentes) {
      try {
        await aprovar.mutateAsync({ idx, providencia: p });
      } catch {
        toast.error("Não foi possível criar todas as tarefas.");
        return;
      }
    }
    toast.success("Tarefas criadas e atribuídas.");
  };

  return (
    <>
      {/* derivação: Ato (do BE) → Prazo (💀 motor) → Providências */}
      <div className="border-line2 flex flex-wrap items-center gap-1.5 border-b px-4 py-3">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-medium"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          1 · Ato: {ato || "—"}
        </span>
        <ChevronRight className="text-fg3 size-3" strokeWidth={2.2} />
        <span
          className="bg-hover text-fg3 inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-medium"
          title="Prazo — em reformulação (motor de prazos)"
        >
          2 · Prazo
        </span>
        <ChevronRight className="text-fg3 size-3" strokeWidth={2.2} />
        <span className="bg-hover text-fg2 inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-medium">
          3 · Providências
        </span>
      </div>

      {/* banner de herança + criar todas */}
      <div className="border-line2 bg-bg flex items-center gap-3 border-b px-4 py-2.5">
        <span className="text-fg3 min-w-0 flex-1 text-[11px] leading-[1.45]">
          Cada providência vira uma{" "}
          <strong className="text-foreground font-medium">tarefa</strong>,
          vinculada ao prazo desta intimação — nasce em triagem.
        </span>
        {pendentes.length > 0 ? (
          <button
            type="button"
            onClick={criarTodas}
            disabled={aprovar.isPending}
            className="bg-primary text-primary-foreground shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium disabled:opacity-60"
          >
            Criar todas
          </button>
        ) : null}
      </div>

      {providencias.map(({ p, idx }) => (
        <ProvidenciaLinha
          key={`${p.title}-${idx}`}
          intimacaoId={intimacaoId}
          providencia={p}
          idx={idx}
        />
      ))}
    </>
  );
}

/** Uma linha de providência no design: título + descrição + ação Criar tarefa
 *  (SUGGESTED → aprova = cria a tarefa real) ou selo "Tarefa criada" (APPROVED). */
function ProvidenciaLinha({
  intimacaoId,
  providencia: p,
  idx,
}: {
  intimacaoId: string;
  providencia: IntimacaoProvidencia;
  idx: number;
}) {
  const aprovar = useAprovarProvidencia(intimacaoId);
  const criada = p.status === "APPROVED";

  const criar = () =>
    aprovar.mutate(
      { idx, providencia: p },
      {
        onSuccess: () => toast.success("Tarefa criada e atribuída."),
        onError: () => toast.error("Não foi possível criar a tarefa."),
      },
    );

  return (
    <div className="border-line2 grid grid-cols-[1fr_auto] items-start gap-3 border-b px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{p.title}</div>
        {p.description ? (
          <div className="text-fg3 mt-0.5 text-[11.5px] leading-[1.45]">
            {p.description}
          </div>
        ) : null}
        <ProvidenciaChips kind={p.kind} />
      </div>
      {criada ? (
        <span
          className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium"
          style={{ color: "var(--green)" }}
        >
          <Check className="size-3.5" strokeWidth={2.2} />
          Tarefa criada
        </span>
      ) : (
        <button
          type="button"
          onClick={criar}
          disabled={aprovar.isPending}
          className="border-line bg-panel text-foreground hover:bg-hover inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium disabled:opacity-60"
        >
          <Plus className="size-3.5" strokeWidth={2.2} />
          Criar tarefa
        </button>
      )}
    </div>
  );
}

/** Chips de uma providência: tipo (Peça/Ciência, do BE), "fluxo curto" (derivado
 *  de Ciência) e o selo de confiança ("A apurar" — 💀 placeholder do motor de
 *  prazos). Tipo desconhecido ("") não renderiza o chip de tipo. */
function ProvidenciaChips({ kind }: { kind: string }) {
  const ehCiencia = kind === "CIENCIA";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {kind === "PECA" ? (
        <span
          className="inline-flex items-center rounded-full px-2 py-[2px] text-[9.5px] font-medium"
          style={{
            background: "color-mix(in oklch, var(--primary) 12%, transparent)",
            color: "var(--primary)",
          }}
        >
          Peça
        </span>
      ) : null}
      {ehCiencia ? (
        <span className="bg-hover text-fg2 inline-flex items-center rounded-full px-2 py-[2px] text-[9.5px] font-medium">
          Ciência
        </span>
      ) : null}
      {ehCiencia ? (
        <span className="bg-hover text-fg3 inline-flex items-center rounded-full px-2 py-[2px] text-[9.5px] font-medium">
          fluxo curto
        </span>
      ) : null}
      {/* 💀 selo de confiança — dimensão do motor de prazos. Placeholder estático. */}
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[9.5px] font-medium"
        style={{ color: "var(--gold)" }}
      >
        <span
          className="inline-block size-[5px] rounded-full"
          style={{ background: "var(--gold)" }}
        />
        A apurar
      </span>
    </div>
  );
}

/** Marcador de um passo do stepper: concluído (círculo cheio + check), atual
 *  (anel vazado destacado) ou pendente (círculo tracejado). */
function StepMarcador({ estado }: { estado: "done" | "current" | "todo" }) {
  if (estado === "done") {
    return (
      <span
        className="grid size-[15px] place-items-center rounded-full"
        style={{ background: "var(--primary)" }}
      >
        <Check
          className="size-[9px]"
          strokeWidth={3}
          style={{ color: "var(--primary-foreground)" }}
        />
      </span>
    );
  }
  return (
    <span
      className="size-[15px] rounded-full"
      style={{
        border:
          estado === "current"
            ? "2px solid var(--primary)"
            : "1.5px dashed var(--line)",
        background: "transparent",
      }}
    />
  );
}

/** Menu de atribuição do responsável (papel único 0057) — ligado a onAssign. */
function ResponsavelMenu({
  value,
  nome,
  membros,
  emVoo,
  onAssign,
}: {
  value: string | null;
  nome: string;
  membros: { id: string; name: string; email: string }[];
  emVoo: boolean;
  onAssign: (assigneeUserId: string | null) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={emVoo}
        title={nome || "Atribuir responsável"}
        className="navi border-line bg-panel text-foreground hover:bg-hover ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] disabled:opacity-60"
      >
        {nome ? (
          <Avatar size="sm" variant="outline" initials={initials(nome)} />
        ) : (
          <span
            aria-hidden
            className="border-muted-foreground/40 size-5 shrink-0 rounded-full border border-dashed"
          />
        )}
        <span className="max-w-[140px] truncate">
          {nome || "Atribuir responsável"}
        </span>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="end" sideOffset={6} className="z-50">
          <Menu.Popup className={POPUP_CLASS}>
            <Menu.RadioGroup
              value={value ?? ""}
              onValueChange={(v) =>
                onAssign(typeof v === "string" && v ? v : null)
              }
            >
              <Menu.RadioItem value="" className={cn(ITEM_CLASS, "gap-2")}>
                <span className="border-muted-foreground/40 size-6 shrink-0 rounded-full border border-dashed" />
                <span className="text-muted-foreground flex-1 truncate">
                  Ninguém
                </span>
                <Menu.RadioItemIndicator className="ml-auto">
                  <Check className="size-4" />
                </Menu.RadioItemIndicator>
              </Menu.RadioItem>
              {membros.map((mem) => {
                const label = nomeExibicao(mem.name, mem.email);
                return (
                  <Menu.RadioItem
                    key={mem.id}
                    value={mem.id}
                    className={cn(ITEM_CLASS, "gap-2")}
                  >
                    <Avatar size="sm" initials={initials(label)} />
                    <span className="flex-1 truncate">{label}</span>
                    <Menu.RadioItemIndicator className="ml-auto">
                      <Check className="size-4" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
