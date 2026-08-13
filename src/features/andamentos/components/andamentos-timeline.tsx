"use client";

import { ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";

import { useAndamentosDoProcesso } from "../hooks/use-andamentos-do-processo";

// Aba "Andamentos" do processo: linha do tempo (Timeline do DS) alimentada por
// useAndamentosDoProcesso (cursor DESC + "carregar mais"). Só JSX + binding — a
// leitura, o flatten e a paginação vivem no hook.
export function AndamentosTimeline({ processoId }: { processoId: string }) {
  const {
    andamentos,
    isPending,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAndamentosDoProcesso(processoId);

  if (isPending) {
    return <AndamentosSkeleton />;
  }

  if (isError) {
    return (
      <p className="border-destructive/30 bg-destructive/[0.03] text-destructive rounded-xl border px-4 py-6 text-center text-sm">
        {error instanceof ApiError
          ? error.message
          : "Erro ao carregar os andamentos."}
      </p>
    );
  }

  if (andamentos.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Nenhum andamento registrado"
        description="Os movimentos (DATAJUD) deste processo aparecem aqui, do mais recente ao mais antigo, assim que o enriquecimento rodar."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Timeline>
        {andamentos.map((a, i) => (
          <TimelineItem
            key={a.id}
            meta={formatDateTime(a.occurred_at)}
            last={i === andamentos.length - 1 && !hasNextPage}
          >
            <p className="text-sm leading-relaxed">{a.text || "—"}</p>
            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-xs">
              {a.tpu_code != null ? (
                <span className="tabular-nums">TPU {a.tpu_code}</span>
              ) : null}
              {a.source ? <span>· {a.source}</span> : null}
            </p>
          </TimelineItem>
        ))}
      </Timeline>

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

function AndamentosSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-5">
          <div className="bg-muted hidden h-3 w-28 animate-pulse rounded sm:block" />
          <div className="bg-muted mt-1 size-3 shrink-0 animate-pulse rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
            <div className="bg-muted h-3 w-24 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
