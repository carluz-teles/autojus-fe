"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { type DefinirTipoForm, definirTipoSchema } from "../lib/confirmacao";
import type { PrazoDetalheView, PrazoReviewPreviewInput } from "../types";
import { useNoDeadlinePrazo } from "./_private/use-no-deadline";
import { usePrazoTipos } from "./_private/use-prazo-tipos";
import { useReviewCommand } from "./_private/use-review-command";

export interface UseDefinirTipoParams {
  intimacaoId: string;
  prazo: PrazoDetalheView | null;
  onConfirmado?: () => void;
}

export function useDefinirTipo({
  intimacaoId,
  prazo,
  onConfirmado,
}: UseDefinirTipoParams) {
  const form = useForm<DefinirTipoForm>({
    resolver: zodResolver(definirTipoSchema),
    mode: "onChange",
    defaultValues: { tipo_ato: prazo?.tipo_ato ?? "" },
  });
  const tipo = useWatch({ control: form.control, name: "tipo_ato" });
  const catalog = usePrazoTipos(intimacaoId);
  const tipoValido = !!catalog.data?.items.some((item) => item.key === tipo);
  const permitido =
    !!prazo?.review?.tipo.can_review &&
    (["OPEN", "PENDING"].includes(prazo.status) ||
      (prazo.status === "NO_DEADLINE" &&
        prazo.no_deadline_reason === "CLASSIFICAR_MANUAL"));
  const input: PrazoReviewPreviewInput | null =
    prazo && tipoValido && permitido
      ? {
          mode: "review",
          intimation_id: intimacaoId,
          expected_revision: prazo.review_revision,
          dimension: "tipo",
          tipo_ato: tipo,
        }
      : null;
  const review = useReviewCommand(prazo, input, onConfirmado);
  const semPrazo = useNoDeadlinePrazo(prazo, onConfirmado);
  const onConfirmar = form.handleSubmit(() => review.apply());
  return {
    form,
    options: catalog.data?.items ?? [],
    catalogPendente: catalog.isPending,
    catalogErro: catalog.isError,
    onRetryCatalog: () => void catalog.refetch(),
    tipoValido,
    previewPendente: review.previewPending,
    previewErro: review.previewError,
    preview: review.preview,
    onRetryPreview: review.retryPreview,
    onConfirmar,
    podeConfirmar: tipoValido && review.canApply,
    onSemPrazo: semPrazo.declarar,
    podeSemPrazo: semPrazo.podeDeclarar,
    emVoo: review.pending || semPrazo.emVoo,
    erro: review.error || semPrazo.erro,
    staleError: review.staleError || semPrazo.staleError,
  };
}
