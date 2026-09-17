"use client";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useWorkspaceList } from "../hooks/use-workspace";
import { NewProvidencia } from "./new-providencia";
import { WorkRow } from "./work-list";

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
        <div className="surface-inset @container/worklist divide-y px-4">
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
