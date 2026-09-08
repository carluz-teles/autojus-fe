"use client";
import { Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useWorkspaceList } from "../hooks/use-workspace";
import { NewProvidencia } from "./new-providencia";
import { WorkRow } from "./work-list";

export function ProvidenciasSection({
  processId,
  intimationId,
  analyzing,
  analyzed,
  onAnalyze,
  analysisError,
}: {
  processId: string;
  intimationId: string;
  analyzing: boolean;
  analyzed: boolean;
  onAnalyze: () => void;
  analysisError?: boolean;
}) {
  const list = useWorkspaceList({ intimacao: intimationId, status: "ALL" });
  const previousAnalysis = useRef(analyzing);
  const { refetch } = list;
  useEffect(() => {
    if (previousAnalysis.current && !analyzing) void refetch();
    previousAnalysis.current = analyzing;
  }, [analyzing, refetch]);
  const suggestions = list.items.filter((p) => p.status === "SUGGESTED");
  const work = list.items.filter((p) => p.status !== "SUGGESTED");
  return (
    <section
      id="providencias-intimacao"
      className="bg-card flex scroll-mt-6 flex-col gap-5 rounded-xl border p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Providências</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Organize e acompanhe o trabalho desta intimação.
          </p>
        </div>
        <NewProvidencia processId={processId} intimationId={intimationId} />
      </div>
      {list.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : list.isError ? (
        <div>
          <p role="alert">Não foi possível carregar as providências.</p>
          <Button variant="outline" onClick={() => list.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : work.length ? (
        <div className="divide-y">
          {work.map((p) => (
            <WorkRow key={p.id} item={p} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nenhum trabalho adicionado. Crie uma providência ou revise as
          sugestões abaixo.
        </p>
      )}
      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Sugestões para revisão</h3>
          <Button
            variant="ghost"
            size="sm"
            disabled={analyzing}
            onClick={onAnalyze}
          >
            <Sparkles data-icon="inline-start" />
            {analyzing
              ? "Analisando…"
              : analyzed
                ? "Atualizar sugestões"
                : "Gerar sugestões"}
          </Button>
        </div>
        {analysisError && (
          <p role="alert" className="text-destructive text-sm">
            Não foi possível atualizar as sugestões. Tente novamente.
          </p>
        )}
        {suggestions.length ? (
          <div className="divide-y">
            {suggestions.map((p) => (
              <WorkRow key={p.id} item={p} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            {analyzing
              ? "As sugestões aparecerão aqui ao concluir a análise."
              : "Nenhuma sugestão pendente de revisão."}
          </p>
        )}
      </div>
      <InfiniteListFooter
        resetScroll={false}
        paginationKey={list.paginationKey}
        hasMore={list.hasMore}
        loading={list.isFetchingNextPage}
        paused={list.isPlaceholderData}
        error={list.isFetchNextPageError}
        onLoadMore={list.loadMore}
      />
    </section>
  );
}

export function ProcessProvidencias({
  processId,
  history,
}: {
  processId: string;
  history: boolean;
}) {
  const list = useWorkspaceList({
    processo: processId,
    status: history ? "" : "ACTIVE",
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewProvidencia processId={processId} />
      </div>
      {list.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : list.isError ? (
        <div>
          <p role="alert">Não foi possível carregar as providências.</p>
          <Button onClick={() => list.refetch()}>Tentar novamente</Button>
        </div>
      ) : list.items.length ? (
        <div className="divide-y">
          {list.items.map((item) => (
            <WorkRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nenhuma providência neste recorte. Crie um novo trabalho para este
          processo.
        </p>
      )}
      <InfiniteListFooter
        resetScroll={false}
        paginationKey={list.paginationKey}
        hasMore={list.hasMore}
        loading={list.isFetchingNextPage}
        paused={list.isPlaceholderData}
        error={list.isFetchNextPageError}
        onLoadMore={list.loadMore}
      />
    </div>
  );
}
