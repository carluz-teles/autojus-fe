"use client";

import { useQuery } from "@tanstack/react-query";

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
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const saga = (query.state.data as Draft | undefined)?.sagaState;
      if (saga === "EXTRACTING") return 1000;
      return false;
    },
  });
}
