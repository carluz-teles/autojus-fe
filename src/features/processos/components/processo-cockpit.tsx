"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Input } from "@/components/mock-ui/input";
import { Card, SectionTitle, Segmented } from "@/components/mock-ui/layout";
import { Badge, StatusBadge } from "@/components/mock-ui/status-badge";
import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Tooltip } from "@/components/ui/tooltip";
import { AndamentosTimeline } from "@/features/andamentos/components/andamentos-timeline";
import { AtividadeDoEscritorio } from "@/features/andamentos/components/atividade-do-escritorio";
import { useAtividadeDoProcesso } from "@/features/andamentos/hooks/use-atividade-do-processo";
import { ProcessoDocumentos } from "@/features/documentos/components/processo-documentos";
import { useDocumentosDoProcesso } from "@/features/documentos/hooks/use-documentos-do-processo";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { PecaRow } from "@/features/pecas/components/peca-row";
import { usePecasByProcesso } from "@/features/pecas/hooks/use-peca";
import { NovaPecaModal } from "@/features/pecas-v2/components/lista/nova-peca-modal";
import {
  corDaUrgencia,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { NovaTarefaModal } from "@/features/tasks/components/nova-tarefa-modal";
import type { TaskView } from "@/features/tasks/types";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

import { useEditarLabel } from "../hooks/use-editar-label";
import {
  useIntimacoesByProcesso,
  useTasksByProcesso,
} from "../hooks/use-processo-tabs";
import { usePartes, useProcesso } from "../hooks/use-processos";
import type { ProcessoView } from "../types";
import { AtribuirResponsavelProcesso } from "./atribuir-responsavel";

type Aba =
  | "atividade"
  | "andamentos"
  | "intimacoes"
  | "tarefas"
  | "pecas"
  | "documentos";

// Mapa lifecycle → rótulo + tom do StatusBadge.
const LIFECYCLE_LABEL: Record<string, string> = {
  ACTIVE: "Em andamento",
  SUSPENDED: "Suspenso",
  ARCHIVED: "Arquivado",
  CLOSED: "Baixado",
};

export function ProcessoCockpit({ numero }: { numero: string }) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("andamentos");

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
  const tarefasQuery = useTasksByProcesso(p.id);
  const intimacoesQuery = useIntimacoesByProcesso(p.id);
  const { members } = useOrgMembersDirectory();
  // Chamadas elevadas ao componente principal para alimentar a contagem do
  // Segmented — React Query cacheia por query key, então a mesma chamada
  // dentro de AbaPecas/ProcessoDocumentos não duplica requisição de rede.
  const pecasQuery = usePecasByProcesso(p.id);
  const documentosQuery = useDocumentosDoProcesso(p.id);
  const atividadeQuery = useAtividadeDoProcesso(p.id);
  // Tarefas não concluídas para o badge.
  const tarefasAbertas = (tarefasQuery.data ?? []).filter(
    (t) => t.status !== "DONE" && t.status !== "DISMISSED",
  );

  const totalIntimacoes = intimacoesQuery.data?.length ?? 0;

  const [novaTarefaAberta, setNovaTarefaAberta] = useState(false);
  const [novaPecaAberta, setNovaPecaAberta] = useState(false);

  return (
    <div className="px-8 pt-6 pb-10">
      <header className="border-border border-b pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px] tracking-[0.08em] uppercase">
              {[p.judging_body, p.court, p.degree].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl leading-none font-normal tracking-tight tabular-nums">
                {p.cnj_number}
              </h1>
              <StatusBadge>
                {LIFECYCLE_LABEL[p.lifecycle] ?? p.lifecycle}
              </StatusBadge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {totalIntimacoes === 0 ? (
              <Tooltip label="Este processo ainda não tem intimações">
                <Button disabled>
                  <Sparkles className="size-3.5" />
                  Gerar peça
                </Button>
              </Tooltip>
            ) : (
              <Button onClick={() => setNovaPecaAberta(true)}>
                <Sparkles className="size-3.5" />
                Gerar peça
              </Button>
            )}
            <Button variant="outline" onClick={() => setNovaTarefaAberta(true)}>
              Nova tarefa
            </Button>
            <Button variant="outline" size="icon">
              ···
            </Button>
          </div>
        </div>

        <dl className="mt-5.5 grid grid-cols-3 gap-6">
          <Meta rotulo="Distribuição" valor={formatDate(p.filed_at)} />
          <Meta rotulo="Grau" valor={p.degree} />
          <Meta rotulo="Sistema" valor={p.court} />
        </dl>
      </header>

      <PartesCards processo={p} />

      <Segmented
        className="mt-6"
        valor={aba}
        onChange={onAba}
        opcoes={[
          {
            valor: "atividade",
            label: "Atividade",
            contagem: atividadeQuery.totalCount
              ? String(atividadeQuery.totalCount)
              : undefined,
          },
          {
            valor: "andamentos",
            label: "Linha do tempo",
          },
          {
            valor: "intimacoes",
            label: "Intimações",
            contagem: totalIntimacoes ? String(totalIntimacoes) : undefined,
          },
          {
            valor: "tarefas",
            label: "Tarefas",
            contagem: tarefasAbertas.length
              ? String(tarefasAbertas.length)
              : undefined,
          },
          {
            valor: "pecas",
            label: "Peças",
            contagem: pecasQuery.items.length
              ? String(pecasQuery.items.length)
              : undefined,
          },
          {
            valor: "documentos",
            label: "Documentos",
            contagem: documentosQuery.documentos.length
              ? String(documentosQuery.documentos.length)
              : undefined,
          },
        ]}
      />

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_280px] items-start gap-4">
        <div>
          {aba === "atividade" && (
            <Card className="px-5.5 pt-2 pb-4">
              <AtividadeDoEscritorio processoId={p.id} />
            </Card>
          )}
          {aba === "andamentos" && (
            <Card className="px-5.5 pt-2 pb-4">
              <AndamentosTimeline processoId={p.id} />
            </Card>
          )}
          {aba === "intimacoes" && <AbaIntimacoes processoId={p.id} />}
          {aba === "tarefas" && (
            <AbaTarefas
              processoId={p.id}
              assigneeUserIdSugerido={p.assigned_user_id}
            />
          )}
          {aba === "pecas" && <AbaPecas pecasQuery={pecasQuery} />}
          {aba === "documentos" && <ProcessoDocumentos processoId={p.id} />}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <SectionTitle>Dados do processo</SectionTitle>
            <div className="mt-3">
              {(
                [
                  ["Classe", p.class],
                  ["Assunto", p.subject],
                  ["Órgão julgador", p.judging_body],
                  ["Tribunal", p.court],
                  ["Grau", p.degree],
                  ["Sistema", p.court],
                  ["Distribuição", formatDate(p.filed_at)],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="border-border flex justify-between gap-3 border-b py-2 text-[13px]"
                >
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right">{v || "—"}</span>
                </div>
              ))}
              <ApelidoRow processo={p} />
            </div>
          </Card>

          <Card>
            <SectionTitle>Responsável interno</SectionTitle>
            <div className="mt-2.5 flex items-center gap-2.5">
              <AtribuirResponsavelProcesso
                processoId={p.id}
                assigneeUserId={p.assigned_user_id}
                assigneeUserName={p.assigned_user_name}
                avatarSize={40}
              />
              {(() => {
                // assigned_user_name (join do BE) pode vir vazio mesmo com um
                // responsável atribuído (conta Clerk de teste sem nome
                // preenchido) — resolve pelo diretório antes de decidir que
                // não há responsável, nunca mostra o id cru.
                const assignee = p.assigned_user_id
                  ? members.find((m) => m.id === p.assigned_user_id)
                  : undefined;
                const nome =
                  p.assigned_user_name?.trim() ||
                  (assignee ? nomeExibicao(assignee.name, assignee.email) : "");
                return nome ? (
                  <div>
                    <p className="text-sm font-semibold">{nome}</p>
                    <p className="text-muted-foreground text-[11.5px]">
                      condutor do processo
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-[13px]">
                    Sem responsável
                  </p>
                );
              })()}
            </div>
          </Card>
        </div>
      </div>

      <NovaTarefaModal
        aberto={novaTarefaAberta}
        onFechar={() => setNovaTarefaAberta(false)}
        courtRecordId={p.id}
        assigneeUserIdSugerido={p.assigned_user_id}
      />

      <NovaPecaModal
        aberto={novaPecaAberta}
        onFechar={() => setNovaPecaAberta(false)}
        processoId={p.id}
      />
    </div>
  );
}

