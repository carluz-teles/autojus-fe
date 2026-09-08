"use client";

import { useQuery } from "@tanstack/react-query";

import { useApiBlob } from "@/lib/api/use-api";

/** O original é buscado com autenticação no header, sem expor tokens na URL. */
export function useDocumentFile(documentId: string | null) {
  const fetchBlob = useApiBlob();
  const query = useQuery({
    queryKey: ["documentos", "original", documentId],
    queryFn: () => fetchBlob(`/v1/documentos/${documentId}/raw`),
    enabled: !!documentId,
    staleTime: 60_000,
    gcTime: 60_000,
    retry: 1,
  });
  return {
    blob: documentId ? (query.data ?? null) : null,
    loading: !!documentId && query.isFetching,
    error: query.isError,
    retry: query.refetch,
  };
}
