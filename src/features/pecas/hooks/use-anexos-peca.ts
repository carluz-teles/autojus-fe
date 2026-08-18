"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  completeUpload,
  getDownloadUrl,
  putToStorage,
  startUpload,
} from "@/features/documentos/services/documentos.service";
import { useApi } from "@/lib/api/use-api";

import {
  attachDocumento,
  removeAnexo,
  updateAnexoCategoria,
} from "../services/pecas.service";
import type { AnexoCategoria, PecaAnexo } from "../types";

// ── Chave de query da peça (invalidada por todas as mutations) ───────────────
// Espelha o queryKey de use-peca.ts.
function pecaDetailKey(pecaId: string) {
  return ["pecas", "detail", pecaId] as const;
}

// ── Upload + vínculo (3 passos presigned + POST /anexos) ────────────────────

/**
 * Orquestra upload de ANEXO_PECA: passo 1 (POST /documentos) → passo 2 (PUT
 * direto no R2 com progresso) → passo 3 (POST /complete) → POST /pecas/:id/anexos.
 * Ao concluir invalida a query da peça para reidratar a lista de anexos.
 *
 * Limite 50MB e 0 bytes validado ANTES de chamar `enviarAnexo` — o caller
 * (componente) deve checar com `validarTamanhoAnexo` e não enfileirar o arquivo.
 */
export function useUploadAnexo(pecaId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);

  const mutation = useMutation<PecaAnexo, Error, File>({
    mutationFn: async (file) => {
      setProgress(0);
      // Passo 1: cria o documento PENDING (document_type = ANEXO_PECA).
      const started = await startUpload(fetcher, {
        document_type: "ANEXO_PECA",
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      // Passo 2: PUT direto no storage (progresso via XHR).
      await putToStorage(started.upload_url, file, setProgress);
      // Passo 3: confirma o upload.
      const doc = await completeUpload(fetcher, started.document_id);
      // Vincula à peça com categoria default "Outro".
      const res = await attachDocumento(fetcher, pecaId, {
        document_id: doc.id,
        category: "Outro",
      });
      return res.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: pecaDetailKey(pecaId) }),
    onSettled: () => setProgress(null),
  });

  return {
    enviarAnexo: mutation.mutate,
    isUploading: mutation.isPending,
    uploadError: mutation.error,
    progress,
    reset: mutation.reset,
  };
}

// ── Categorizar (otimista) ───────────────────────────────────────────────────

export function useCategorizarAnexo(pecaId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation<
    PecaAnexo,
    Error,
    { attachmentId: string; category: AnexoCategoria }
  >({
    mutationFn: async ({ attachmentId, category }) => {
      const res = await updateAnexoCategoria(fetcher, pecaId, attachmentId, {
        category,
      });
      return res.data;
    },
    onMutate: async ({ attachmentId, category }) => {
      // Atualização otimista: aplica a nova categoria antes da resposta do BE.
      await queryClient.cancelQueries({ queryKey: pecaDetailKey(pecaId) });
      const prev = queryClient.getQueryData(pecaDetailKey(pecaId));
      queryClient.setQueryData(
        pecaDetailKey(pecaId),
        (old: { attachments: PecaAnexo[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            attachments: old.attachments.map((a) =>
              a.id === attachmentId ? { ...a, category } : a,
            ),
          };
        },
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Reverte a atualização otimista em caso de erro.
      if (ctx && typeof ctx === "object" && "prev" in ctx) {
        queryClient.setQueryData(pecaDetailKey(pecaId), ctx.prev);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: pecaDetailKey(pecaId) }),
  });
}

// ── Remover ──────────────────────────────────────────────────────────────────

export function useRemoverAnexo(pecaId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (attachmentId) => removeAnexo(fetcher, pecaId, attachmentId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: pecaDetailKey(pecaId) }),
  });
}

// ── Pré-visualizar (presigned GET) ───────────────────────────────────────────

export function usePrevisualizarAnexo() {
  const fetcher = useApi();

  return useMutation<void, Error, string>({
    mutationFn: async (documentId) => {
      const res = await getDownloadUrl(fetcher, documentId);
      window.open(res.url, "_blank", "noopener,noreferrer");
    },
  });
}

// ── Validação de tamanho (50MB, > 0 bytes) ───────────────────────────────────

const MAX_BYTES = 52_428_800; // 50 MB

export type ValidacaoAnexo =
  { ok: true } | { ok: false; reason: "vazio" | "muito_grande" };

export function validarTamanhoAnexo(file: File): ValidacaoAnexo {
  if (file.size === 0) return { ok: false, reason: "vazio" };
  if (file.size > MAX_BYTES) return { ok: false, reason: "muito_grande" };
  return { ok: true };
}
