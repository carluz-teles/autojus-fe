"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  completeUpload,
  getDownloadUrl,
  putToStorage,
  startUpload,
} from "@/features/documentos/services/documentos.service";
import { useApi } from "@/lib/api/use-api";

import {
  attachDocument,
  criarPeca,
  type CriarPecaParams,
  exportPeca,
  filePeca,
  type FilePecaParams,
  generatePeca,
  getChatThread,
  getPeca,
  getTheses,
  getThesesFromIntimation,
  listPecas,
  listPecasByProcesso,
  type ListPecasParams,
  removeAttachment,
  salvarRascunho,
  sendChatMessage,
  signPeca,
  triggerReview,
  updateAttachmentCategory,
  updateResult,
} from "../services/pecas.service";
import type {
  AttachmentCategory,
  GeneratePecaBody,
  PecaAttachment,
  PecaDetail,
  PecaReviewResult,
  ThesesResponse,
} from "../types";

// Chaves de query da feature Peça, centralizadas para invalidação consistente.
export const pecasKeys = {
  all: ["pecas"] as const,
  detail: (id: string) => [...pecasKeys.all, "detail", id] as const,
  list: (filters?: ListPecasParams) =>
    [...pecasKeys.all, "list", filters ?? {}] as const,
  byProcess: (processoId: string) =>
    [...pecasKeys.all, "by-process", processoId] as const,
  chat: (id: string) => [...pecasKeys.all, "chat", id] as const,
};

/** Detalhe da peça — GET /v1/pecas/:id (rascunho + contexto). */
export function usePeca(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: pecasKeys.detail(id),
    queryFn: () => getPeca(fetcher, id),
    enabled: !!id,
  });
}

const AUTOSAVE_DELAY_MS = 1200;

/**
 * Autosave do rascunho — PATCH /v1/pecas/:id com debounce. A peça expõe:
 *   • save(content)  — agenda um autosave; chamadas rápidas em sequência coalescem
 *                      numa só request após AUTOSAVE_DELAY_MS de silêncio;
 *   • saveNow()      — força o flush imediato (ex.: sair da tela / blur);
 *   • isSaving       — request em voo (para o rótulo "Salvando…");
 *   • lastSavedAt    — timestamp do último autosave bem-sucedido (para "salvo há …").
 *
 * Não faz optimistic update do editor (o editable é a fonte de verdade do texto
 * enquanto o usuário digita) — só reconcilia o updated_at no cache no sucesso.
 */
export function useSalvarRascunho(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: (content: string) => salvarRascunho(fetcher, id, content),
    onSuccess: (res) => {
      setLastSavedAt(new Date(res.updated_at));
      // Reconcilia só o updated_at no cache; o content vivo é do editor.
      qc.setQueryData(pecasKeys.detail(id), (prev: unknown) =>
        prev && typeof prev === "object"
          ? { ...prev, updated_at: res.updated_at, title: res.title }
          : prev,
      );
    },
  });

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const content = pending.current;
    if (content !== null) {
      pending.current = null;
      mutation.mutate(content);
    }
  }, [mutation]);

  const save = useCallback(
    (content: string) => {
      pending.current = content;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  // Flush pendente ao desmontar (troca de peça / navegação) para não perder texto.
  useEffect(
    () =>
      function cleanup() {
        if (timer.current) clearTimeout(timer.current);
        if (pending.current !== null) {
          salvarRascunho(fetcher, id, pending.current).catch(() => {
            // best-effort no unmount; o próximo load reflete o último salvo.
          });
        }
      },
    [fetcher, id],
  );

  return {
    save,
    saveNow: flush,
    isSaving: mutation.isPending,
    lastSavedAt,
    error: mutation.error,
  };
}

/** Cria (ou reaproveita, idempotente por intimação) um rascunho — POST /v1/pecas. */
export function useCriarPeca() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CriarPecaParams) => criarPeca(fetcher, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: pecasKeys.all }),
  });
}

