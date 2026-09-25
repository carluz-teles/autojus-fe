"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { type RevisarPrazoForm, revisarPrazoSchema } from "../lib/confirmacao";
import type { PrazoDetalheView, PrazoReviewPreviewInput } from "../types";
import { useNoDeadlinePrazo } from "./_private/use-no-deadline";
import { useReviewCommand } from "./_private/use-review-command";

export function useConfirmacaoPrazo(
  id: string,
  prazo: PrazoDetalheView,
  _estado: string,
  onConfirmado?: () => void,
) {
  const [editando, setEditando] = useState(false);
  const form = useForm<RevisarPrazoForm>({
    resolver: zodResolver(revisarPrazoSchema),
    mode: "onChange",
    defaultValues: {
      days: prazo.days,
      counting: prazo.counting,
      anchor_event: prazo.anchor_event ?? "DEADLINE_START",
      doubled: prazo.doubled,
      manual_extra_days: prazo.manual_extra_days ?? 0,
      revisado: false,
    },
  });
  const values = useWatch({ control: form.control });
  const pendente =
    !!prazo.review?.prazo.can_review &&
    ["OPEN", "PENDING"].includes(prazo.status) &&
    !prazo.review.prazo.reason_codes.includes("date_divergence");
  const valid = revisarPrazoSchema.safeParse({
    ...values,
    revisado: true,
  }).success;
  const input: PrazoReviewPreviewInput | null =
    pendente && (!editando || valid)
      ? {
          mode: "review",
          intimation_id: id,
          expected_revision: prazo.review_revision,
          dimension: "prazo",
          ...(editando
            ? {
                deadline: {
                  days: values.days!,
                  counting: values.counting!,
                  anchor_event: values.anchor_event!,
                  doubled: values.doubled!,
                  manual_extra_days: values.manual_extra_days!,
                  ...(prazo.doubled_reason
                    ? { doubled_reason: prazo.doubled_reason }
                    : {}),
                },
              }
            : {}),
        }
      : null;
  const review = useReviewCommand(prazo, input, () => {
    toast.success("Prazo revisado.");
    onConfirmado?.();
  });
  const semPrazo = useNoDeadlinePrazo(prazo, onConfirmado);
  const onSubmit = form.handleSubmit(() => review.apply());
  return {
    form,
    pendente,
    podeSemPrazo: semPrazo.podeDeclarar,
    onSemPrazo: semPrazo.declarar,
    editando,
    onEditar: () => setEditando(true),
    onManter: () => setEditando(false),
    onSubmit,
    preview: review.preview,
    previewPendente: review.previewPending,
    previewErro: review.previewError,
    onRetryPreview: review.retryPreview,
    podeConfirmar: form.formState.isValid && review.canApply,
    emVoo: review.pending || semPrazo.emVoo,
    erro: review.error || semPrazo.erro,
    staleError: review.staleError || semPrazo.staleError,
  };
}
