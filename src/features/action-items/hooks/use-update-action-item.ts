"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  comecarActionItem,
  concluirActionItem,
  iniciarActionItem,
  updateActionItem,
} from "../services/action-items.service";
import type { UpdateActionItemInput } from "../types";
import { actionItemsKeys } from "./use-action-items";

// Invalida tudo o que uma providência mexida pode tocar: as providências (board +
// aba do processo), os prazos (o "por quê" do painel) e a intimação de origem.
function useInvalidarProvidencias() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: actionItemsKeys.all }),
      qc.invalidateQueries({ queryKey: ["prazos"] }),
      qc.invalidateQueries({ queryKey: ["intimacoes"] }),
    ]);
}

/**
 * Mutation de editar uma providência (PATCH /v1/action-items/:id). Ajuste parcial:
 * `updateActionItem({ id, patch })`. `await Promise.all` mantém `isPending` ligado
 * até o refetch concluir.
 */
export function useUpdateActionItem() {
  const fetcher = useApi();
  const invalidar = useInvalidarProvidencias();

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateActionItemInput }) =>
      updateActionItem(fetcher, id, patch),
    onSuccess: () => invalidar(),
  });

  return {
    updateActionItem: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

/** Inicia a providência (SUGGESTED→TODO) — POST /v1/action-items/:id/iniciar. */
export function useIniciarActionItem() {
  const fetcher = useApi();
  const invalidar = useInvalidarProvidencias();
  return useMutation({
    mutationFn: (id: string) => iniciarActionItem(fetcher, id),
    onSuccess: () => invalidar(),
  });
}

/** Começa o trabalho / dá ciência (TODO→WORKING) — POST /v1/action-items/:id/comecar. */
export function useComecarActionItem() {
  const fetcher = useApi();
  const invalidar = useInvalidarProvidencias();
  return useMutation({
    mutationFn: (id: string) => comecarActionItem(fetcher, id),
    onSuccess: () => invalidar(),
  });
}

/** Conclui a providência (WORKING→DONE) — POST /v1/action-items/:id/concluir. */
export function useConcluirActionItem() {
  const fetcher = useApi();
  const invalidar = useInvalidarProvidencias();
  return useMutation({
    mutationFn: (id: string) => concluirActionItem(fetcher, id),
    onSuccess: () => invalidar(),
  });
}
