"use client";

import { ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { formatDateTime } from "@/lib/format";

import { useAtividadeDoProcesso } from "../hooks/use-atividade-do-processo";

// Aba "Atividade" do processo — o que o sistema já fez neste processo
// (análise de intimação concluída, peça gerada). Aba de primeira classe
// (sempre visível no Segmented, com ou sem contagem), então precisa de
// feedback visual em todos os estados: skeleton enquanto carrega, empty state
// explicativo quando não há atividade, mensagem simples em erro. tone="gold"
// diferencia visualmente dos andamentos do tribunal (tone="default").
export function AtividadeDoEscritorio({ processoId }: { processoId: string }) {
  const {
    atividades,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAtividadeDoProcesso(processoId);

  if (isPending) {
    return <AtividadeSkeleton />;
  }

  if (isError) {
    return (
      <p className="border-destructive/30 bg-destructive/[0.03] text-destructive rounded-xl border px-4 py-6 text-center text-sm">
        Erro ao carregar a atividade deste processo.
      </p>
    );
  }

  if (atividades.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Nenhuma atividade registrada"
        description="As ações já concluídas neste processo (análises, peças geradas) aparecem aqui assim que acontecerem."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Timeline>
        {atividades.map((item, i) => (
          <TimelineItem
            key={item.id}
            tone="gold"
            meta={formatDateTime(item.occurred_at)}
            last={i === atividades.length - 1 && !hasNextPage}
          >
            <p className="text-sm leading-relaxed">{item.text}</p>
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

function AtividadeSkeleton() {
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
