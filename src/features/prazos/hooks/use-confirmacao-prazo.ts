"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { intimacoesKeys } from "@/features/intimacoes/hooks/use-intimacoes";
import { useApi } from "@/lib/api/use-api";
import { useDebounce } from "@/lib/hooks/use-debounce";

import {
  type ConfirmacaoForm,
  confirmacaoSchema,
  precisaConfirmarPrazo,
} from "../lib/confirmacao";
import {
  confirmarPrazo,
  noDeadlinePrazo,
  previewPrazo,
} from "../services/prazos.service";
import type { PrazoConfirmDeadline, PrazoDetalheView } from "../types";

export function useConfirmacaoPrazo(
  id: string,
  prazo: PrazoDetalheView,
  estado: string,
) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const [semPrazo, setSemPrazo] = useState(false);
  const pendente = precisaConfirmarPrazo(prazo, estado);
  const form = useForm<ConfirmacaoForm>({
    resolver: zodResolver(confirmacaoSchema),
    mode: "onChange",
    defaultValues: {
      tipo_ato: prazo.tipo_ato?.toLowerCase() ?? "",
      days: prazo.status === "NO_DEADLINE" ? undefined : prazo.days,
      counting: prazo.counting,
      anchor_event: prazo.anchor_event ?? "DEADLINE_START",
      doubled: prazo.doubled,
      manual_extra_days: prazo.manual_extra_days ?? 0,
      revisado: false,
    },
  });
  const values = useWatch({ control: form.control });
  // Review checkbox does not change the calculation or invalidate its preview.
  const calculation = JSON.stringify({
    tipo_ato: values.tipo_ato,
    days: values.days,
    counting: values.counting,
    anchor_event: values.anchor_event,
    doubled: values.doubled,
    manual_extra_days: values.manual_extra_days,
  });
  const debounced = useDebounce(calculation, 300);
  const previewInput = confirmacaoSchema.safeParse({
    ...JSON.parse(debounced),
    revisado: true,
  });
  const preview = useQuery({
    queryKey: ["prazos", "preview", id, debounced],
    queryFn: () =>
      previewPrazo(fetcher, { intimation_id: id, ...JSON.parse(debounced) }),
    enabled: pendente && !semPrazo && previewInput.success,
    retry: false,
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationFn: async (deadline: PrazoConfirmDeadline | null) => {
      if (deadline)
        await confirmarPrazo(fetcher, { intimation_id: id, deadline });
      else await noDeadlinePrazo(fetcher, prazo.id);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["prazos"] }),
        qc.invalidateQueries({ queryKey: intimacoesKeys.all }),
        qc.invalidateQueries({ queryKey: ["processos"] }),
        qc.invalidateQueries({ queryKey: ["action-items"] }),
        qc.invalidateQueries({ queryKey: ["preparation-actions"] }),
      ]);
      toast.success("Revisão registrada.");
    },
    onError: () =>
      toast.error("Não foi possível registrar a revisão. Tente novamente."),
  });
  const onSubmit = form.handleSubmit(({ revisado: _revisado, ...deadline }) => {
    if (
      calculation !== debounced ||
      !preview.data ||
      preview.isFetching ||
      preview.isError
    )
      return;
    mutation.mutate(deadline);
  });

  return {
    ajustesResumo: [
      values.doubled ? "Prazo em dobro" : "",
      values.manual_extra_days
        ? `${values.manual_extra_days} dia(s) adicional(is)`
        : "",
      values.anchor_event && values.anchor_event !== "DEADLINE_START"
        ? "Termo inicial alterado"
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
    form,
    pendente,
    semPrazo,
    onSubmit,
    onSemPrazo: () => setSemPrazo(true),
    onVoltar: () => setSemPrazo(false),
    onConfirmarSemPrazo: () => mutation.mutate(null),
    emVoo: mutation.isPending,
    erro: mutation.isError,
    preview:
      calculation === debounced && !preview.isError ? preview.data : undefined,
    onRetryPreview: () => preview.refetch(),
    previewErro: preview.isError && previewInput.success,
    previewPendente: calculation !== debounced || preview.isFetching,
    podeConfirmar:
      form.formState.isValid &&
      calculation === debounced &&
      !!preview.data &&
      !preview.isFetching &&
      !preview.isError &&
      !mutation.isPending,
  };
}
