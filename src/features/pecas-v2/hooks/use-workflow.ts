// Mutations dos steps do workflow (Fatia 2a): enviar-para-assinatura, voltar,
// assinar, marcar-protocolada. Todos invalidam o draft pra o router refetch e
// re-derivar o step atual (o page.tsx roteia por step).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";
import { draftKeys } from "./use-draft";

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
    mutationFn: (certificateId: string) =>
      svc.signPeca(fetcher, id, certificateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftKeys.detail(id) }),
  });
}

export function useFilePeca(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filingNumber: string) =>
      svc.filePeca(fetcher, id, filingNumber),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftKeys.detail(id) }),
  });
}

// ── Protocolo automático (Fatia 1 — e-SAJ) ──────────────────────────────────

const filingStatusKey = (id: string) => ["pecas-v2", id, "filing"] as const;

/** Aprova o protocolo automático — POST /v1/pecas/:id/filing/approve. NUNCA
 *  dispara sozinho, exige o clique explícito. Invalida o status pra o
 *  polling (useFilingStatus) pegar o ENFILEIRADO imediatamente. */
export function useApproveFiling(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.approveFiling(fetcher, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: filingStatusKey(id) }),
  });
}

/** Status da tentativa de protocolo automático — GET /v1/pecas/:id/filing.
 *  Faz polling curto enquanto a tentativa está ativa (ENFILEIRADO/
 *  PROTOCOLANDO); para sozinho ao chegar num estado terminal
 *  (PROTOCOLADO/FALHOU) ou quando nunca foi solicitado (null). */
export function useFilingStatus(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: filingStatusKey(id),
    queryFn: () => svc.getFilingStatus(fetcher, id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const ativo = status === "ENFILEIRADO" || status === "PROTOCOLANDO";
      return ativo ? 3000 : false;
    },
  });
}

/** Autosave do editor rico (Fase B) — grava HTML do Tiptap. Não invalida
 *  o cache (autosave é frequente; o cache mais recente já é o do próprio
 *  editor). O refetch acontece só quando o usuário sai da tela ou muda
 *  de step. */
export function useSaveContentHtml(id: string) {
  const fetcher = useApi();
  return useMutation({
    mutationFn: (html: string) => svc.saveContentHtml(fetcher, id, html),
  });
}