// ── Fatia 4: peticionamento hooks ────────────────────────────────────────────

/** Lista peças do tenant com filtros — GET /v1/pecas (infinite query). */
export function usePecas(filters?: ListPecasParams) {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: pecasKeys.list(filters),
    queryFn: ({ pageParam }) =>
      listPecas(fetcher, { ...filters, cursor: pageParam || undefined }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
  });

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    items,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}

/** Lista peças de um processo — GET /v1/processos/:id/pecas (infinite query). */
export function usePecasByProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: pecasKeys.byProcess(processoId),
    queryFn: ({ pageParam }) =>
      listPecasByProcesso(fetcher, {
        processoId,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    enabled: !!processoId,
  });

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    items,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}

/** Assina a peça — POST /v1/pecas/:id/sign. Invalida detail e listas. */
export function useSignPeca() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => signPeca(fetcher, id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: pecasKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pecasKeys.all });
    },
  });
}

/** Protocola a peça — POST /v1/pecas/:id/file. Invalida detail e listas. */
export function useFilePeca() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params?: FilePecaParams }) =>
      filePeca(fetcher, id, params),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: pecasKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pecasKeys.all });
    },
  });
}

/** Registra resultado — PATCH /v1/pecas/:id/result. Invalida detail e listas. */
export function useUpdateResult() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      observedResult,
    }: {
      id: string;
      observedResult: string;
    }) => updateResult(fetcher, id, observedResult),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: pecasKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pecasKeys.all });
    },
  });
}

/** Exporta a peça — GET /v1/pecas/:id/export. Retorna URL presigned. */
export function useExportPeca() {
  const fetcher = useApi();
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format?: "docx" | "pdf" }) =>
      exportPeca(fetcher, id, format),
  });
}

/** Gera peça via IA — POST /v1/pecas/:id/generate com body opcional.
 *  Chamadas existentes que só passam `id` continuam funcionando (body padrão {}). */
export function useGerarPeca() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body = {} }: { id: string; body?: GeneratePecaBody }) =>
      generatePeca(fetcher, id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: pecasKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pecasKeys.all });
    },
  });
}

/** Sugere teses via IA — POST /v1/pecas/:id/theses (dispara ao montar). */
export function useTheses(id: string) {
  const fetcher = useApi();
  return useQuery<ThesesResponse, Error>({
    queryKey: [...pecasKeys.all, "theses", id] as const,
    queryFn: () => getTheses(fetcher, id),
    enabled: !!id,
    // Não refetch automático — o resultado é estável por sessão.
    staleTime: Infinity,
    retry: 1,
  });
}

/** Variante da /pecas/nova: sugere teses direto da intimação (POST /v1/theses),
 *  sem exigir draft ainda. Usado só na Partida ephemeral. */
export function useThesesFromIntimation(
  intimationId: string,
  pieceType: string,
) {
  const fetcher = useApi();
  return useQuery<ThesesResponse, Error>({
    queryKey: [
      ...pecasKeys.all,
      "theses-intimation",
      intimationId,
      pieceType,
    ] as const,
    queryFn: () =>
      getThesesFromIntimation(fetcher, {
        intimation_id: intimationId,
        piece_type: pieceType,
      }),
    enabled: !!intimationId && !!pieceType,
    staleTime: Infinity,
    retry: 1,
  });
}

// ── Fatia 3: revisão IA + chat ──────────────────────────────────────────────

/** Dispara revisão IA — POST /v1/pecas/:id/review. Invalida detail para refletir review. */
export function useReview(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => triggerReview(fetcher, id),
    onSuccess: (data: PecaReviewResult) => {
      qc.setQueryData(pecasKeys.detail(id), (prev: unknown) =>
        prev && typeof prev === "object"
          ? { ...prev, review: data.review, saga_state: data.saga_state }
          : prev,
      );
    },
  });
}

