"use client";

import { useState } from "react";

import { CelulaDupla, DataTable } from "@/components/mock-ui/data-table";
import { PageHeader, Segmented } from "@/components/mock-ui/layout";
import {
  Badge,
  Chip,
  StatusBadge,
  type Tom,
} from "@/components/mock-ui/status-badge";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMe } from "@/features/onboarding/hooks/use-me";
import {
  corDaUrgencia,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { cn, formatarData } from "@/lib/utils";

import {
  type ProcessosFiltersAtivos,
  useProcessos,
  useProcessosSummary,
} from "../hooks/use-processos";

// Mapa lifecycle (BE) → tom visual do StatusBadge.
const TOM_LIFECYCLE: Record<string, Tom> = {
  ACTIVE: "info",
  SUSPENDED: "warning",
  ARCHIVED: "neutral",
  CLOSED: "neutral",
};

// Rótulo pt-BR do lifecycle.
const LABEL_LIFECYCLE: Record<string, string> = {
  ACTIVE: "Em andamento",
  SUSPENDED: "Suspenso",
  ARCHIVED: "Arquivado",
  CLOSED: "Baixado",
};

// Visões do Segmented (Total | Em andamento | Suspensos | Arquivados).
type LifecycleVisao = "todos" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export function ProcessosView() {
  const [lifecycle, setLifecycle] = useState<LifecycleVisao>("todos");
  const [filtros, setFiltros] = useState<
    Omit<ProcessosFiltersAtivos, "lifecycle">
  >({});

  // "Meus processos": assignee = user_id atual (vem do /identity/me).
  const me = useMe();
  const [meus, setMeus] = useState(false);

  const filtersAtivos: ProcessosFiltersAtivos = {
    ...filtros,
    lifecycle: lifecycle === "todos" ? undefined : lifecycle,
    assignee: meus ? (me.data?.user_id ?? undefined) : undefined,
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
    pageSize,
    setPageSize,
    pageNumber,
    canPrev,
    canNext,
    onPrev,
    onNext,
  } = useProcessos(filtersAtivos);

  const summary = useProcessosSummary();

  // Derivar prazo label e urgência de next_deadline do BE (NÃO N+1 client-side).
  const linhas = processos.map((p) => {
    const nd = p.next_deadline;
    const dias = nd ? nd.days_left : null;
    const urgencia = urgenciaDe(dias);
    const prazoLabel = nd ? rotuloPrazo(dias) : "Sem prazo";
    // DATE do BE serializa à meia-noite UTC — slice(0,10) preserva o dia.
    const prazoData = nd ? formatarData(nd.end_date.slice(0, 10)) : "—";

    return { processo: p, dias, urgencia, prazoLabel, prazoData };
  });

  const limpar = () => {
    setSearch("");
    setFiltros({});
    setMeus(false);
  };

  if (isPending) {
    return (
      <div className="px-8 pt-6 pb-10">
        <div className="bg-muted h-9 w-64 animate-pulse rounded" />
        <div className="bg-muted mt-6 h-64 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-8 pt-6 pb-10">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar os processos. Tente novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Processos"
        descricao="Processos consolidados a partir da captura (DJEN) e do enriquecimento (DATAJUD)."
      >
        <Segmented
          className="mt-6"
          valor={lifecycle}
          onChange={setLifecycle}
          opcoes={[
            {
              valor: "todos",
              label: "Total",
              contagem: String(summary.data?.total ?? "—"),
            },
            {
              valor: "ACTIVE",
              label: "Em andamento",
              contagem: String(summary.data?.em_andamento ?? "—"),
            },
            {
              valor: "SUSPENDED",
              label: "Suspensos",
              contagem: String(summary.data?.suspensos ?? "—"),
            },
            {
              valor: "ARCHIVED",
              label: "Arquivados",
              contagem: String(summary.data?.arquivados ?? "—"),
            },
          ]}
        />

        <BarraFiltros
          search={search}
          filtros={filtros}
          filterOptions={filterOptions}
          meus={meus}
          isFetching={isFetching}
          onSearch={setSearch}
          onFiltro={(k, v) => setFiltros((f) => ({ ...f, [k]: v }))}
          onMeus={setMeus}
          onLimpar={limpar}
        />
      </PageHeader>

      <DataTable
        larguraMinima="1060px"
        colunas={[
          { label: "Nº", largura: "68px" },
          { label: "Processo", largura: "190px" },
          { label: "Classe", largura: "148px" },
          { label: "Órgão julgador", largura: "210px" },
          { label: "Prazo a vencer", largura: "124px" },
          { label: "Responsável", largura: "126px" },
          { label: "Status", largura: "138px" },
        ]}
        onLimpar={limpar}
        vazioTexto={
          search || Object.values(filtros).some(Boolean) || meus
            ? "Nenhum processo com os filtros aplicados."
            : "Nenhum processo encontrado. Aguarde a captura e o enriquecimento."
        }
        linhas={linhas.map((l) => ({
          id: l.processo.id,
          href: `/processos/${l.processo.id}`,
          tom: corDaUrgencia(l.urgencia),
          celulas: [
            <Chip key="n">{l.processo.cnj_number.slice(0, 7)}</Chip>,
            <span key="p" className="block truncate font-medium tabular-nums">
              {l.processo.cnj_number}
            </span>,
            <Badge key="c">{l.processo.class}</Badge>,
            <span key="o" className="text-muted-foreground block truncate">
              {l.processo.judging_body || l.processo.court}
            </span>,
            <CelulaDupla
              key="pr"
              principal={l.prazoLabel}
              apoio={l.prazoData}
              cor={corDaUrgencia(l.urgencia)}
              numerico
            />,
            <span key="r" className="text-muted-foreground block truncate">
              {l.processo.assigned_user_name ?? "Sem responsável"}
            </span>,
            <StatusBadge
              key="s"
              tone={TOM_LIFECYCLE[l.processo.lifecycle] ?? "neutral"}
              ponto
            >
              {LABEL_LIFECYCLE[l.processo.lifecycle] ?? l.processo.lifecycle}
            </StatusBadge>,
          ],
        }))}
      />

      <ListPagination
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageNumber={pageNumber}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        totalCount={totalCount}
      />
    </div>
  );
}

// ─── Barra de filtros server-side ────────────────────────────────────────────

function BarraFiltros({
  search,
  filtros,
  filterOptions,
  meus,
  isFetching,
  onSearch,
  onFiltro,
  onMeus,
  onLimpar,
}: {
  search: string;
  filtros: Omit<ProcessosFiltersAtivos, "lifecycle">;
  filterOptions: Record<string, { label: string; value: string }[] | undefined>;
  meus: boolean;
  isFetching: boolean;
  onSearch: (q: string) => void;
  onFiltro: (k: string, v: string) => void;
  onMeus: (v: boolean) => void;
  onLimpar: () => void;
}) {
  const courtOpcoes = [
    { valor: "__todos__", label: "Todos os tribunais" },
    ...(filterOptions["court"] ?? []).map((o) => ({
      valor: o.value,
      label: o.label,
    })),
  ];
  const degreeOpcoes = [
    { valor: "__todos__", label: "Todos os graus" },
    ...(filterOptions["degree"] ?? []).map((o) => ({
      valor: o.value,
      label: o.label,
    })),
  ];
  // Mapa value→label para o <SelectValue/> renderizar o rótulo (não o código).
  const courtItems = Object.fromEntries(
    courtOpcoes.map((o) => [o.valor, o.label]),
  );
  const degreeItems = Object.fromEntries(
    degreeOpcoes.map((o) => [o.valor, o.label]),
  );

  const temFiltro = search || filtros.court || filtros.degree || meus;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5">
      <input
        type="search"
        placeholder="Buscar por número do processo…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-ring h-8 w-[280px] rounded-md border px-3 text-[13px] focus:ring-1 focus:outline-none"
      />

      {/* "Meus processos" → assignee=user_id atual */}
      <button
        type="button"
        onClick={() => onMeus(!meus)}
        className={cn(
          "cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
          meus
            ? "text-primary border-[color-mix(in_oklch,var(--primary)_40%,transparent)] bg-[color-mix(in_oklch,var(--primary)_10%,transparent)]"
            : "border-border bg-card text-muted-foreground hover:border-[color-mix(in_oklch,var(--primary)_40%,transparent)]",
        )}
      >
        Meus processos
      </button>

      {/* Tribunal */}
      {courtOpcoes.length > 1 && (
        <Select
          items={courtItems}
          value={filtros.court || "__todos__"}
          onValueChange={(v) =>
            onFiltro("court", v === "__todos__" || v == null ? "" : v)
          }
        >
          <SelectTrigger className="h-8 text-[12.5px]" aria-label="Tribunal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {courtOpcoes.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Grau */}
      {degreeOpcoes.length > 1 && (
        <Select
          items={degreeItems}
          value={filtros.degree || "__todos__"}
          onValueChange={(v) =>
            onFiltro("degree", v === "__todos__" || v == null ? "" : v)
          }
        >
          <SelectTrigger className="h-8 text-[12.5px]" aria-label="Grau">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {degreeOpcoes.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isFetching && (
        <span className="text-muted-foreground text-[11.5px]">Carregando…</span>
      )}

      {temFiltro ? (
        <button
          type="button"
          onClick={onLimpar}
          className="border-border bg-card text-muted-foreground hover:text-foreground ml-auto cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px]"
        >
          Limpar filtros
        </button>
      ) : null}
    </div>
  );
}
