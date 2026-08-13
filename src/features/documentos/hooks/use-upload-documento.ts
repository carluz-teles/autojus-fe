"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  completeUpload,
  putToStorage,
  startUpload,
} from "../services/documentos.service";
import type { DocumentView } from "../types";

/**
 * Sub-hook `_private`: orquestra os 3 passos do upload presigned (pede URL → PUT direto
 * no R2 → confirma) numa única mutation. O progresso do PUT fica em estado local efêmero
 * (UI, permitido pelo CLAUDE.md — não é server state). `court_record_id` = processoId (a
 * aba do processo). No sucesso invalida a lista para reidratar do BE.
 */
export function useUploadDocumento(processoId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);

  const mutation = useMutation<DocumentView, Error, File>({
    mutationFn: async (file) => {
      setProgress(0);
      const started = await startUpload(fetcher, {
        court_record_id: processoId,
        // v0: tipo genérico; a classificação por tipo de peça chega em fatia posterior.
        document_type: "GENERIC",
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      await putToStorage(started.upload_url, file, setProgress);
      return completeUpload(fetcher, started.document_id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["documentos", "processo", processoId],
      }),
    onSettled: () => setProgress(null),
  });

  return {
    enviar: mutation.mutate,
    isUploading: mutation.isPending,
    uploadError: mutation.error,
    progress,
  };
}
