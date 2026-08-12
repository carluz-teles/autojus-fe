"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/ui/list-pagination";
import { useMe } from "@/features/onboarding/hooks/use-me";
import { useApi } from "@/lib/api/use-api";
import { useCursorPagination } from "@/lib/hooks/use-cursor-pagination";

import { listTasks } from "../services/tasks.service";
import { taskKeys } from "../task-keys";
import type { TaskStatus } from "../types";

/** "" = todos os status; caso contrário filtra server-side pelo status. */
export type TaskStatusFilter = "" | TaskStatus;

/**
 * Hook público da agenda de tarefas — lista por cursor (prev/próxima), filtro por
 * status e toggle "meus" (server-side via ?assignee=<meuId>). O id interno do
 * usuário vem do /identity/me (useMe) — nunca inventado; o BE compara com
 * assignee_user_id. Espelha usePrazosAgenda, acrescentando o toggle. O componente
 * só consome este.
 */
export function useTasksAgenda() {
  const fetcher = useApi();
  const { data: me } = useMe();
  const meId = me?.user_id ?? null;

  const [status, setStatus] = useState<TaskStatusFilter>("");
  const [mine, setMine] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // "meus" só filtra quando já sabemos o id; enquanto o /me carrega, mostra todas.
  const assignee = mine && meId ? meId : undefined;

  // A pilha de cursores reseta quando o contexto (status + "meus" + página) muda.
  const pagination = useCursorPagination(
    `${status} ${assignee ?? ""} ${pageSize}`,
  );

  const query = useQuery({
    queryKey: taskKeys.agenda({
      status,
      assignee,
      limit: pageSize,
      cursor: pagination.activeCursor,
    }),
    queryFn: () =>
      listTasks(fetcher, {
        status: status || undefined,
        assignee,
        limit: pageSize,
        cursor: pagination.activeCursor,
      }),
    // Espera o /me quando "meus" está ligado — evita um flash com todas as tarefas.
    enabled: !mine || !!meId,
    placeholderData: keepPreviousData,
  });

  const nextCursor = query.data?.page.next_cursor ?? null;

  return {
    tasks: query.data?.data ?? [],
    totalCount: query.data?.page.total_count ?? 0,
    total: query.data?.page.total ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    // id do usuário atual — o cartão marca "Você" no responsável.
    meId,
    // filtros
    status,
    setStatus,
    mine,
    setMine,
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
