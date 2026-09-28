"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { intimacoesKeys } from "@/features/intimacoes/hooks/use-intimacoes";
import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";
import { useDebounce } from "@/lib/hooks/use-debounce";

import { previewPrazoReview, reviewPrazo } from "../../services/prazos.service";
import type {
  PrazoDetalheView,
  PrazoReviewInput,
  PrazoReviewPreviewInput,
} from "../../types";

function stale(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function useReviewCommand(
  prazo: PrazoDetalheView | null,
  input: PrazoReviewPreviewInput | null,
  onSuccess?: () => void,
) {
  const api = useApi();
  const qc = useQueryClient();
  const [staleRevision, setStaleRevision] = useState<number | null>(null);
  const staleError = staleRevision === prazo?.review_revision;
  const key = input ? JSON.stringify(input) : "";
  const debounced = useDebounce(key, 300);
  const preview = useQuery({
    queryKey: ["prazos", "review-preview", prazo?.id, debounced],
    queryFn: () => previewPrazoReview(api, JSON.parse(debounced)),
    enabled: !!prazo?.id && !!input && key === debounced,
    retry: false,
    staleTime: 0,
  });

  const ready =
    !!input &&
    !!prazo &&
    key === debounced &&
    !preview.isFetching &&
    preview.isSuccess &&
    preview.data.review_revision === prazo.review_revision &&
    preview.data.dimension === input.dimension;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!ready || !prazo || !input || !preview.data)
        throw new Error("Prévia atual indisponível");
      const command = {
        expected_revision: prazo.review_revision,
        preview_token: preview.data.preview_token,
        ...(input.dimension === "tipo"
          ? { dimension: "tipo" as const, tipo_ato: input.tipo_ato }
          : { dimension: "prazo" as const, deadline: input.deadline }),
      } satisfies PrazoReviewInput;
      return reviewPrazo(api, prazo.id, command);
    },
    onSuccess: async (result) => {
      setStaleRevision(null);
      qc.setQueryData(["prazos", "detail", prazo?.id], result.deadline);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["prazos"] }),
        qc.invalidateQueries({ queryKey: intimacoesKeys.all }),
        qc.invalidateQueries({ queryKey: ["processos"] }),
        qc.invalidateQueries({ queryKey: ["action-items"] }),
        qc.invalidateQueries({ queryKey: ["preparation-actions"] }),
      ]);
      onSuccess?.();
    },
    onError: async (error) => {
      if (!stale(error)) return;
      setStaleRevision(prazo?.review_revision ?? null);
      qc.removeQueries({ queryKey: ["prazos", "review-preview"] });
      await qc.invalidateQueries({ queryKey: ["prazos", "detail", prazo?.id] });
    },
  });

  return {
    preview: ready ? preview.data : undefined,
    previewPending: !!input && (key !== debounced || preview.isFetching),
    previewError: preview.isError,
    retryPreview: () => void preview.refetch(),
    apply: () => {
      if (ready && !mutation.isPending && !staleError) mutation.mutate();
    },
    canApply: ready && !mutation.isPending && !staleError,
    pending: mutation.isPending,
    error: mutation.error,
    staleError,
  };
}
