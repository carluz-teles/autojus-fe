"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { putToStorage } from "@/features/documentos/services/documentos.service";
import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import {
  createLetterhead,
  deleteLetterhead,
  getLetterhead,
  listLetterheads,
  setDefaultLetterhead,
  startLetterheadUpload,
  updateLetterhead,
} from "../services/letterhead.service";
import type {
  LetterheadContentType,
  LetterheadMargins,
  LetterheadView,
  UpdateLetterheadInput,
} from "../types";

// Chaves de query centralizadas para invalidação consistente (padrão processosKeys).
const letterheadKeys = {
  all: ["letterheads"] as const,
  list: () => [...letterheadKeys.all, "list"] as const,
  detail: (id: string) => [...letterheadKeys.all, "detail", id] as const,
};

/** Traduz o ApiError tipado do BE numa mensagem PT-BR de topo (toast/inline). */
function letterheadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409)
      return "Os bytes do arquivo não chegaram ao storage. Tente enviar novamente.";
    if (error.kind === "VALIDATION" || error.status === 400)
      return error.message || "Arquivo ou margens inválidos.";
    if (error.status === 503)
      return "Storage indisponível no momento. Tente novamente em instantes.";
    return error.message;
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

/** Lista de papéis timbrados — GET /v1/letterheads. */
export function useLetterheads() {
  const fetcher = useApi();
  return useQuery({
    queryKey: letterheadKeys.list(),
    queryFn: () => listLetterheads(fetcher),
    select: (envelope) => envelope.data,
  });
}

/** Detalhe (com `asset_url` p/ preview) — GET /v1/letterheads/:id. Só quando habilitado. */
export function useLetterhead(id: string | null) {
  const fetcher = useApi();
  return useQuery({
    queryKey: letterheadKeys.detail(id ?? ""),
    queryFn: () => getLetterhead(fetcher, id as string),
    enabled: !!id,
  });
}

/** Entrada da criação: o arquivo + metadados. O tipo sai do próprio File. */
export interface CreateLetterheadVars {
  file: File;
  name: string;
  margins: LetterheadMargins;
  is_default: boolean;
}

/**
 * Sub-hook `_private`: orquestra os 3 passos do upload presigned (pede URL → PUT direto
 * no storage → confirma+cria) numa única mutation. O progresso do PUT fica em estado local
 * efêmero (UI, permitido pelo CLAUDE.md). No sucesso invalida a lista para reidratar do BE.
 */
export function useCreateLetterhead() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);

  const mutation = useMutation<LetterheadView, Error, CreateLetterheadVars>({
    mutationFn: async ({ file, name, margins, is_default }) => {
      setProgress(0);
      const content_type = file.type as LetterheadContentType;
      const started = await startLetterheadUpload(fetcher, {
        content_type,
        file_name: file.name,
      });
      await putToStorage(started.upload_url, file, setProgress);
      return createLetterhead(fetcher, {
        name,
        asset_key: started.asset_key,
        content_type,
        margins,
        is_default,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterheadKeys.list() });
      toast.success("Papel timbrado salvo.");
    },
    onError: (error) => toast.error(letterheadErrorMessage(error)),
    onSettled: () => setProgress(null),
  });

  return {
    salvar: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
    progress,
  };
}

/** Renomeia / ajusta margens — PATCH /v1/letterheads/:id. */
export function useUpdateLetterhead(id: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLetterheadInput) =>
      updateLetterhead(fetcher, id, body),
    onSuccess: (letterhead) => {
      queryClient.setQueryData(letterheadKeys.detail(id), letterhead);
      queryClient.invalidateQueries({ queryKey: letterheadKeys.list() });
      toast.success("Papel timbrado atualizado.");
    },
    onError: (error) => toast.error(letterheadErrorMessage(error)),
  });
}

/** Define como padrão — PATCH /v1/letterheads/:id/default. */
export function useSetDefaultLetterhead() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setDefaultLetterhead(fetcher, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterheadKeys.list() });
      toast.success("Timbrado padrão definido.");
    },
    onError: (error) => toast.error(letterheadErrorMessage(error)),
  });
}

/** Exclui — DELETE /v1/letterheads/:id. */
export function useDeleteLetterhead() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLetterhead(fetcher, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterheadKeys.list() });
      toast.success("Papel timbrado excluído.");
    },
    onError: (error) => toast.error(letterheadErrorMessage(error)),
  });
}
