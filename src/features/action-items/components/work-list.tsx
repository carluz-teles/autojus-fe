"use client";

import {
  CheckSquare,
  LayoutGrid,
  List,
  ListFilter,
  Search,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { PageFrame } from "@/components/shell/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { type Facet, FacetedFilter } from "@/components/ui/faceted-filter";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UrgenciaFilter } from "@/features/intimacoes/components/shared/urgencia-filter";
import { Responsavel } from "@/features/organization/components/responsavel";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";
import { formatDate } from "@/lib/format";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { cn } from "@/lib/utils";

import { useWorkspaceList } from "../hooks/use-workspace";
import { STATUS_LABEL } from "../lib/status-pill";
import type { ActionItemView } from "../types";
import { NewProvidencia, WORK_TYPES } from "./new-providencia";
import { ProvidenciaFulfillment } from "./providencia-fulfillment";
import { WorkActions } from "./work-actions";

const TABS = [
  { key: "", label: "Todas" },
  { key: "ACTIVE", label: "Ativas" },
  { key: "TODO", label: "A fazer" },
  { key: "WORKING", label: "Em andamento" },
  { key: "DONE", label: "Concluídas" },
];
function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function WorkList({
  title = "Providências",
  mine = false,
  activeOnly = false,
}: {
  title?: string;
  mine?: boolean;
  activeOnly?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = (changes: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value || key === "status" ? p.set(key, value) : p.delete(key),
    );
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const status = params.get("status") ?? (activeOnly ? "ACTIVE" : "");
  const search = params.get("q") || "";
  const debounced = useDebounce(search, 300);
  const assignee = mine ? "me" : params.get("assignee") || "";
  const tipo = params.get("tipo") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const board = params.get("view") === "board";
  const grouped = params.get("group") === "process";
  const directory = useOrgMembersDirectory();
  const filters = { status, q: debounced, assignee, tipo, from, to };
  const list = useWorkspaceList(filters);
  const facets: Facet[] = [
    ...(!mine
      ? [
          {
            key: "assignee",
            label: "Responsável",
            icon: Users,
            options: [
              { value: "me", label: "Minhas providências" },
              { value: "unassigned", label: "Sem responsável" },
              ...directory.members.map((m) => ({
                value: m.id,
                label: directory.nameFor(m.id) || m.email,
              })),
            ],
          },
        ]
      : []),
    {
      key: "tipo",
      label: "Tipo",
      icon: ListFilter,
      options: Object.entries(WORK_TYPES).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: "status",
      label: "Histórico e sugestões",
      icon: CheckSquare,
      options: [
        { value: "SUGGESTED", label: "Sugestões pendentes" },
        { value: "CANCELLED", label: "Canceladas" },
        { value: "DISMISSED", label: "Sugestões dispensadas" },
      ],
    },
  ];
  const urgency = [
    { key: "", label: "Qualquer data", from: "", to: "" },
    { key: "late", label: "Em atraso", from: "1900-01-01", to: localDate(-1) },
    { key: "today", label: "Hoje", from: localDate(), to: localDate() },
    {
      key: "two",
      label: "Próximos 2 dias",
      from: localDate(),
      to: localDate(2),
    },
    {
      key: "week",
      label: "Próximos 7 dias",
      from: localDate(),
      to: localDate(7),
    },
  ];
  const rangeLabel =
    urgency.find((x) => x.from === from && x.to === to)?.label ||
    `${from ? formatDate(from) : "…"} – ${to ? formatDate(to) : "…"}`;
  const groups = useMemo(
    () =>
      grouped
        ? Object.entries(
            Object.groupBy(list.items, (p) => p.court_record_id || "other"),
          ).map(([key, items]) => ({
            key,
            label: formatarCNJ(items?.[0]?.cnj_number || "") || "Processo",
            items: items || [],
          }))
        : [{ key: "all", label: "", items: list.items }],
    [grouped, list.items],
  );
  return (
    <PageFrame
      header={
        <>
          <h1 className="shrink-0 text-[13px] font-medium">{title}</h1>
          <span className="text-muted-foreground text-xs tabular-nums">
            {list.total}
          </span>
          <div className="ml-auto">
            <NewProvidencia />
          </div>
        </>
      }
      toolbar={
        <div className="flex shrink-0 flex-col border-b">
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
            <Search className="text-muted-foreground size-4" aria-hidden />
            <Input
              aria-label="Buscar providências"
              type="search"
              className="h-8 min-w-40 flex-1 border-0 bg-transparent shadow-none"
              placeholder="Buscar por providência, processo ou CNJ…"
              value={search}
              onChange={(e) => set({ q: e.target.value })}
            />
            <FacetedFilter
              facets={facets}
              values={{ assignee, tipo, status }}
              onChange={(key, value) => set({ [key]: value })}
              onClear={() =>
                set({
                  assignee: "",
                  tipo: "",
                  status: activeOnly ? "ACTIVE" : "",
                })
              }
            />
            <UrgenciaFilter
              tabs={urgency.map((x) => ({
                key: x.key,
                label: x.label,
                ativo: x.from === from && x.to === to,
                onClick: () => set({ from: x.from, to: x.to }),
              }))}
              urgency={
                urgency.find((x) => x.from === from && x.to === to)?.key || ""
              }
              from={from}
              to={to}
              onRange={(from, to) => set({ from, to })}
            />
          </div>
          {((assignee && !mine) ||
            tipo ||
            from ||
            to ||
            ["SUGGESTED", "CANCELLED", "DISMISSED"].includes(status)) && (
            <div className="flex flex-wrap gap-2 px-4 py-2">
              {!mine && assignee && (
                <FilterChip onClear={() => set({ assignee: "" })}>
                  {assignee === "me"
                    ? "Minhas"
                    : assignee === "unassigned"
                      ? "Sem responsável"
                      : directory.nameFor(assignee)}
                </FilterChip>
              )}
              {tipo && (
                <FilterChip onClear={() => set({ tipo: "" })}>
                  {WORK_TYPES[tipo as keyof typeof WORK_TYPES]}
                </FilterChip>
              )}
              {(from || to) && (
                <FilterChip onClear={() => set({ from: "", to: "" })}>
                  {rangeLabel}
                </FilterChip>
              )}
              {["SUGGESTED", "CANCELLED", "DISMISSED"].includes(status) && (
                <FilterChip onClear={() => set({ status: "" })}>
                  {STATUS_LABEL[status as keyof typeof STATUS_LABEL]}
                </FilterChip>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4">
            <Tabs
              className="max-w-full overflow-x-auto"
              defaultValue=""
              value={status}
              onValueChange={(value) => set({ status: value })}
            >
              <TabsList>
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap items-center gap-2 py-2">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={grouped}
                onClick={() => set({ group: grouped ? "" : "process" })}
              >
                Agrupar por processo
              </Button>
              <ToggleGroup
                value={[board ? "board" : "list"]}
                onValueChange={(v) =>
                  set({ view: v[0] === "board" ? "board" : "list" })
                }
                size="sm"
                variant="outline"
              >
                <ToggleGroupItem value="list">
                  <List aria-hidden />
                  Lista
                </ToggleGroupItem>
                <ToggleGroupItem value="board">
                  <LayoutGrid aria-hidden />
                  Quadro
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
        {list.isPending ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : list.isError && !list.items.length ? (
          <div>
            <p role="alert">Não foi possível carregar as providências.</p>
            <Button variant="outline" onClick={() => list.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !list.items.length ? (
          <EmptyState
            icon={CheckSquare}
            title="Nenhuma providência neste recorte"
            description="Crie uma providência ou ajuste os filtros para encontrar o trabalho."
            action={<NewProvidencia />}
          />
        ) : (
          <>
            <p className="text-muted-foreground text-xs">
              Exibindo {list.items.length} de {list.total} providências ·
              ordenadas pela data mais próxima
            </p>
            {groups.map((group) => (
              <section key={group.key} className="flex min-w-0 flex-col gap-3">
                {group.label && (
                  <h2 className="font-display text-lg font-medium">
                    {group.label}
                  </h2>
                )}
                {board ? (
                  <div className="grid items-start gap-4 lg:grid-cols-3">
                    {[
                      "TODO",
                      "WORKING",
                      "DONE",
                      "SUGGESTED",
                      "CANCELLED",
                      "DISMISSED",
                    ]
                      .filter(
                        (s) =>
                          ["TODO", "WORKING", "DONE"].includes(s) ||
                          group.items.some((p) => p.status === s),
                      )
                      .map((s) => (
                        <div
                          key={s}
                          className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-3 shadow-sm"
                        >
                          <h3 className="font-display px-1 text-base font-medium">
                            {STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
                          </h3>
                          {group.items
                            .filter((p) => p.status === s)
                            .map((p) => (
                              <WorkRow key={p.id} item={p} card />
                            ))}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="bg-card @container/worklist divide-y overflow-hidden rounded-xl border px-4 shadow-sm sm:px-5">
                    {group.items.map((p) => (
                      <WorkRow key={p.id} item={p} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </>
        )}
        {!list.isPending && (
          <InfiniteListFooter
            paginationKey={list.paginationKey}
            hasMore={list.hasMore}
            loading={list.isFetchingNextPage}
            paused={list.isPlaceholderData}
            error={list.isFetchNextPageError}
            onLoadMore={list.loadMore}
          />
        )}
      </div>
    </PageFrame>
  );
}
function FilterChip({
  children,
  onClear,
}: {
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClear}>
      {children}
      <X data-icon="inline-end" />
      <span className="sr-only">Remover filtro</span>
    </Button>
  );
}
export function WorkRow({
  item: p,
  card = false,
}: {
  item: ActionItemView;
  card?: boolean;
}) {
  const directory = useOrgMembersDirectory();
  const date = p.effective_due_date || p.due_date?.slice(0, 10);
  const overdue =
    date && date < localDate() && ["TODO", "WORKING"].includes(p.status);
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-3 py-4",
        card
          ? "bg-background rounded-xl border p-4 shadow-sm"
          : "@4xl/worklist:flex-row @4xl/worklist:items-center",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link
          className="font-display hover:text-primary text-base leading-snug font-medium break-words underline-offset-4 hover:underline"
          href={`/providencias/${p.id}`}
        >
          {p.title}
        </Link>
        <p className="text-muted-foreground text-xs">
          {[p.process_title, formatarCNJ(p.cnj_number || ""), p.court]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <ProvidenciaFulfillment fulfillment={p.fulfillment} />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={p.status === "DONE" ? "success" : "secondary"}>
            {STATUS_LABEL[p.status]}
          </Badge>
          {p.tipo_status === "a_confirmar" && (
            <Badge variant="warning">Tipo a revisar</Badge>
          )}
          <span className="text-muted-foreground text-xs">
            {WORK_TYPES[p.tipo]}
          </span>
        </div>
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3",
          !card && "@4xl/worklist:justify-end",
        )}
      >
        <div className="flex flex-col gap-1">
          <p className={overdue ? "text-destructive text-sm" : "text-sm"}>
            {overdue ? "Em atraso · " : ""}
            {date
              ? `${date === p.judicial_due_date ? "Judicial" : "Entrega interna"} · ${formatDate(date)}`
              : "Sem data definida"}
          </p>
          <Responsavel
            value={p.assignee_user_id}
            nome={directory.nameFor(p.assignee_user_id)}
          />
        </div>
        <WorkActions item={p} compact />
      </div>
    </article>
  );
}
