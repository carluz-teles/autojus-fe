// Mutations dos steps do workflow (Fatia 2a): enviar-para-assinatura, voltar,
// assinar, marcar-protocolada. Todos invalidam o draft pra o router refetch e
// re-derivar o step atual (o page.tsx roteia por step).

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { draftKeys } from "./use-draft";
import * as svc from "../services/pecas-v2.service";

export function useSendToSigning(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.sendToSigning(fetcher, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftKeys.detail(id) }),
  });
}

export function useRevertToConstruction(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.revertToConstruction(fetcher, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftKeys.detail(id) }),
  });
}

export function useSignPeca(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certificateId: string) => svc.signPeca(fetcher, id, certificateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftKeys.detail(id) }),
  });
}

export function useFilePeca(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filingNumber: string) => svc.filePeca(fetcher, id, filingNumber),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftKeys.detail(id) }),
  });
}
