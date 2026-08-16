"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/ui/list-pagination";
import { useApi } from "@/lib/api/use-api";
import { useCursorPagination } from "@/lib/hooks/use-cursor-pagination";
import { useDebounce } from "@/lib/hooks/use-debounce";

import { listProcessos } from "../services/processos.service";
import type { ProcessoFilters } from "../types";
import { useProcessosPrazos } from "./use-processos-prazos";

/**
 * Hook público da feature — leitura paginada por cursor (prev/próxima), busca
 * server-side (debounce) e totais "X de Y", tudo via React Query. O componente só
 * consome este; nenhum estado de paginação vive na página.
 *
 * Lifecycle: sincronizado com a query string (`?lifecycle=`) — lê no mount,
 * escreve via router em cada mudança (as abas Tabs são o controle).
 * Filtros avançados (court/degree/assignee) também são sincronizados com a URL
 * (`?court=`, `?degree=`, `?assignee=`) e integram o query key + resetKey da
 * paginação via o mesmo objeto `filters`.
 */
export function useProcessos() {
  const fetcher = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");

  // Filtros avançados: lê ?court=, ?degree= e ?assignee= no mount (SSR-safe:
  // ausentes quando não estão na URL). Cada mudança passa pelo setFilter, que
  // mantém state + URL em sincronia.
  const [filters, setFilters] = useState<ProcessoFilters>(() => {
    const initial: ProcessoFilters = {};
    const court = searchParams?.get("court");
    if (court) initial.court = court;
    const degree = searchParams?.get("degree");
    if (degree) initial.degree = degree;
    const assignee = searchParams?.get("assignee");
    if (assignee) initial.assignee = assignee;
    return initial;
  });

  // Lifecycle: lê ?lifecycle= no mount (SSR-safe: null quando ausente).
  const [lifecycle, setLifecycleState] = useState<string | null>(
    () => searchParams?.get("lifecycle") ?? null,
  );

  // Wrapper que mantém o state + URL em sincronia.
  const setLifecycle = (value: string | null) => {
    setLifecycleState(value);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) {
      params.set("lifecycle", value);
    } else {
      params.delete("lifecycle");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Wrapper de um filtro avançado: atualiza o objeto `filters` (fonte do query
  // key) + o param correspondente na URL, removendo-o quando o valor fica vazio.
  // Mesmo padrão do setLifecycle.
  const setFilter = (key: keyof ProcessoFilters, value: string) => {
    setFilters((f) => {
      const next = { ...f };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Reseta filtros avançados + lifecycle (volta para a aba Total) e limpa os
  // params correspondentes da URL.
  const resetFilters = () => {
    setFilters({});
    setLifecycleState(null);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("lifecycle");
    params.delete("court");
    params.delete("degree");
    params.delete("assignee");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 400);

  // A pilha de cursores reseta quando o filtro (busca + lifecycle + filters + página) muda.
  const pagination = useCursorPagination(
    `${debouncedSearch} ${lifecycle ?? ""} ${JSON.stringify(filters)} ${pageSize}`,
  );

  const query = useQuery({
    queryKey: [
      "processos",
      "list",
      {
        search: debouncedSearch,
        lifecycle,
        limit: pageSize,
        cursor: pagination.activeCursor,
        ...filters,
      },
    ],
    queryFn: () =>
      listProcessos(fetcher, {
        limit: pageSize,
        cursor: pagination.activeCursor,
        search: debouncedSearch || undefined,
        lifecycle: lifecycle || undefined,
        ...filters,
      }),
    placeholderData: keepPreviousData,
  });

  const nextCursor = query.data?.page.next_cursor ?? null;
  const processos = useMemo(() => query.data?.data ?? [], [query.data]);

  // Prazos paralelos para as linhas visíveis (MVP Bridge — BE não entrega
  // next_deadline na listagem). Returns Map<processoId, PrazoView | null>.
  const proximoPrazoPorProcesso = useProcessosPrazos(
    processos.map((p) => p.id),
  );

  // Opções de filtro emitidas pelo BE no envelope (court/degree/assignee — cada
  // chave é omitida quando sem opções; `{}` quando nada se aplica). Alimentam os
  // selects do drawer de filtros. lifecycle fica de fora (as abas são o controle).
  const filterOptions = query.data?.filters;

  // Contagem de filtros ativos (badge do botão "Filtros" na toolbar).
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (lifecycle) count++;
    if (filters.court) count++;
    if (filters.degree) count++;
    if (filters.assignee) count++;
    return count;
  }, [lifecycle, filters]);

  return {
    processos,
    totalCount: query.data?.page.total_count ?? 0,
    total: query.data?.page.total ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    // busca
    search,
    setSearch,
    // filtro por lifecycle (dirigido pelas abas clicáveis)
    lifecycle,
    setLifecycle,
    // filtros avançados
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    // opções de filtro do BE (para os selects do drawer)
    filterOptions,
    // prazos paralelos (MVP Bridge)
    proximoPrazoPorProcesso,
    // paginação
    pageSize,
    setPageSize,
    pageNumber: pagination.pageNumber,
    canPrev: pagination.canPrev,
    canNext: nextCursor !== null,
    onPrev: pagination.prev,
    onNext: () => {
      if (nextCursor) pagination.next(nextCursor);
    },
  };
}
