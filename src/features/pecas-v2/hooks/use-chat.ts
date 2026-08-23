"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";
import type { ChatMessage, QuickActionKind } from "../types";
import { draftKeys } from "./use-draft";

export function useChatThread(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: draftKeys.chat(id),
    queryFn: () => svc.getChatThread(fetcher, id),
  });
}

/** POST /v1/pecas/:id/chat — envia turn user + recebe turn assistant.
 *  Optimistic: insere o turn do user imediatamente; em sucesso substitui pelo
 *  par retornado pelo service (assistant real + user sintético). */
export function useSendChatMessage(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (question: string) => svc.sendChatMessage(fetcher, id, question),
    onMutate: async (question) => {
      await qc.cancelQueries({ queryKey: draftKeys.chat(id) });
      const previous = qc.getQueryData<ChatMessage[]>(draftKeys.chat(id)) ?? [];
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content: question,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<ChatMessage[]>(draftKeys.chat(id), [
        ...previous,
        optimistic,
      ]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (_err, _q, ctx) => {
      if (ctx) qc.setQueryData<ChatMessage[]>(draftKeys.chat(id), ctx.previous);
    },
    onSuccess: (res, _q, ctx) => {
      qc.setQueryData<ChatMessage[]>(draftKeys.chat(id), (prev) => {
        const base = (prev ?? []).filter((m) => m.id !== ctx?.optimisticId);
        return [...base, res.user, res.assistant];
      });
    },
  });
}

/** Quick actions do chat (Resumir os autos / Sugerir teses / etc.) — usam o
 *  mesmo /chat endpoint com um prompt hardcoded no service. */
export function useRunQuickAction(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: QuickActionKind) => svc.runQuickAction(fetcher, id, action),
    onSuccess: (res) => {
      qc.setQueryData<ChatMessage[]>(draftKeys.chat(id), (prev) => [
        ...(prev ?? []),
        res.user,
        res.assistant,
      ]);
    },
  });
}