// ── Partes ──────────────────────────────────────────────────────────────────

function PartesCards({ processo: p }: { processo: ProcessoView }) {
  const { data: partes } = usePartes(p.id);

  const autor = partes?.autor[0];
  const reu = partes?.reu[0];

  return (
    <section className="mt-6">
      <SectionTitle>Partes</SectionTitle>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold">
            {autor?.name || "—"}
            {false && <Badge>cliente</Badge>}
          </p>
          <p className="text-muted-foreground mt-1 text-[12.5px]">
            {reu ? `× ${reu.name}` : "—"}
          </p>
        </div>
        <div className="flex gap-6">
          <Meta
            rotulo="Situação"
            valor={
              <StatusBadge>
                {LIFECYCLE_LABEL[p.lifecycle] ?? p.lifecycle}
              </StatusBadge>
            }
          />
          <Meta rotulo="Distribuição" valor={formatDate(p.filed_at)} />
        </div>
      </div>
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

// ── Aba Tarefas — agrupada por status (Atrasada primeiro) ─────────────────────

function AbaTarefas({
  processoId,
  assigneeUserIdSugerido,
}: {
  processoId: string;
  assigneeUserIdSugerido?: string | null;
}) {
  const { data: tarefas, isPending, isError } = useTasksByProcesso(processoId);
  const [novaTarefaAberta, setNovaTarefaAberta] = useState(false);

  const botaoNovaTarefa = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setNovaTarefaAberta(true)}
    >
      Nova tarefa
    </Button>
  );

  const modal = (
    <NovaTarefaModal
      aberto={novaTarefaAberta}
      onFechar={() => setNovaTarefaAberta(false)}
      courtRecordId={processoId}
      assigneeUserIdSugerido={assigneeUserIdSugerido}
    />
  );

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
      <>
        <Card className="mt-4 px-5.5 pt-1.5 pb-3.5">
          <div className="flex items-center justify-between gap-4 py-4">
            <p className="text-muted-foreground text-[13.5px]">
              Nenhuma tarefa vinculada.
            </p>
            {botaoNovaTarefa}
          </div>
        </Card>
        {modal}
      </>
    );
  }

  // display_status é DERIVADO pelo BE (Aberta|Em execução|Concluída|Atrasada);
  // agrupamos por ele em vez de recalcular a data no client (fonte única de verdade).
  const atrasadas = tarefas.filter((t) => t.display_status === "Atrasada");
  const resto = tarefas.filter((t) => t.display_status !== "Atrasada");

  return (
    <>
      <div className="mt-4 flex justify-end">{botaoNovaTarefa}</div>
      <Card className="mt-3 px-5.5 pt-1.5 pb-3.5">
        {atrasadas.length > 0 && (
          <p className="text-destructive mt-4 text-[11px] font-semibold tracking-[0.1em] uppercase first:mt-0">
            ● Atrasada
          </p>
        )}
        {atrasadas.map((t) => (
          <TarefaRow key={t.id} tarefa={t} />
        ))}
        {resto.map((t) => (
          <TarefaRow key={t.id} tarefa={t} />
        ))}
      </Card>
      {modal}
    </>
  );
}

