"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";
import { draftKeys } from "./use-draft";

/** POST /v1/pecas/:id/assume-authorship — flipa authorship pra "human_taken".
 *  Idempotente no BE. Invalida draft.detail pro FE recarregar (banner some,
 *  aba Iterar vira Revisão automático via ConstrucaoPage). */
export function useAssumirAutoria(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.assumirAutoria(fetcher, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: draftKeys.detail(id) });
    },
  });
}

/** POST /v1/pecas/:id/generate — reusa params atuais do draft pra regenerar.
 *  O worker-ai processa async (saga: CREATED → EXTRACTING → DRAFTED). O
 *  ConstrucaoPage vai fazer polling do saga_state via useDraft e mudar de
 *  volta pra PecaPartida quando bater CREATED (ou mostrar loading enquanto
 *  EXTRACTING). Invalida imediatamente pro polling começar. */
export function useRefazerDoZero(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.refazerDoZero(fetcher, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: draftKeys.detail(id) });
    },
  });
}
