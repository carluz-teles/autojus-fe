"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listDocumentosByProcesso } from "../services/documentos.service";
import type { DocumentView } from "../types";
import { useBaixarDocumento } from "./use-baixar-documento";
import { useExcluirDocumento } from "./use-excluir-documento";
import { useUploadDocumento } from "./use-upload-documento";

// Status intermediários da saga (entre UPLOADED e READY): enquanto houver documento
// nesses estados, a aba está "processando…" e vale repolling.
const PROCESSING: ReadonlySet<DocumentView["status"]> = new Set([
  "EXTRACTING",
  "EXTRACTED",
  "CHUNKED",
]);

/**
 * Hook público da aba Documentos — leitura via React Query + as ações (upload, baixar,
 * excluir) compostas de sub-hooks `_private` (um por responsabilidade). O componente só
 * chama este. Sem paginação (o conjunto do processo cabe na aba, como em prazos).
 *
 * O polling se auto-desliga (CLAUDE.md): só refetcha enquanto algum doc está em extração/
 * indexação. Na Fatia 1 o doc para em UPLOADED (sem pipeline), então fica inerte; acende
 * sozinho quando o Bloco C (extração/embeddings) entrar.
 */
export function useDocumentosDoProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["documentos", "processo", processoId],
    queryFn: () =>
      listDocumentosByProcesso(fetcher, { processoId, limit: 100 }),
    enabled: !!processoId,
    refetchInterval: (q) => {
      const docs = q.state.data?.data ?? [];
      return docs.some((d) => PROCESSING.has(d.status)) ? 4000 : false;
    },
  });

  const upload = useUploadDocumento(processoId);
  const excluir = useExcluirDocumento(processoId);
  const baixar = useBaixarDocumento();

  const documentos = query.data?.data ?? [];

  return {
    documentos,
    isEmpty: documentos.length === 0,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    upload,
    excluir,
    baixar,
  };
}
