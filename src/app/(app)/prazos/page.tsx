"use client";

import { CalendarClock } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { ListPagination } from "@/components/ui/list-pagination";
import { Select } from "@/components/ui/select";
import {
  PrazoCard,
  PrazoCardSkeleton,
} from "@/features/prazos/components/prazo-card";
import {
  type PrazoStatusFilter,
  usePrazosAgenda,
} from "@/features/prazos/hooks/use-prazos-agenda";
import { ApiError } from "@/lib/api/errors";
import { formatCount } from "@/lib/format";

// Agenda global de prazos (deadline) — próximos vencimentos calculados no
// calendário forense, via GET /v1/prazos (read model do BE), filtrados por status
// e paginados por cursor (prev/próxima). O calendário rico fica para outra fatia.

const STATUS_OPTIONS: { value: PrazoStatusFilter; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "OPEN", label: "Em aberto" },
  { value: "PENDING", label: "Aguardando" },
  { value: "MISSED", label: "Perdidos" },
  { value: "MET", label: "Cumpridos" },
  { value: "CANCELLED", label: "Cancelados" },
];

export default function PrazosPage() {
  const {
    prazos,
    totalCount,
    total,
    isPending,
    isFetching,
    error,
    status,
    setStatus,
    pageSize,
    setPageSize,
    pageNumber,
    canPrev,
    canNext,
    onPrev,
    onNext,
  } = usePrazosAgenda();

  const countLabel = isPending
    ? "Calculando…"
    : totalCount === total
      ? `${formatCount(total)} ${total === 1 ? "prazo" : "prazos"}`
      : `${formatCount(totalCount)} de ${formatCount(total)} prazos`;

  return (
    <>
      <PageHeader
        title="Prazos"
        description="Vencimentos calculados no calendário forense (dias úteis, recesso do art. 220)."
      />

      <div className="reveal mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <CalendarClock className="text-gold size-4" />
          <span className="font-medium tabular-nums">{countLabel}</span>
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as PrazoStatusFilter)}
          aria-label="Filtrar por status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="reveal mt-4" aria-busy={isFetching}>
        {isPending ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <PrazoCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <p className="border-destructive/30 bg-destructive/[0.03] text-destructive rounded-xl border px-4 py-10 text-center text-sm">
            {error instanceof ApiError
              ? error.message
              : "Erro ao carregar os prazos."}
          </p>
        ) : prazos.length === 0 ? (
          <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center text-sm">
            <CalendarClock className="size-6 opacity-60" />
            <span className="max-w-sm">
              Nenhum prazo em aberto — os prazos nascem das intimações
              capturadas e são calculados no calendário forense.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {prazos.map((p) => (
              <PrazoCard key={p.id} prazo={p} />
            ))}
          </div>
        )}
      </div>

      {!isPending && !error ? (
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
      ) : null}
    </>
  );
}