function TarefaRow({ tarefa: t }: { tarefa: TaskView }) {
  return (
    <Link
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
  );
}

// ── Aba Peças ─────────────────────────────────────────────────────────────────

function AbaPecas({
  pecasQuery,
}: {
  pecasQuery: ReturnType<typeof usePecasByProcesso>;
}) {
  const {
    items: pecas,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = pecasQuery;

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

  if (pecas.length === 0) {
    return (
      <Card className="mt-4">
        <p className="text-muted-foreground text-[13.5px]">
          Nenhuma peça neste processo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 px-5.5 pt-1.5 pb-3.5">
      {pecas.map((p) => (
        <PecaRow key={p.id} peca={p} />
      ))}
      {hasNextPage ? (
        <div className="flex justify-center pt-3">
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
    </Card>
  );
}

// ── Apelido (label manual do título) ───────────────────────────────────────────

/**
 * Linha editável do "Apelido" no card "Dados do processo" — grava PATCH
 * /v1/processos/:id {label} (limpa o override do título com string vazia).
 * Mesma linguagem visual das outras linhas do card; vira um mini-form RHF+Zod
 * sob demanda (botão "editar"), como o form de dados pessoais do Perfil.
 */
function ApelidoRow({ processo }: { processo: ProcessoView }) {
  const { editando, abrir, cancelar, submit, register, errors, isSaving } =
    useEditarLabel(processo);

  if (editando) {
    return (
      <form
        onSubmit={submit}
        className="border-border flex items-start justify-between gap-3 border-b py-2 text-[13px] last:border-0"
      >
        <span className="text-muted-foreground shrink-0 pt-1.5">Apelido</span>
        <div className="flex flex-1 flex-col items-end gap-1.5">
          <Input
            autoFocus
            maxLength={255}
            placeholder="Apelido pro processo (opcional)"
            aria-invalid={errors.label ? true : undefined}
            className="text-right"
            {...register("label")}
          />
          {errors.label ? (
            <p className="text-destructive text-xs">{errors.label.message}</p>
          ) : null}
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelar}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="border-border flex justify-between gap-3 border-b py-2 text-[13px] last:border-0">
      <span className="text-muted-foreground">Apelido</span>
      <button
        type="button"
        onClick={abrir}
        className="hover:text-foreground -my-0.5 rounded px-1 text-right transition-colors"
      >
        {processo.label ? (
          processo.label
        ) : (
          <span className="text-muted-foreground">Definir apelido</span>
        )}
      </button>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function Meta({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10.5px] tracking-[0.1em] uppercase">
        {rotulo}
      </dt>
      <dd className="mt-1 text-[13.5px] font-medium tabular-nums">{valor}</dd>
    </div>
  );
}
