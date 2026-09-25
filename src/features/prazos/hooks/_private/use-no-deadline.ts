"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { intimacoesKeys } from "@/features/intimacoes/hooks/use-intimacoes";
import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import { noDeadlinePrazo } from "../../services/prazos.service";
import type { PrazoDetalheView } from "../../types";

export function useNoDeadlinePrazo(
  prazo: PrazoDetalheView | null,
  onConfirmado?: () => void,
) {
  const api = useApi();
  const qc = useQueryClient();
  const podeDeclarar = !!prazo && ["OPEN", "PENDING"].includes(prazo.status);
  const mutation = useMutation({
    mutationFn: () => {
      if (!prazo || !podeDeclarar) throw new Error("Revisão indisponível");
      return noDeadlinePrazo(api, prazo.id, prazo.review_revision);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["prazos"] }),
        qc.invalidateQueries({ queryKey: intimacoesKeys.all }),
        qc.invalidateQueries({ queryKey: ["processos"] }),
        qc.invalidateQueries({ queryKey: ["action-items"] }),
        qc.invalidateQueries({ queryKey: ["preparation-actions"] }),
      ]);
      toast.success("Ausência de prazo registrada.");
      onConfirmado?.();
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409)
        await qc.invalidateQueries({
          queryKey: ["prazos", "detail", prazo?.id],
        });
    },
  });
  return {
    podeDeclarar,
    declarar: () => mutation.mutate(),
    emVoo: mutation.isPending,
    erro: mutation.error,
    staleError:
      mutation.error instanceof ApiError && mutation.error.status === 409,
  };
}