/** Thread de chat da peça — GET /v1/pecas/:id/chat. */
export function useChatThread(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: pecasKeys.chat(id),
    queryFn: () => getChatThread(fetcher, id),
    enabled: !!id,
  });
}

/** Envia mensagem no chat — POST /v1/pecas/:id/chat. Invalida thread para refletir a resposta. */
export function useSendChat(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (question: string) => sendChatMessage(fetcher, id, question),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pecasKeys.chat(id) });
    },
  });
}

// ── Fatia 2: anexos ──────────────────────────────────────────────────────────

const MAX_ATTACHMENT_BYTES = 52_428_800; // 50 MB

export type AttachmentValidation =
  { ok: true } | { ok: false; reason: "vazio" | "muito_grande" };

/** Valida o arquivo ANTES do POST — 0 bytes e o teto de 50MB são checados no FE. */
export function validateAttachmentSize(file: File): AttachmentValidation {
  if (file.size === 0) return { ok: false, reason: "vazio" };
  if (file.size > MAX_ATTACHMENT_BYTES)
    return { ok: false, reason: "muito_grande" };
  return { ok: true };
}

/**
 * Orquestra upload de ANEXO_PECA: passo 1 (POST /documentos) → passo 2 (PUT direto
 * no storage, com progresso) → passo 3 (POST /complete) → POST /pecas/:id/anexos.
 * Invalida o detail da peça ao concluir para reidratar attachments[].
 */
export function useUploadAttachment(pecaId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);

  const mutation = useMutation<PecaAttachment, Error, File>({
    mutationFn: async (file) => {
      setProgress(0);
      const started = await startUpload(fetcher, {
        document_type: "ANEXO_PECA",
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      await putToStorage(started.upload_url, file, setProgress);
      const doc = await completeUpload(fetcher, started.document_id);
      return attachDocument(fetcher, pecaId, {
        document_id: doc.id,
        category: "Outro",
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: pecasKeys.detail(pecaId) }),
    onSettled: () => setProgress(null),
  });

  return {
    uploadAttachment: mutation.mutate,
    isUploading: mutation.isPending,
    uploadError: mutation.error,
    progress,
  };
}

/** Categoriza um anexo (otimista) — PATCH /v1/pecas/:id/anexos/:attachmentId. */
export function useUpdateAttachmentCategory(pecaId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();

  return useMutation<
    PecaAttachment,
    Error,
    { attachmentId: string; category: AttachmentCategory },
    { prev: PecaDetail | undefined }
  >({
    mutationFn: ({ attachmentId, category }) =>
      updateAttachmentCategory(fetcher, pecaId, attachmentId, { category }),
    onMutate: async ({ attachmentId, category }) => {
      await qc.cancelQueries({ queryKey: pecasKeys.detail(pecaId) });
      const prev = qc.getQueryData<PecaDetail>(pecasKeys.detail(pecaId));
      qc.setQueryData<PecaDetail>(pecasKeys.detail(pecaId), (old) =>
        old
          ? {
              ...old,
              attachments: old.attachments.map((a) =>
                a.id === attachmentId ? { ...a, category } : a,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(pecasKeys.detail(pecaId), ctx.prev);
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: pecasKeys.detail(pecaId) }),
  });
}

/** Remove o vínculo do anexo — DELETE /v1/pecas/:id/anexos/:attachmentId. */
export function useRemoveAttachment(pecaId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (attachmentId) =>
      removeAttachment(fetcher, pecaId, attachmentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: pecasKeys.detail(pecaId) }),
  });
}

/** Pré-visualiza um anexo — GET /v1/documentos/:id/download (presigned) numa nova aba. */
export function usePreviewAttachment() {
  const fetcher = useApi();
  return useMutation<void, Error, string>({
    mutationFn: async (documentId) => {
      const res = await getDownloadUrl(fetcher, documentId);
      window.open(res.url, "_blank", "noopener,noreferrer");
    },
  });
}
