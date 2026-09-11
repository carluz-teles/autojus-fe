"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useApi } from "@/lib/api/use-api";
import { useInfinitePageBuffer } from "@/lib/hooks/use-infinite-page-buffer";

import type {
  ActionItemView,
  CreateWorkInput,
  PageEnvelope,
  UpdateActionItemInput,
} from "../types";

export type WorkAction =
  | "start"
  | "complete"
  | "accept"
  | "accept_completed"
  | "dismiss"
  | "cancel"
  | "reopen";

export interface WorkMutationCommand {
  id?: string;
  action?: WorkAction;
  patch?: UpdateActionItemInput;
  create?: CreateWorkInput;
}

export function buildWorkMutationRequest(command: WorkMutationCommand) {
  const { id, action, patch, create } = command;
  const legacy =
    action === "start" ? "comecar" : action === "complete" ? "concluir" : null;
  return {
    path: create
      ? "/v1/action-items"
      : `/v1/action-items/${id}${action ? (legacy ? `/${legacy}` : "/actions") : ""}`,
    method: patch ? "PATCH" : "POST",
    body: create ?? patch ?? (legacy ? {} : { action }),
  } as const;
}

export function useWorkspaceList(filters: Record<string, string | undefined>) {
  const api = useApi();
  const key = ["action-items", "workspace", filters];
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) =>
      api<PageEnvelope<ActionItemView>>("/v1/action-items", {
        signal,
        query: { ...filters, limit: 30, cursor: pageParam || undefined },
      }),
    initialPageParam: "",
    getNextPageParam: (page) => page.page.next_cursor || undefined,
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });
  const buffer = useInfinitePageBuffer(key, query);
  return {
    ...query,
    ...buffer,
    items: buffer.pages.flatMap((p) => p.data),
    total: query.data?.pages[0]?.page.total_count ?? 0,
  };
}

export function useWorkMutation() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (command: WorkMutationCommand) => {
      const request = buildWorkMutationRequest(command);
      const result = await api<{ data: ActionItemView }>(request.path, {
        method: request.method,
        body: request.body,
      });
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all(
        [
          "action-items",
          "intimacoes",
          "processos",
          "processo",
          "prazos",
          "preparation-actions",
        ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
      );
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar. Tente novamente.",
      ),
  });
}
