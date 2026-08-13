"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { deleteDocumento } from "../services/documentos.service";

/**
 * Sub-hook `_private`: exclusão soft de um documento (só UPLOAD — o BE rejeita COURT com
 * 409). No sucesso invalida a lista do processo para o item sumir do dado persistido.
 */
export function useExcluirDocumento(processoId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteDocumento(fetcher, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["documentos", "processo", processoId],
      }),
  });
}
