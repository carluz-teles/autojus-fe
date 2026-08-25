"use client";

import { Menu } from "@base-ui/react/menu";
import { ArrowUpRight, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/mock-ui/layout";
import { Checkbox } from "@/components/ui/checkbox";
import { type Facet, FacetedFilter } from "@/components/ui/faceted-filter";
import { ListSearchToolbar } from "@/components/ui/list-search-toolbar";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import {
  corDaUrgencia,
  diasRestantes,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { cn, formatarData } from "@/lib/utils";

import {
  type TasksFilters,
  useBulkAssignTasks,
  useTaskDetalhe,
  useTasks,
  useTasksSummary,
} from "../hooks/use-tasks";
import type { TasksSummary, TaskStatus, TaskView } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// TarefasView — master-detail no padrão de Intimações: lista (abas de status +
// seleção + linhas) + painel de detalhe (preview baseado no Claude Design — cod/
// status, título, descrição, ficha, "Abrir tarefa"). Paginação "Mostrar mais"
// (useInfiniteQuery), filtro FacetedFilter, cor do fio por urgência do prazo.
// ─────────────────────────────────────────────────────────────────────────────

// As abas são buckets de display_status (contagem real via /summary). O BE só
// filtra por status cru (OPEN/DONE); Aberta/Em execução/Atrasada são derivações
// de OPEN — refinadas no cliente por display_status. Concluída = DONE.
type StatusTab = "Aberta" | "Em execução" | "Atrasada" | "Concluída";

const STATUS_TABS: {
  value: StatusTab;
  label: string;
  server: TaskStatus;
  summaryKey: keyof TasksSummary;
}[] = [
  { value: "Aberta", label: "Abertas", server: "OPEN", summaryKey: "abertas" },
  {
    value: "Em execução",
    label: "Em execução",
    server: "OPEN",
    summaryKey: "em_execucao",
  },
  {
    value: "Atrasada",
    label: "Atrasadas",
    server: "OPEN",
    summaryKey: "atrasadas",
  },
  {
    value: "Concluída",
    label: "Concluídas",
    server: "DONE",
    summaryKey: "concluidas",
  },
];

const ORIGEM_LABEL: Record<string, string> = {
  DEADLINE: "Prazo",
  INTIMATION: "Intimação",
  MANUAL: "Manual",
};

// Pill de status — tom por display_status.
const STATUS_PILL: Record<string, string> = {
  Aberta: "bg-muted text-muted-foreground",
  "Em execução": "bg-gold/15 text-gold",
  Concluída: "bg-primary/10 text-primary",
  Atrasada: "bg-destructive/10 text-destructive",
};

interface FiltrosExtra {
  responsavel: string;
}

function nomeMembro(m: { name: string; email: string }): string {
  const n = m.name?.trim();
  if (n) return n;
  return m.email ? m.email.split("@")[0] : "";
}

/** Dias até o vencimento contra HOJE real (o BE deriva display_status assim). */
function diasDaTarefa(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return diasRestantes(
    dueDate.slice(0, 10),
    new Date().toISOString().slice(0, 10),
  );
}

export function TarefasView() {
  // Deep-link vindo da providência da intimação: /tarefas?task=<id> abre a tarefa
  // no preview (buscado por id, independe da aba/página carregada).
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("task");

  const [tab, setTab] = useState<StatusTab>("Aberta");
  const [filtrosExtra, setFiltrosExtra] = useState<FiltrosExtra>({
    responsavel: "",
  });
  const [selecionadaId, setSelecionadaId] = useState<string | null>(deepLinkId);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const abaAtiva = STATUS_TABS.find((t) => t.value === tab) ?? STATUS_TABS[0];

  const trocarTab = (valor: StatusTab) => {
    setTab(valor);
    setMarcadas(new Set());
  };

  const membros = useOrgMembersDirectory();

  const filters: TasksFilters = {
    status: abaAtiva.server,
    assignee: filtrosExtra.responsavel || undefined,
  };

  const {
    tarefas,
    totalCount,
    isPending,
    isFetching,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useTasks(filters);

  const summary = useTasksSummary();

  // Refino client-side: a aba filtra por display_status (Aberta/Em execução/
  // Atrasada saem do mesmo fetch OPEN) e a busca casa título/descrição.
  const termo = search.trim().toLowerCase();
  const visiveis = useMemo(
    () =>
      tarefas
        .filter((t) => (t.display_status ?? "") === abaAtiva.value)
        .filter(
          (t) =>
            !termo ||
            t.title.toLowerCase().includes(termo) ||
            (t.description ?? "").toLowerCase().includes(termo),
        ),
    [tarefas, abaAtiva.value, termo],
  );

  // Seleciona a primeira por padrão (ajuste síncrono no render, sem cascading).
  // Preserva a tarefa deep-linkada (?task=) mesmo fora da faixa atual — o preview
  // a busca por id; só some quando o usuário clica em outra linha.
  const selecaoValida = visiveis.some((t) => t.id === selecionadaId);
  if (!isPending && !selecaoValida) {
    const ehDeepLink = !!deepLinkId && selecionadaId === deepLinkId;
    if (!ehDeepLink) {
      const proxima = visiveis[0]?.id ?? null;
      if (proxima !== selecionadaId) setSelecionadaId(proxima);
    }
  }

  const idsVisiveis = visiveis.map((t) => t.id);
  const todasMarcadas =
    idsVisiveis.length > 0 && idsVisiveis.every((id) => marcadas.has(id));
  const alguma = marcadas.size > 0;

  const limparSelecao = () => setMarcadas(new Set());
  const alternarTodas = () =>
    setMarcadas(todasMarcadas ? new Set() : new Set(idsVisiveis));
  const alternarMarcada = (id: string) =>
    setMarcadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulkAssign = useBulkAssignTasks();
  const atribuirEmMassa = (assigneeUserId: string) => {
    bulkAssign.mutate(
      { ids: [...marcadas], assigneeUserId },
      {
        onSuccess: (r) => {
          toast(
            `${r.affected} ${r.affected === 1 ? "tarefa atribuída" : "tarefas atribuídas"}`,
          );
          limparSelecao();
        },
      },
    );
  };

  const facetas: Facet[] = useMemo(() => {
    const fs: Facet[] = [];
    if (membros.members.length > 0) {
      fs.push({
        key: "responsavel",
        label: "Responsável",
        icon: Users,
        options: membros.members.map((m) => ({
          value: m.id,
          label: nomeMembro(m),
        })),
      });
    }
    return fs;
  }, [membros.members]);

  if (isPending) return <Esqueleto />;

  if (error)
    return (
      <div className="px-8 pt-6">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar as tarefas. Tente novamente.
        </p>
      </div>
    );

  return (
    <div className="relative -mx-6 -my-10 flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="px-8 pt-8 pb-5">
        <PageHeader
          titulo="Tarefas"
          descricao="O que fazer — tarefas derivadas dos prazos e intimações, atribuídas à equipe."
          className="border-b-0 pb-0"
        >
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ListSearchToolbar
              className="flex-1"
              inputWidthClassName="sm:max-w-sm"
              value={search}
              onChange={setSearch}
              placeholder="Buscar por título ou descrição…"
            >
              {isFetching ? (
                <span className="text-muted-foreground text-[11.5px]">
                  Carregando…
                </span>
              ) : null}
            </ListSearchToolbar>

            <FacetedFilter
              className="ml-auto"
              facets={facetas}
              values={{ responsavel: filtrosExtra.responsavel }}
              onChange={(key, value) =>
                setFiltrosExtra((f) => ({ ...f, [key]: value }))
              }
              onClear={() => setFiltrosExtra({ responsavel: "" })}
            />
          </div>
        </PageHeader>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(420px,3fr)_minmax(360px,2fr)] border-t">
        <div className="flex min-h-0 flex-col">
          <div className="px-8 pt-4">
            <div
              role="tablist"
              aria-label="Status"
              className="flex items-center border-b"
            >
              {STATUS_TABS.map((t) => {
                const selected = t.value === tab;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => trocarTab(t.value)}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-2 border-b-2 px-4 pb-3 text-[13px] transition-colors",
                      selected
                        ? "border-primary text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground border-transparent font-medium",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "rounded-full px-2 text-xs tabular-nums",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {summary.data?.[t.summaryKey] ?? "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-[12.5px]">
                <Checkbox
                  checked={todasMarcadas}
                  indeterminate={alguma && !todasMarcadas}
                  onCheckedChange={() => alternarTodas()}
                  aria-label="Selecionar tarefas visíveis"
                />
                Selecionar {visiveis.length} nesta faixa
              </label>
            </div>
          </div>

          <ListaTarefas
            itens={visiveis}
            totalCount={totalCount}
            selecionadaId={selecionadaId}
            onSelecionar={setSelecionadaId}
            estaMarcada={(id) => marcadas.has(id)}
            onMarcar={alternarMarcada}
            onLimpar={() => {
              setFiltrosExtra({ responsavel: "" });
              setSearch("");
            }}
            isFetching={isFetching}
            hasMore={!!hasMore}
            isLoadingMore={isLoadingMore}
            onMostrarMais={() => void loadMore()}
          />
        </div>

        {selecionadaId ? (
          <PainelTarefa id={selecionadaId} />
        ) : (
          <aside className="border-border text-muted-foreground overflow-y-auto border-l p-6 text-sm">
            Nenhuma tarefa selecionada.
          </aside>
        )}
      </div>

      {alguma ? (
        <BarraSelecao
          quantidade={marcadas.size}
          membros={membros.members}
          atribuindo={bulkAssign.isPending}
          onAtribuir={atribuirEmMassa}
          onFechar={limparSelecao}
        />
      ) : null}
    </div>
  );
}

// ─── barra flutuante de seleção em massa ────────────────────────────────────

function BarraSelecao({
  quantidade,
  membros,
  atribuindo,
  onAtribuir,
  onFechar,
}: {
  quantidade: number;
  membros: { id: string; name: string; email: string }[];
  atribuindo: boolean;
  onAtribuir: (assigneeUserId: string) => void;
  onFechar: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-[40%] left-0 z-40 flex items-end justify-center pb-6">
      <div className="bg-foreground text-background pointer-events-auto flex items-center gap-1.5 rounded-2xl p-1.5 pl-4 shadow-xl">
        <span className="pr-2 text-[13px] leading-tight font-medium">
          {quantidade} {quantidade === 1 ? "selecionada" : "selecionadas"}
        </span>
        <Menu.Root>
          <Menu.Trigger
            disabled={atribuindo}
            className="bg-gold text-foreground hover:bg-gold/90 flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-60"
          >
            <UserPlus className="size-4" />
            {atribuindo ? "Atribuindo…" : "Atribuir"}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="top" align="center" sideOffset={8}>
              <Menu.Popup className="bg-popover text-popover-foreground ring-foreground/10 z-50 max-h-72 min-w-52 overflow-y-auto rounded-lg p-1 shadow-md ring-1 outline-none">
                {membros.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-1.5 text-[13px]">
                    Nenhum membro disponível.
                  </p>
                ) : (
                  membros.map((m) => (
                    <Menu.Item
                      key={m.id}
                      onClick={() => onAtribuir(m.id)}
                      className="focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none select-none"
                    >
                      <span className="flex-1 truncate">{nomeMembro(m)}</span>
                    </Menu.Item>
                  ))
                )}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Limpar seleção"
          className="hover:bg-background/10 ml-1 flex size-8 items-center justify-center rounded-xl transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── lista (coluna esquerda) ────────────────────────────────────────────────

function ListaTarefas({
  itens,
  totalCount,
  selecionadaId,
  onSelecionar,
  estaMarcada,
  onMarcar,
  onLimpar,
  isFetching,
  hasMore,
  isLoadingMore,
  onMostrarMais,
}: {
  itens: TaskView[];
  totalCount: number;
  selecionadaId: string | null;
  onSelecionar: (id: string) => void;
  estaMarcada: (id: string) => boolean;
  onMarcar: (id: string) => void;
  onLimpar: () => void;
  isFetching: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onMostrarMais: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-8 pt-2"
        aria-live="polite"
        aria-busy={isFetching}
      >
        {itens.length === 0 && !isFetching ? (
          <div className="text-muted-foreground py-16 text-center">
            <p className="text-sm">Nenhuma tarefa nesta faixa.</p>
            <button
              type="button"
              onClick={onLimpar}
              className="border-border bg-card mt-3 cursor-pointer rounded-lg border px-3.5 py-1.5 text-[12.5px]"
            >
              Limpar filtros
            </button>
          </div>
        ) : null}

        {itens.map((item) => (
          <LinhaTarefa
            key={item.id}
            item={item}
            selecionada={item.id === selecionadaId}
            onSelecionar={() => onSelecionar(item.id)}
            marcada={estaMarcada(item.id)}
            onMarcar={() => onMarcar(item.id)}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="border-border shrink-0 border-t px-8 py-3">
          <button
            type="button"
            onClick={onMostrarMais}
            disabled={isLoadingMore}
            className="text-primary cursor-pointer text-[12.5px] font-medium hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore
              ? "Carregando…"
              : `Mostrar mais ${Math.max(totalCount - itens.length, 0)} de ${totalCount}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LinhaTarefa({
  item,
  selecionada,
  onSelecionar,
  marcada,
  onMarcar,
}: {
  item: TaskView;
  selecionada: boolean;
  onSelecionar: () => void;
  marcada: boolean;
  onMarcar: () => void;
}) {
  const dias = diasDaTarefa(item.due_date);
  const cor = corDaUrgencia(urgenciaDe(dias));
  const origem = ORIGEM_LABEL[item.source] ?? item.source;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelecionar}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelecionar();
        }
      }}
      style={{ borderLeftColor: cor }}
      className={cn(
        "border-border grid w-full grid-cols-[22px_minmax(0,1fr)_118px_88px] items-center gap-2.5 border-b border-l-[3px] py-2.5 pr-3 pl-[9px] text-left transition-colors",
        "cursor-pointer",
        selecionada ? "bg-gold/[0.1]" : "hover:bg-gold/[0.08]",
      )}
    >
      {/* col 1 — seleção */}
      <span
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={marcada}
          onCheckedChange={() => onMarcar()}
          aria-label="Selecionar tarefa"
        />
      </span>

      {/* col 2 — título + origem + status */}
      <span className="min-w-0">
        <span className="text-foreground block truncate text-[14px]">
          {item.title}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="text-muted-foreground truncate text-[11.5px]">
            {origem}
          </span>
          {item.display_status ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-px text-[10.5px] whitespace-nowrap",
                STATUS_PILL[item.display_status] ??
                  "bg-muted text-muted-foreground",
              )}
            >
              {item.display_status}
            </span>
          ) : null}
        </span>
      </span>

      {/* col 3 — prazo (cor = urgência) */}
      <span className="text-[12px] tabular-nums" style={{ color: cor }}>
        <span className="block">
          {item.due_date ? rotuloPrazo(dias) : "Sem prazo"}
        </span>
        {item.due_date ? (
          <span className="text-muted-foreground block text-[11px]">
            {formatarData(item.due_date.slice(0, 10))}
          </span>
        ) : null}
      </span>

      {/* col 4 — responsável (iniciais) */}
      <span className="flex min-w-0 items-center gap-1.5">
        <AvatarResp assigneeId={item.assignee_user_id} />
      </span>
    </div>
  );
}

/** Avatar de iniciais do responsável — resolve o nome pelo diretório da org. */
function AvatarResp({ assigneeId }: { assigneeId?: string }) {
  const { members } = useOrgMembersDirectory();
  const membro = assigneeId ? members.find((m) => m.id === assigneeId) : null;
  if (!membro) {
    return (
      <span
        aria-hidden
        className="border-muted-foreground/40 size-6 shrink-0 rounded-full border border-dashed"
      />
    );
  }
  const nome = nomeMembro(membro);
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      title={nome}
      className="border-border text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px]"
    >
      {iniciais}
    </span>
  );
}

// ─── painel de detalhe (preview — baseado no Claude Design) ──────────────────

function PainelTarefa({ id }: { id: string }) {
  const { data: t, isPending, error } = useTaskDetalhe(id);
  const { members } = useOrgMembersDirectory();

  if (isPending) return <PainelEsqueleto />;

  if (error || !t) {
    return (
      <aside className="border-border overflow-y-auto border-l p-6">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar esta tarefa. Tente novamente.
        </p>
      </aside>
    );
  }

  const membro = t.assignee_user_id
    ? members.find((m) => m.id === t.assignee_user_id)
    : null;
  const resp = membro ? nomeMembro(membro) : "—";

  return (
    <aside className="border-border sticky top-0 flex max-h-full min-w-0 flex-col overflow-y-auto border-l p-6">
      {/* eyebrow: status (o design mostra cod + status; sem código no read model) */}
      {t.display_status ? (
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11.5px] font-medium",
              STATUS_PILL[t.display_status] ?? "bg-muted text-muted-foreground",
            )}
          >
            {t.display_status}
          </span>
        </div>
      ) : null}

      <h2 className="font-display mt-3 text-[22px] leading-tight font-medium text-pretty">
        {t.title}
      </h2>

      {t.description ? (
        <p className="text-muted-foreground mt-2.5 text-[13.5px] leading-relaxed text-pretty">
          {t.description}
        </p>
      ) : null}

      {/* Ficha (o design tem Prioridade — sem campo no read model real) */}
      <dl className="mt-4">
        <LinhaFicha label="Responsável">{resp}</LinhaFicha>
        <LinhaFicha label="Vencimento">
          {t.due_date ? formatarData(t.due_date.slice(0, 10)) : "—"}
        </LinhaFicha>
        {t.intimation_id ? (
          <LinhaFicha label="Intimação" ultima>
            <Link
              href={`/intimacoes/${t.intimation_id}`}
              className="text-primary inline-flex items-center gap-1 no-underline hover:no-underline"
            >
              Abrir intimação
              <ArrowUpRight className="size-3" />
            </Link>
          </LinhaFicha>
        ) : null}
      </dl>

      <Link
        href={`/tarefas/${t.id}`}
        className="bg-primary text-primary-foreground mt-6 flex items-center justify-center rounded-lg px-4 py-2.5 text-center text-[13px] font-medium no-underline hover:no-underline"
      >
        Abrir tarefa
      </Link>
    </aside>
  );
}

function LinhaFicha({
  label,
  children,
  ultima,
}: {
  label: string;
  children: React.ReactNode;
  ultima?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border flex items-center justify-between gap-3 border-t py-2.5 text-[12.5px]",
        ultima && "border-b",
      )}
    >
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="truncate text-right">{children}</dd>
    </div>
  );
}

// ─── esqueletos ─────────────────────────────────────────────────────────────

function PainelEsqueleto() {
  return (
    <aside className="border-border overflow-y-auto border-l p-6">
      <div className="bg-muted h-5 w-24 animate-pulse rounded-full" />
      <div className="bg-muted mt-3 h-6 w-52 animate-pulse rounded" />
      <div className="bg-muted mt-3 h-16 animate-pulse rounded" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="bg-muted h-3 w-20 animate-pulse rounded" />
            <div className="bg-muted h-3 w-28 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </aside>
  );
}

function Esqueleto() {
  return (
    <div className="p-8">
      <div className="bg-muted h-9 w-64 animate-pulse rounded" />
      <div className="bg-muted mt-6 h-10 w-full animate-pulse rounded-lg" />
      <div className="mt-6 grid grid-cols-[3fr_2fr] gap-6">
        <div className="bg-muted h-96 animate-pulse rounded-xl" />
        <div className="bg-muted h-96 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
