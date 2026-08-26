"use client";

import { Button } from "@/components/ui/button";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { formatDateTime } from "@/lib/format";

import { useAtividadeDoProcesso } from "../hooks/use-atividade-do-processo";

// Seção "Atividade do escritório" — o que o sistema já fez neste processo
// (análise de intimação concluída, peça gerada), acima do feed de andamentos
// do tribunal. Sem skeleton e sem empty state: enquanto carrega ou quando não
// há atividade, a seção simplesmente não aparece (evita "pulo" de layout e
// ruído visual quando não há nada a mostrar). tone="gold" diferencia
// visualmente de tone="default" usado pelos andamentos do tribunal.
export function AtividadeDoEscritorio({ processoId }: { processoId: string }) {
  const {
    atividades,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAtividadeDoProcesso(processoId);

  if (isPending || isError || atividades.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-col gap-6">
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
