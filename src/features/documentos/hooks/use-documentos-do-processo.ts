"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listDocumentosByProcesso } from "../services/documentos.service";
import type { DocumentView } from "../types";
import { useBaixarDocumento } from "./use-baixar-documento";
import { useExcluirDocumento } from "./use-excluir-documento";
import { useUploadDocumento } from "./use-upload-documento";

// Status intermediários da saga (entre UPLOADED e READY): enquanto houver documento
// nesses estados, a aba está "processando…" e vale repolling.
const PROCESSING: ReadonlySet<DocumentView["status"]> = new Set([
  "UPLOADED",
  "EXTRACTING",
  "EXTRACTED",
  "CHUNKED",
]);

/**
 * Hook público da aba Documentos — leitura via React Query + as ações (upload, baixar,
 * excluir) compostas de sub-hooks `_private` (um por responsabilidade). O componente só
 * chama este. Paginado por cursor para manter todos os autos acessíveis.
 *
 * O polling se auto-desliga (CLAUDE.md): só refetcha enquanto algum doc está em extração/
 * indexação, incluindo a espera pelo worker após o upload.
 */
export function useDocumentosDoProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: ["documentos", "processo", processoId],
    queryFn: ({ pageParam }) =>
      listDocumentosByProcesso(fetcher, {
        processoId,
        limit: 30,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (page) => page.page.next_cursor,
    enabled: !!processoId,
    refetchInterval: (q) => {
      const docs = q.state.data?.pages.flatMap((p) => p.data) ?? [];
      return docs.some((d) => PROCESSING.has(d.status)) ? 4000 : false;
    },
  });

  const upload = useUploadDocumento(processoId);
  const excluir = useExcluirDocumento(processoId);
  const baixar = useBaixarDocumento();

  const documentos = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    documentos,
    isEmpty: documentos.length === 0,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    upload,
    excluir,
    baixar,
  };
}
