"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";
import type { Draft } from "../types";

export const draftKeys = {
  all: ["pecas-v2"] as const,
  detail: (id: string) => [...draftKeys.all, "detail", id] as const,
  chat: (id: string) => [...draftKeys.all, "chat", id] as const,
};

export function useDraft(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: draftKeys.detail(id),
    queryFn: () => svc.getDraft(fetcher, id),
    // Enquanto a geração está em curso (saga CREATED/EXTRACTING), o worker
    // já persistiu content_html no fim; polling curto garante que o FE veja
    // a transição pra EXTRACTING (ativando o SSE) e depois DRAFTED (parando).
    refetchInterval: (query) => {
      const saga = (query.state.data as Draft | undefined)?.sagaState;
      if (saga === "CREATED" || saga === "EXTRACTING") return 1000;
      return false;
    },
  });
}

/** Autosave. Aceita patch por seção (ou preâmbulo). O service merga com o
 *  cache atual e envia o structured_content completo pro BE (dual write com
 *  content plain-text serializado). Só invalida em erro; sucesso atualiza
 *  updatedAt otimisticamente. */
export function useSaveDraft(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: svc.SaveDraftInput) => {
      const current = qc.getQueryData<Draft>(draftKeys.detail(id));
      if (!current) {
        // Sem draft no cache — não deveria acontecer no fluxo real (a página
        // só chama save depois do useDraft resolver). Aborta cedo pra evitar
        // enviar um structured_content vazio (que sobrescreveria a peça).
        throw new Error(
          "saveDraft: draft não está no cache — recarregue a página.",
        );
      }
      return svc.saveDraft(fetcher, id, patch, current);
    },
    onSuccess: (res) => {
      // Só atualiza `updatedAt` — não invalida o cache, porque:
      //  (a) o BE PATCH grava structured_content mas NÃO regenera content_html;
      //  (b) o caller (ex.: ConstrucaoPage.applyOne) já faz update otimista
      //      mergeando a mudança no cache local + rebuild via structuredToHtml.
      // Invalidar aqui traria content_html STALE do BE, sobrescrevendo o
      // otimista e revertendo visualmente a mudança que o usuário aceitou.
      qc.setQueryData<Draft>(draftKeys.detail(id), (prev) =>
        prev ? { ...prev, updatedAt: res.updatedAt } : prev,
      );
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: draftKeys.detail(id) });
    },
  });
}
