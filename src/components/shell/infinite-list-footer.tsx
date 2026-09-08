"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

export function InfiniteListFooter({
  paginationKey,
  resetScroll = true,
  hasMore,
  loading,
  paused,
  error,
  onLoadMore,
}: {
  paginationKey: string;
  resetScroll?: boolean;
  hasMore: boolean;
  loading: boolean;
  paused: boolean;
  error: boolean;
  onLoadMore: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = sentinel.current?.closest('[data-slot="page-content"]');
    if (root && resetScroll) root.scrollTop = 0;
  }, [paginationKey, resetScroll]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore || loading || paused || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      {
        root: target.closest('[data-slot="page-content"]'),
        rootMargin: "0px 0px 400px 0px",
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [paginationKey, hasMore, loading, paused, error, onLoadMore]);

  return (
    <div
      ref={sentinel}
      data-slot="infinite-list-footer"
      className="flex min-h-10 items-center justify-center gap-2 py-2"
    >
      {error ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p role="alert" className="text-destructive text-xs">
            Não foi possível carregar mais resultados. Os anteriores foram
            mantidos.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || paused}
            onClick={onLoadMore}
          >
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div
          role="status"
          className="text-muted-foreground flex items-center gap-2 text-xs"
        >
          {hasMore ? (
            loading ? (
              <>
                <LoaderCircle
                  className="size-3.5 motion-safe:animate-spin"
                  aria-hidden
                />
                Carregando mais resultados…
              </>
            ) : null
          ) : (
            "Todos os resultados foram carregados."
          )}
        </div>
      )}
    </div>
  );
}
