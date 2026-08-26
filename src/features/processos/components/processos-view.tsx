"use client";

import { Menu } from "@base-ui/react/menu";
import { Building2, Landmark, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/mock-ui/data-display";
import { PageHeader } from "@/components/mock-ui/layout";
import { Badge, StatusBadge } from "@/components/mock-ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { type Facet, FacetedFilter } from "@/components/ui/faceted-filter";
import { ListSearchToolbar } from "@/components/ui/list-search-toolbar";
import { Tooltip } from "@/components/ui/tooltip";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { cn, formatarData } from "@/lib/utils";

import {
  type ProcessosFiltersAtivos,
  useBulkAssignResponsaveis,
  usePartes,
  useProcesso,
  useProcessos,
  useProcessosSummary,
} from "../hooks/use-processos";
import type { ProcessoView } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// ProcessosView — master-detail idêntico ao protótipo (Claude Design): lista
// (tabs de lifecycle + seleção + linhas) + painel de detalhe (preview do processo,
// reusa GET /processos/:id e /partes). Paginação "Mostrar mais" (useInfiniteQuery),
// filtro no popover FacetedFilter, cor do fio por urgência do prazo.
// ─────────────────────────────────────────────────────────────────────────────

type LifecycleTab = "todos" | "ACTIVE" | "SUSPENDED" | "ARCHIVED" | "CLOSED";

const LIFECYCLE_TABS: {
  value: LifecycleTab;
  label: string;
  summaryKey: "total" | "em_andamento" | "suspensos" | "arquivados" | "baixados";
}[] = [
  { value: "todos", label: "Total", summaryKey: "total" },
  { value: "ACTIVE", label: "Em andamento", summaryKey: "em_andamento" },
  { value: "SUSPENDED", label: "Suspensos", summaryKey: "suspensos" },
  { value: "ARCHIVED", label: "Arquivados", summaryKey: "arquivados" },
  { value: "CLOSED", label: "Baixado", summaryKey: "baixados" },
];

const GRAU_LABEL: Record<string, string> = {
  G1: "1º grau",
  G2: "2º grau",
  JE: "Juizado",
  SUPERIOR: "Superior",
  UNKNOWN: "—",
};

const LIFECYCLE_LABEL: Record<string, string> = {
  ACTIVE: "Em andamento",
  SUSPENDED: "Suspenso",
  ARCHIVED: "Arquivado",
  CLOSED: "Baixado",
};

// Pill de status na linha — tom por lifecycle (info/latão/neutro).
const STATUS_PILL: Record<string, string> = {
  ACTIVE: "bg-primary/10 text-primary",
  SUSPENDED: "bg-gold/15 text-gold",
  ARCHIVED: "bg-muted text-muted-foreground",
  CLOSED: "bg-muted text-muted-foreground",
};

interface FiltrosExtra {
  court: string;
  degree: string;
  responsavel: string;
}

const FILTROS_EXTRA_VAZIOS: FiltrosExtra = {
  court: "",
  degree: "",
  responsavel: "",
};

function nomeMembro(m: { name: string; email: string }): string {
  const n = m.name?.trim();
  if (n) return n;
  return m.email ? m.email.split("@")[0] : "";
}

/** Valor da causa (decimal em string) → moeda pt-BR. null/vazio → "—". */
function fmtValor(v: string | null): string {
  if (!v) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** DATE do BE serializa à meia-noite UTC — slice(0,10) preserva o dia. */
function fmtData(iso: string | null): string {
  return iso ? formatarData(iso.slice(0, 10)) : "—";
}

export function ProcessosView() {
  const [lifecycle, setLifecycle] = useState<LifecycleTab>("todos");
  const [filtrosExtra, setFiltrosExtra] =
    useState<FiltrosExtra>(FILTROS_EXTRA_VAZIOS);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const trocarLifecycle = (valor: LifecycleTab) => {
    setLifecycle(valor);
    setMarcados(new Set());
  };

  const membros = useOrgMembersDirectory();

  const filters: ProcessosFiltersAtivos = {
    lifecycle: lifecycle === "todos" ? undefined : lifecycle,
    court: filtrosExtra.court || undefined,
    degree: filtrosExtra.degree || undefined,
    assignee: filtrosExtra.responsavel || undefined,
  };

  const {
    processos,
    filters: filterOptions,
    totalCount,
    isPending,
    isFetching,
    error,
    search,
    setSearch,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useProcessos(filters);

  const summary = useProcessosSummary();

  // Seleciona o primeiro por padrão (ou quando a seleção sai do dataset). Ajuste
  // síncrono no render (mesmo padrão de useIntimacoes) — sem cascading effect.
  const selecaoValida = processos.some((p) => p.id === selecionadoId);
  if (!isPending && !selecaoValida) {
    const proximo = processos[0]?.id ?? null;
    if (proximo !== selecionadoId) setSelecionadoId(proximo);
  }

  const idsCarregados = processos.map((p) => p.id);
  const todosMarcados =
    idsCarregados.length > 0 && idsCarregados.every((id) => marcados.has(id));
  const algum = marcados.size > 0;

  const limparSelecao = () => setMarcados(new Set());
  const alternarTodos = () =>
    setMarcados(todosMarcados ? new Set() : new Set(idsCarregados));
  const alternarMarcado = (id: string) =>
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulkAssign = useBulkAssignResponsaveis();
  const atribuirEmMassa = (conductorUserId: string) => {
    bulkAssign.mutate(
      { ids: [...marcados], conductorUserId },
      {
        onSuccess: (r) => {
          toast(
            `${r.affected} ${r.affected === 1 ? "processo atribuído" : "processos atribuídos"}`,
          );
          limparSelecao();
        },
      },
    );
  };

  const limparFiltrosExtra = () => setFiltrosExtra(FILTROS_EXTRA_VAZIOS);

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
    const courts = filterOptions["court"] ?? [];
    if (courts.length > 0) {
      fs.push({
        key: "court",
        label: "Tribunal",
        icon: Building2,
        options: courts,
      });
    }
    const degrees = filterOptions["degree"] ?? [];
    if (degrees.length > 0) {
      fs.push({
        key: "degree",
        label: "Grau",
        icon: Landmark,
        options: degrees,
      });
    }
    return fs;
  }, [filterOptions, membros.members]);

  if (isPending) return <Esqueleto />;

  if (error)
    return (
      <div className="px-8 pt-6">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar os processos. Tente novamente.
        </p>
      </div>
    );

  return (
    <div className="relative -mx-6 -my-10 flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="px-8 pt-8 pb-5">
        <PageHeader
          titulo="Processos"
          descricao="Processos consolidados a partir da captura (DJEN) e do enriquecimento (DATAJUD)."
          className="border-b-0 pb-0"
        >
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ListSearchToolbar
              className="flex-1"
              inputWidthClassName="sm:max-w-sm"
              value={search}
              onChange={setSearch}
              placeholder="Buscar por número do processo…"
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
              values={{
                responsavel: filtrosExtra.responsavel,
                court: filtrosExtra.court,
                degree: filtrosExtra.degree,
              }}
              onChange={(key, value) =>
                setFiltrosExtra((f) => ({ ...f, [key]: value }))
              }
              onClear={limparFiltrosExtra}
            />

            <Tooltip label="Processos são importados automaticamente">
              <button
                type="button"
                disabled
                className="border-border bg-card text-muted-foreground cursor-not-allowed rounded-lg border px-3.5 py-2 text-[12.5px] opacity-60"
              >
                Novo processo
              </button>
            </Tooltip>
          </div>
        </PageHeader>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(420px,1fr)_minmax(320px,400px)] border-t">
        <div className="flex min-h-0 flex-col">
          <div className="px-8 pt-4">
            <div
              role="tablist"
              aria-label="Situação"
              className="flex items-center border-b"
            >
              {LIFECYCLE_TABS.map((t) => {
                const selected = lifecycle === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => trocarLifecycle(t.value)}
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
                  checked={todosMarcados}
                  indeterminate={algum && !todosMarcados}
                  onCheckedChange={() => alternarTodos()}
                  aria-label="Selecionar processos visíveis"
                />
                Selecionar {processos.length} nesta faixa
              </label>
            </div>
          </div>

          <ListaProcessos
            itens={processos}
            totalCount={totalCount}
            selecionadoId={selecionadoId}
            onSelecionar={setSelecionadoId}
            estaMarcado={(id) => marcados.has(id)}
            onMarcar={alternarMarcado}
            onLimpar={() => {
              limparFiltrosExtra();
              setSearch("");
            }}
            isFetching={isFetching}
            hasMore={!!hasMore}
            isLoadingMore={isLoadingMore}
            onMostrarMais={() => void loadMore()}
          />
        </div>

        {selecionadoId ? (
          <PainelProcesso id={selecionadoId} />
        ) : (
          <aside className="border-border text-muted-foreground overflow-y-auto border-l p-6 text-sm">
            Nenhum processo selecionado.
          </aside>
        )}
      </div>

      {algum ? (
        <BarraSelecao
          quantidade={marcados.size}
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
  onAtribuir: (conductorUserId: string) => void;
  onFechar: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-[max(320px,25%)] left-0 z-40 flex items-end justify-center pb-6">
      <div className="bg-foreground text-background pointer-events-auto flex items-center gap-1.5 rounded-2xl p-1.5 pl-4 shadow-xl">
        <span className="pr-2 text-[13px] leading-tight font-medium">
          {quantidade} {quantidade === 1 ? "selecionado" : "selecionados"}
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

function ListaProcessos({
  itens,
  totalCount,
  selecionadoId,
  onSelecionar,
  estaMarcado,
  onMarcar,
  onLimpar,
  isFetching,
  hasMore,
  isLoadingMore,
  onMostrarMais,
}: {
  itens: ProcessoView[];
  totalCount: number;
  selecionadoId: string | null;
  onSelecionar: (id: string) => void;
  estaMarcado: (id: string) => boolean;
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
            <p className="text-sm">Nenhum processo nesta faixa.</p>
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
          <LinhaProcesso
            key={item.id}
            item={item}
            selecionado={item.id === selecionadoId}
            onSelecionar={() => onSelecionar(item.id)}
            marcado={estaMarcado(item.id)}
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

function LinhaProcesso({
  item,
  selecionado,
  onSelecionar,
  marcado,
  onMarcar,
}: {
  item: ProcessoView;
  selecionado: boolean;
  onSelecionar: () => void;
  marcado: boolean;
  onMarcar: () => void;
}) {
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
      className={cn(
        "border-border grid w-full grid-cols-[22px_minmax(0,1fr)_118px_92px] items-center gap-2.5 border-b border-l-[3px] py-2.5 pr-3 pl-[9px] text-left transition-colors",
        "cursor-pointer",
        selecionado ? "bg-gold/[0.1]" : "hover:bg-gold/[0.08]",
      )}
    >
      {/* col 1 — seleção */}
      <span
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={marcado}
          onCheckedChange={() => onMarcar()}
          aria-label="Selecionar processo"
        />
      </span>

      {/* col 2 — número + classe */}
      <span className="min-w-0">
        <span className="text-foreground block truncate text-[14px] tabular-nums">
          {item.cnj_number}
        </span>
        <span className="text-muted-foreground mt-1 block truncate text-[11.5px]">
          {item.class}
        </span>
      </span>

      {/* col 3 — responsável */}
      <span className="flex min-w-0 items-center gap-2">
        {item.assigned_user_name ? (
          <>
            <Avatar nome={item.assigned_user_name} size={22} />
            <span className="truncate text-[12.5px]">
              {item.assigned_user_name.split(" ")[0]}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground text-[12.5px]">—</span>
        )}
      </span>

      {/* col 4 — status */}
      <span>
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
            STATUS_PILL[item.lifecycle] ?? "bg-muted text-muted-foreground",
          )}
        >
          {LIFECYCLE_LABEL[item.lifecycle] ?? item.lifecycle}
        </span>
      </span>
    </div>
  );
}

// ─── painel de detalhe (preview) ────────────────────────────────────────────

function PainelProcesso({ id }: { id: string }) {
  const { data: p, isPending, error } = useProcesso(id);
  const { data: partes } = usePartes(id);

  if (isPending) return <PainelEsqueleto />;

  if (error || !p) {
    return (
      <aside className="border-border overflow-y-auto border-l p-6">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar este processo. Tente novamente.
        </p>
      </aside>
    );
  }

  const autor = partes?.autor?.[0]?.name;
  const reu = partes?.reu?.[0]?.name;

  return (
    <aside className="border-border sticky top-0 flex max-h-full min-w-0 flex-col overflow-y-auto border-l p-6">
      <p className="text-muted-foreground text-[10.5px] tracking-[0.1em] uppercase">
        {p.class}
        {p.subject ? ` · ${p.subject}` : ""}
      </p>
      <div className="font-display mt-1 text-[24px] font-medium leading-tight tabular-nums">
        {p.cnj_number}
      </div>
      <StatusBadge className="mt-2">
        {LIFECYCLE_LABEL[p.lifecycle] ?? p.lifecycle}
      </StatusBadge>

      {/* Ficha */}
      <dl className="mt-4">
        <Linha label="Órgão julgador">{p.judging_body || "—"}</Linha>
        <Linha label="Tribunal · grau">
          {p.court} · {GRAU_LABEL[p.degree] ?? "—"}
        </Linha>
        <Linha label="Valor da causa">{fmtValor(p.claim_value)}</Linha>
        <Linha label="Distribuição">{fmtData(p.filed_at)}</Linha>
        <Linha label="Sistema" ultima>
          {p.court || "—"}
        </Linha>
      </dl>

      {/* Partes */}
      <div className="mt-4">
        <div className="text-muted-foreground text-[11.5px]">Autor</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold">
          {autor || "—"}
          {false && <Badge>cliente</Badge>}
        </div>
        <div className="text-muted-foreground mt-2.5 text-[11.5px]">
          {reu ? `× ${reu}` : "—"}
        </div>
      </div>

      {/* Responsável */}
      <div className="mt-4">
        <div className="text-muted-foreground text-[10.5px] tracking-[0.1em] uppercase">
          Responsável
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          <Avatar nome={p.assigned_user_name || "—"} size={28} />
          <span className="text-[13px] font-semibold">
            {p.assigned_user_name || "—"}
          </span>
        </div>
      </div>

      <p className="text-muted-foreground mt-3 text-[12px]">
        — intim · — tarefas abertas · — peças
      </p>

      <Link
        href={`/processos/${p.id}`}
        className="bg-primary text-primary-foreground mt-6 flex w-full items-center justify-center rounded-[10px] px-4 py-2.5 text-center text-[13px] font-medium no-underline hover:no-underline"
      >
        Abrir processo
      </Link>
    </aside>
  );
}

function Linha({
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
        "flex items-center justify-between gap-3 py-2.5 text-[12.5px]",
        ultima && "border-border border-b",
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
      <div className="bg-muted h-6 w-44 animate-pulse rounded" />
      <div className="bg-muted mt-2 h-3 w-52 animate-pulse rounded" />
      <div className="bg-muted mt-4 h-20 animate-pulse rounded-xl" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
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
