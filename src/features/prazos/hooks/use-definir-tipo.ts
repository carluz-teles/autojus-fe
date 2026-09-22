"use client";

// Hook do control "Definir tipo do ato" — o usuário confirma/define, ele mesmo, o
// tipo do ato (e o prazo) de uma intimação. É o control DISCRETO e SEMPRE disponível
// que limpa a pré-condição ACT_TYPE_NOT_DEFINED do BE (diferente do form completo de
// ConfirmacaoPrazo, que só aparece quando o BE exige revisão). Reusa a MESMA camada
// de rede da confirmação (confirmarPrazo / previewPrazo / noDeadlinePrazo) e o closed
// set TIPOS_COM_PRAZO — sem duplicar regra (Regra nº1). O componente chama só este
// hook (JSX + binding).

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { intimacoesKeys } from "@/features/intimacoes/hooks/use-intimacoes";
import { useApi } from "@/lib/api/use-api";
import { useDebounce } from "@/lib/hooks/use-debounce";

import {
  type DefinirTipoForm,
  definirTipoSchema,
  TIPOS_COM_PRAZO,
} from "../lib/confirmacao";
import {
  confirmarPrazo,
  noDeadlinePrazo,
  previewPrazo,
} from "../services/prazos.service";
import type { PrazoDetalheView } from "../types";

export interface UseDefinirTipoParams {
  /** Id da intimação (chave do confirmarPrazo/previewPrazo). */
  intimacaoId: string;
  /** Prazo atual (para semear tipo/dias/contagem); null quando ainda não derivado. */
  prazo: PrazoDetalheView | null;
  /** Chamado após confirmar com sucesso (ex.: o gate segue para a geração). */
  onConfirmado?: () => void;
}

const digits = (n: number | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? n : undefined;

export function useDefinirTipo({
  intimacaoId,
  prazo,
  onConfirmado,
}: UseDefinirTipoParams) {
  const api = useApi();
  const qc = useQueryClient();

  const form = useForm<DefinirTipoForm>({
    resolver: zodResolver(definirTipoSchema),
    mode: "onChange",
    defaultValues: {
      tipo_ato: prazo?.tipo_ato?.toLowerCase() ?? "",
      days: prazo && prazo.status !== "NO_DEADLINE" ? prazo.days : undefined,
      counting: prazo?.counting ?? "BUSINESS",
    },
  });
  const values = useWatch({ control: form.control });
  const tipo = values.tipo_ato ?? "";
  const days = values.days;
  const counting = values.counting ?? "BUSINESS";

  const tipoValido = TIPOS_COM_PRAZO.some(([t]) => t === tipo);
  const diasValidos = (days ?? 0) >= 1;
  const podePrever = tipoValido && diasValidos;

  const calc = JSON.stringify({ tipo, days: digits(days), counting });
  const debounced = useDebounce(calc, 300);

  // Preview ao vivo do vencimento (mesmo endpoint da confirmação) — não persiste.
  const preview = useQuery({
    queryKey: ["prazos", "preview", intimacaoId, debounced],
    queryFn: () => {
      const { tipo: t, days: d, counting: c } = JSON.parse(debounced);
      return previewPrazo(api, {
        intimation_id: intimacaoId,
        tipo_ato: t,
        days: d,
        counting: c,
        anchor_event: prazo?.anchor_event ?? "DEADLINE_START",
        doubled: prazo?.doubled ?? false,
        manual_extra_days: prazo?.manual_extra_days ?? 0,
      });
    },
    enabled: podePrever,
    retry: false,
    staleTime: 30_000,
  });

  const invalidarTudo = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["prazos"] }),
      qc.invalidateQueries({ queryKey: intimacoesKeys.all }),
      qc.invalidateQueries({ queryKey: ["processos"] }),
      qc.invalidateQueries({ queryKey: ["action-items"] }),
      qc.invalidateQueries({ queryKey: ["preparation-actions"] }),
    ]);

  const confirmar = useMutation({
    mutationFn: () =>
      confirmarPrazo(api, {
        intimation_id: intimacaoId,
        deadline: {
          tipo_ato: tipo,
          days: days!,
          counting,
          doubled: prazo?.doubled ?? false,
          anchor_event: prazo?.anchor_event ?? "DEADLINE_START",
          manual_extra_days: prazo?.manual_extra_days ?? 0,
        },
      }),
    onSuccess: async () => {
      await invalidarTudo();
      toast.success("Tipo do ato definido.");
      onConfirmado?.();
    },
    onError: () => toast.error("Não foi possível salvar. Tente novamente."),
  });

  const semPrazo = useMutation({
    mutationFn: () => {
      if (!prazo?.id) throw new Error("sem prazo para declarar ciência");
      return noDeadlinePrazo(api, prazo.id);
    },
    onSuccess: async () => {
      await invalidarTudo();
      toast.success("Registrado como ciência — sem prazo.");
      onConfirmado?.();
    },
    onError: () => toast.error("Não foi possível salvar. Tente novamente."),
  });

  const emVoo = confirmar.isPending || semPrazo.isPending;
  const previewOk =
    calc === debounced && preview.isSuccess && !preview.isFetching;

  const options = useMemo(() => TIPOS_COM_PRAZO, []);

  const onConfirmar = form.handleSubmit(() => {
    if (!previewOk || emVoo) return;
    confirmar.mutate();
  });

  return {
    form,
    options,
    tipoValido,
    diasValidos,
    // preview
    previewPendente: podePrever && (calc !== debounced || preview.isFetching),
    previewErro: preview.isError && podePrever,
    preview: previewOk ? preview.data : undefined,
    onRetryPreview: () => void preview.refetch(),
    // ações
    onConfirmar,
    podeConfirmar: tipoValido && diasValidos && previewOk && !emVoo,
    onSemPrazo: () => semPrazo.mutate(),
    podeSemPrazo: !!prazo?.id && prazo.status !== "MISSED",
    emVoo,
    erro: confirmar.isError || semPrazo.isError,
  };
}
