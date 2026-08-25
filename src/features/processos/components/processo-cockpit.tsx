"use client";

import { ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Avatar } from "@/components/mock-ui/data-display";
import { Card, SectionTitle, Segmented } from "@/components/mock-ui/layout";
import { StatusBadge } from "@/components/mock-ui/status-badge";
import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { AndamentosTimeline } from "@/features/andamentos/components/andamentos-timeline";
import {
  PrazoCard,
  PrazoCardSkeleton,
} from "@/features/prazos/components/prazo-card";
import type { PrazoView } from "@/features/prazos/types";
import {
  corDaUrgencia,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { ApiError } from "@/lib/api/errors";
import { formatClaimValueBRL, formatDate, formatDateTime } from "@/lib/format";

import {
  useIntimacoesByProcesso,
  usePrazosByProcesso,
  useTasksByProcesso,
} from "../hooks/use-processo-tabs";
import {
  useAssignResponsavel,
  usePartes,
  useProcesso,
  useProcessoResumo,
} from "../hooks/use-processos";
import { calcularRisco } from "../lib/risco";
import type { ProcessoView } from "../types";

type Aba =
  "resumo" | "andamentos" | "intimacoes" | "prazos" | "tarefas" | "documentos";

// Mapa lifecycle → rótulo + tom do StatusBadge.
const LIFECYCLE_LABEL: Record<string, string> = {
  ACTIVE: "Em andamento",
  SUSPENDED: "Suspenso",
  ARCHIVED: "Arquivado",
  CLOSED: "Baixado",
};

export function ProcessoCockpit({ numero }: { numero: string }) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("resumo");

  const { data: p, isPending, error } = useProcesso(numero);

  // Trilha semântica no header do shell: "Processos › {número}" (design), em vez
  // do id cru. Referência estável (deps primitivas) pra não disparar o efeito à toa.
  const crumbs = useMemo(
    () => [
      { label: "Processos", href: "/processos" },
      { label: p?.cnj_number ?? "Processo" },
    ],
    [p?.cnj_number],
  );
  useSetBreadcrumb(crumbs);

  if (isPending) {
    return (
      <div className="p-8">
        <div className="bg-muted h-9 w-80 animate-pulse rounded" />
        <div className="bg-muted mt-4 h-4 w-56 animate-pulse rounded" />
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-muted h-28 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !p) {
    const isNotFound =
      error instanceof ApiError && error.kind === "ENTITY_NOT_FOUND";
    return (
      <div className="px-8 pt-10 text-center">
        <p role="alert" className="text-destructive text-sm">
          {isNotFound
            ? "Processo não encontrado."
            : "Erro ao carregar o processo. Tente novamente."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/processos")}
        >
          Voltar para Processos
        </Button>
      </div>
    );
  }

  return <CockpitContent processo={p} aba={aba} onAba={setAba} />;
}

// ── Conteúdo do cockpit (só renderiza com processo carregado) ─────────────────

function CockpitContent({
  processo: p,
  aba,
  onAba,
}: {
  processo: ProcessoView;
  aba: Aba;
  onAba: (a: Aba) => void;
}) {
  const prazosQuery = usePrazosByProcesso(p.id);
  const tarefasQuery = useTasksByProcesso(p.id);
  const intimacoesQuery = useIntimacoesByProcesso(p.id);

  // Prazos OPEN|PENDING para o badge da aba.
  const prazosAtivos = prazosQuery.prazos.filter(
    (pr) => pr.status === "OPEN" || pr.status === "PENDING",
  );

  // Tarefas não concluídas para o badge.
  const tarefasAbertas = (tarefasQuery.data ?? []).filter(
    (t) => t.status !== "DONE" && t.status !== "DISMISSED",
  );

  const totalIntimacoes = intimacoesQuery.data?.length ?? 0;

  // Prazo mais próximo (soonest-first) para o cálculo de risco e card "próxima providência".
  const prazoVivo = prazosQuery.prazos[0] ?? null;
  const diasVivo = prazoVivo ? prazoVivo.days_left : null;
  const risco = calcularRisco(p, {
    dias: diasVivo,
    providenciasAbertas: tarefasAbertas.length,
  });

  return (
    <div className="px-8 pt-6 pb-10">
      <header className="border-border border-b pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl leading-none font-normal tracking-tight tabular-nums">
                {p.cnj_number}
              </h1>
              <StatusBadge>
                {LIFECYCLE_LABEL[p.lifecycle] ?? p.lifecycle}
              </StatusBadge>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium"
                style={{ background: risco.fundo, color: risco.cor }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: risco.cor }}
                />
                Risco {risco.nivel}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-[13px]">
              {[p.class, p.court, p.degree, p.judging_body]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button>
              <Sparkles className="size-3.5" />
              Gerar peça com IA
            </Button>
            <Button variant="outline">Nova tarefa</Button>
            <Button variant="outline" size="icon">
              ···
            </Button>
          </div>
        </div>

        <dl className="mt-5.5 grid grid-cols-4 gap-6">
          <Meta rotulo="Distribuição" valor={formatDate(p.filed_at)} />
          <Meta
            rotulo="Valor da causa"
            valor={formatClaimValueBRL(p.claim_value)}
          />
          <Meta rotulo="Grau" valor={p.degree} />
          <Meta rotulo="Sistema" valor={p.court} />
        </dl>
      </header>

      <PartesCards processo={p} risco={risco} prazoVivo={prazoVivo} />

      <Segmented
        className="mt-6"
        valor={aba}
        onChange={onAba}
        opcoes={[
          { valor: "resumo", label: "Resumo" },
          { valor: "andamentos", label: "Andamentos" },
          {
            valor: "intimacoes",
            label: "Intimações",
            contagem: totalIntimacoes ? String(totalIntimacoes) : undefined,
          },
          {
            valor: "prazos",
            label: "Prazos",
            contagem: prazosAtivos.length
              ? String(prazosAtivos.length)
              : undefined,
          },
          {
            valor: "tarefas",
            label: "Tarefas",
            contagem: tarefasAbertas.length
              ? String(tarefasAbertas.length)
              : undefined,
          },
          { valor: "documentos", label: "Documentos" },
        ]}
      />

      {aba === "resumo" && (
        <AbaResumo processoId={p.id} processo={p} prazoVivo={prazoVivo} />
      )}
      {aba === "andamentos" && (
        <Card className="mt-4 px-5.5 pt-2 pb-4">
          <AndamentosTimeline processoId={p.id} />
        </Card>
      )}
      {aba === "intimacoes" && <AbaIntimacoes processoId={p.id} />}
      {aba === "prazos" && <AbaPrazos processoId={p.id} />}
      {aba === "tarefas" && <AbaTarefas processoId={p.id} />}
      {aba === "documentos" && <AbaDocumentos />}
    </div>
  );
}

// ── Cards de partes + risco + próxima providência ─────────────────────────────

function PartesCards({
  processo: p,
  risco,
  prazoVivo,
}: {
  processo: ProcessoView;
  risco: ReturnType<typeof calcularRisco>;
  prazoVivo: PrazoView | null;
}) {
  const { data: partes } = usePartes(p.id);
  const assignar = useAssignResponsavel(p.id);

  const autor = partes?.autor[0];
  const reu = partes?.reu[0];
  const dias = prazoVivo ? prazoVivo.days_left : null;

  return (
    <>
      <section className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <SectionTitle>Autor</SectionTitle>
          {autor ? (
            <>
              <p className="mt-2 text-sm font-medium">{autor.name}</p>
              {autor.counsels[0] && (
                <p className="text-muted-foreground mt-1.5 text-[11.5px]">
                  {autor.counsels[0].name}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground mt-2 text-[13px]">—</p>
          )}
        </Card>
        <Card>
          <SectionTitle>Réu</SectionTitle>
          {reu ? (
            <p className="mt-2 text-sm font-medium">{reu.name}</p>
          ) : (
            <p className="text-muted-foreground mt-2 text-[13px]">—</p>
          )}
        </Card>
        <Card>
          <SectionTitle>Responsável interno</SectionTitle>
          {p.assigned_user_name ? (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Avatar nome={p.assigned_user_name} size={28} />
                <span className="text-sm font-medium">
                  {p.assigned_user_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => assignar.mutate(null)}
                className="text-muted-foreground hover:text-foreground text-[11.5px]"
                title="Remover responsável"
              >
                ✕
              </button>
            </div>
          ) : (
            <p className="text-muted-foreground mt-2 text-[13px]">
              Sem responsável
            </p>
          )}
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4">
        {/* border-left colorido pelo risco: aplica no wrapper pois Card não aceita style */}
        <div
          className="bg-card ring-hairline rounded-xl border-l-[3px] p-5"
          style={{ borderLeftColor: risco.cor }}
        >
          <SectionTitle>Risco</SectionTitle>
          <p
            className="font-display mt-2 mb-1.5 text-2xl"
            style={{ color: risco.cor }}
          >
            {risco.nivel}
          </p>
          {risco.motivos.map((m) => (
            <p
              key={m}
              className="text-muted-foreground text-[12.5px] leading-relaxed"
            >
              · {m}
            </p>
          ))}
        </div>

        <Card>
          <SectionTitle>Próxima providência</SectionTitle>
          {prazoVivo ? (
            <>
              <div className="mt-2.5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{prazoVivo.kind}</p>
                  <p
                    className="font-display mt-1 text-[22px] leading-tight"
                    style={{ color: corDaUrgencia(urgenciaDe(dias)) }}
                  >
                    {rotuloPrazo(dias)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-[11.5px]">
                    Vence em
                  </p>
                  <p className="text-[13.5px] font-medium tabular-nums">
                    {prazoVivo.end_date
                      .slice(0, 10)
                      .split("-")
                      .reverse()
                      .join("/")}
                  </p>
                </div>
              </div>
              <Link
                href={`/intimacoes/${prazoVivo.intimation_id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px]"
              >
                Ver intimação de origem
                <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
              </Link>
            </>
          ) : (
            <p className="text-muted-foreground mt-2.5 text-[13.5px]">
              Nada urgente agora — não há prazo em aberto exigindo providência.
            </p>
          )}
        </Card>
      </section>
    </>
  );
}

// ── Aba Resumo ────────────────────────────────────────────────────────────────

function AbaResumo({
  processoId,
  processo: p,
  prazoVivo,
}: {
  processoId: string;
  processo: ProcessoView;
  prazoVivo: PrazoView | null;
}) {
  const { data: resumo, isPending, error } = useProcessoResumo(processoId);

  return (
    <section className="mt-4 grid grid-cols-[minmax(0,1fr)_320px] gap-4">
      <Card>
        <h2 className="font-display text-lg font-medium">
          Resumo do processo por IA
        </h2>

        {isPending && (
          <div className="mt-3 space-y-2">
            <div className="bg-muted h-3 w-full animate-pulse rounded" />
            <div className="bg-muted h-3 w-5/6 animate-pulse rounded" />
            <div className="bg-muted h-3 w-4/6 animate-pulse rounded" />
          </div>
        )}

        {error && (
          <p role="alert" className="text-destructive mt-3 text-[13px]">
            Não foi possível carregar o resumo. Tente novamente.
          </p>
        )}

        {resumo && (
          <>
            {resumo.summary ? (
              <p className="mt-3 text-sm leading-relaxed text-pretty">
                {resumo.summary}
              </p>
            ) : (
              <p className="text-muted-foreground mt-3 text-[13.5px]">
                Resumo ainda sendo gerado…
              </p>
            )}

            {prazoVivo && (
              <div className="mt-4 rounded-xl border border-[color-mix(in_oklch,var(--gold)_25%,transparent)] bg-[color-mix(in_oklch,var(--gold)_8%,transparent)] px-3.5 py-3 text-[13.5px]">
                <strong className="font-medium">Agora:</strong> {prazoVivo.kind}
              </div>
            )}

            {resumo.recommended_actions.length > 0 && (
              <>
                <SectionTitle className="mt-5 mb-2">
                  Próximos passos
                </SectionTitle>
                {resumo.recommended_actions.map((a) => (
                  <p key={a.action} className="flex gap-2 py-1 text-[13.5px]">
                    <span className="text-gold">·</span>
                    {a.action}
                  </p>
                ))}
              </>
            )}

            <p className="text-muted-foreground mt-4 text-[11.5px]">
              Gerado por IA em {formatDateTime(resumo.generated_at)}.
            </p>
          </>
        )}
      </Card>

      <Card className="h-fit">
        <SectionTitle>Dados do processo</SectionTitle>
        <div className="mt-3">
          {(
            [
              ["Classe", p.class],
              ["Assunto", p.subject],
              ["Órgão", p.judging_body],
              ["Sigilo", p.secrecy === "PUBLIC" ? "Público" : p.secrecy],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div
              key={k}
              className="border-border flex justify-between gap-3 border-b py-2 text-[13px] last:border-0"
            >
              <span className="text-muted-foreground">{k}</span>
              <span className="text-right">{v || "—"}</span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

// ── Aba Intimações ────────────────────────────────────────────────────────────

function AbaIntimacoes({ processoId }: { processoId: string }) {
  const {
    data: intimacoes,
    isPending,
    isError,
  } = useIntimacoesByProcesso(processoId);

  if (isPending) {
    return (
      <Card className="mt-4 px-5.5 pt-1.5 pb-3.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-border flex items-center gap-4 border-b py-4 last:border-0"
          >
            <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
            <div className="bg-muted h-3 w-24 animate-pulse rounded" />
          </div>
        ))}
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="mt-4">
        <p role="alert" className="text-destructive text-[13.5px]">
          Erro ao carregar intimações.
        </p>
      </Card>
    );
  }

  if (!intimacoes || intimacoes.length === 0) {
    return (
      <Card className="mt-4">
        <p className="text-muted-foreground text-[13.5px]">
          Nenhuma intimação vinculada a este processo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 px-5.5 pt-1.5 pb-3.5">
      {intimacoes.map((i) => {
        const d = i.prazo ? i.prazo.days_left : null;
        return (
          <Link
            key={i.id}
            href={`/intimacoes/${i.id}`}
            className="border-border hover:bg-muted grid grid-cols-[minmax(0,1fr)_140px_130px_30px] items-center gap-4 border-b px-1 py-4 no-underline last:border-0 hover:no-underline"
          >
            <span className="min-w-0">
              <span className="text-foreground block text-sm font-medium tabular-nums">
                {i.cnj_number}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[11.5px]">
                {i.type} · {i.court}
              </span>
            </span>
            <span
              className="text-[12.5px] tabular-nums"
              style={{ color: corDaUrgencia(urgenciaDe(d)) }}
            >
              {rotuloPrazo(d)}
            </span>
            <span className="text-muted-foreground text-xs">
              {i.prazo?.confirmed === false
                ? "prazo não confirmado"
                : i.prazo
                  ? "prazo confirmado"
                  : "sem prazo"}
            </span>
            <ChevronRight className="text-muted-foreground size-3" />
          </Link>
        );
      })}
    </Card>
  );
}

// ── Aba Prazos ────────────────────────────────────────────────────────────────

function AbaPrazos({ processoId }: { processoId: string }) {
  const {
    prazos,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePrazosByProcesso(processoId);

  if (isPending) {
    return (
      <div className="mt-4 grid gap-3">
        <PrazoCardSkeleton />
        <PrazoCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="mt-4">
        <p role="alert" className="text-destructive text-[13.5px]">
          Erro ao carregar prazos.
        </p>
      </Card>
    );
  }

  if (prazos.length === 0) {
    return (
      <Card className="mt-4">
        <p className="text-muted-foreground text-[13.5px]">
          Nenhum prazo aberto neste processo.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {prazos.map((pr, i) => (
        <PrazoCard key={pr.id} prazo={pr} featured={i === 0} />
      ))}
      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ── Aba Tarefas ───────────────────────────────────────────────────────────────

function AbaTarefas({ processoId }: { processoId: string }) {
  const { data: tarefas, isPending, isError } = useTasksByProcesso(processoId);

  if (isPending) {
    return (
      <Card className="mt-4 px-5.5 pt-1.5 pb-3.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-border flex items-center gap-4 border-b py-3.5 last:border-0"
          >
            <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
            <div className="bg-muted h-3 w-24 animate-pulse rounded" />
          </div>
        ))}
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="mt-4">
        <p role="alert" className="text-destructive text-[13.5px]">
          Erro ao carregar tarefas.
        </p>
      </Card>
    );
  }

  if (!tarefas || tarefas.length === 0) {
    return (
      <Card className="mt-4 px-5.5 pt-1.5 pb-3.5">
        <p className="text-muted-foreground py-4 text-[13.5px]">
          Nenhuma tarefa vinculada.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 px-5.5 pt-1.5 pb-3.5">
      {tarefas.map((t) => (
        <Link
          key={t.id}
          href={`/tasks/${t.id}`}
          className="border-border hover:bg-muted grid grid-cols-[minmax(0,1fr)_140px_110px] items-center gap-4 border-b px-1 py-3.5 no-underline last:border-0 hover:no-underline"
        >
          <span className="text-foreground truncate text-sm">{t.title}</span>
          <span className="text-muted-foreground text-[12.5px]">
            {t.display_status ?? t.status}
          </span>
          <span className="text-muted-foreground text-[12.5px] tabular-nums">
            {t.due_date
              ? `vence ${t.due_date.slice(0, 10).split("-").reverse().join("/")}`
              : "—"}
          </span>
        </Link>
      ))}
    </Card>
  );
}

// ── Aba Documentos (permanece mock — decisão travada) ─────────────────────────

function AbaDocumentos() {
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-[13px]">
          Autos e peças anexadas — a IA fundamenta as revisões nestes
          documentos.
        </p>
        <Button>Enviar documento</Button>
      </div>
      <Card className="mt-3 px-5.5 pt-1.5 pb-3.5">
        <p className="text-muted-foreground py-4 text-[13.5px]">
          Nenhum documento enviado.
        </p>
      </Card>
    </section>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function Meta({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10.5px] tracking-[0.1em] uppercase">
        {rotulo}
      </dt>
      <dd className="mt-1 text-[13.5px] font-medium tabular-nums">{valor}</dd>
    </div>
  );
}
