"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { previewPrazo } from "../services/prazos.service";
import type {
  PrazoAnchorEvent,
  PrazoCounting,
  PrazoPreviewResult,
} from "../types";

export interface PreviewPrazoParams {
  intimationId: string;
  anchorEvent: PrazoAnchorEvent | "";
  kind: string;
  days: number;
  counting: PrazoCounting;
  doubled: boolean;
  manualExtraDays: number;
  /** Habilita ou não o preview (desativado enquanto form não está pronto). */
  enabled: boolean;
}

/**
 * Preview ao vivo do prazo — chama POST /v1/prazos/preview via React Query (GET
 * semântico com cache). O cache key inclui todos os parâmetros do form, então
 * muda automaticamente ao editar. staleTime=0 garante refetch a cada mudança.
 *
 * Usado no estado "editando" para mostrar "TERMO FINAL CALCULADO" ao vivo.
 * O debounce (~300ms) é feito no form hook antes de mudar os params.
 */
export function usePreviewPrazo({
  intimationId,
  anchorEvent,
  kind,
  days,
  counting,
  doubled,
  manualExtraDays,
  enabled,
}: PreviewPrazoParams): {
  preview: PrazoPreviewResult | null;
  isPending: boolean;
  isError: boolean;
} {
  const fetcher = useApi();

  const canFetch =
    enabled &&
    !!intimationId &&
    !!anchorEvent &&
    !!kind &&
    days > 0 &&
    Number.isInteger(days);

  const query = useQuery({
    queryKey: [
      "prazos",
      "preview",
      intimationId,
      anchorEvent,
      kind,
      days,
      counting,
      doubled,
      manualExtraDays,
    ],
    queryFn: () =>
      previewPrazo(fetcher, {
        intimation_id: intimationId,
        anchor_event: anchorEvent as PrazoAnchorEvent,
        kind,
        days,
        counting,
        doubled,
        manual_extra_days: manualExtraDays > 0 ? manualExtraDays : undefined,
      }),
    enabled: canFetch,
    staleTime: 0,
    gcTime: 30_000,
  });

  return {
    preview: query.data ?? null,
    isPending: query.isFetching,
    isError: query.isError,
  };
}
