"use client";

// Anexos da peça — orquestra o upload em 3 passos (presigned URL → PUT S3 →
// complete) do slice document + o vínculo peça↔documento (POST /pecas/:id/anexos)
// com a categoria escolhida (Procuração, Comprovante etc). Remover retira só o
// vínculo — o documento em si continua vivo (owned pelo slice document).

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  completeUpload,
  putToStorage,
  startUpload,
} from "@/features/documentos/services/documentos.service";
import { useApi } from "@/lib/api/use-api";

import {
  attachDocument,
  ATTACHMENT_CATEGORIES,
  type AttachmentCategory,
  removeAttachment,
} from "../services/pecas-v2.service";
import { draftKeys } from "./use-draft";

export { ATTACHMENT_CATEGORIES, type AttachmentCategory };

interface AttachInput {
  file: File;
  category: AttachmentCategory;
  courtRecordId: string;
}

export function useAttachDocument(draftId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);
  const mutation = useMutation({
    mutationFn: async ({ file, category, courtRecordId }: AttachInput) => {
      setProgress(0);
      // 1) presigned URL
      const started = await startUpload(fetcher, {
        court_record_id: courtRecordId,
        document_type: "GENERIC",
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      // 2) PUT direto no S3
      await putToStorage(started.upload_url, file, setProgress);
      // 3) confirma documento
      const doc = await completeUpload(fetcher, started.document_id);
      // 4) vincula à peça com a categoria escolhida
      await attachDocument(fetcher, draftId, doc.id, category);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: draftKeys.detail(draftId) });
    },
    onSettled: () => setProgress(null),
  });
  return {
    upload: mutation.mutate,
    isUploading: mutation.isPending,
    uploadError: mutation.error,
    progress,
  };
}

export function useRemoveAttachment(draftId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      removeAttachment(fetcher, draftId, attachmentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: draftKeys.detail(draftId) }),
  });
}
