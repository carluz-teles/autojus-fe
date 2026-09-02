"use client";

// Busca os BYTES do PDF de um documento (GET /v1/documentos/:id/raw, autenticado)
// e devolve o Blob — o viewer (pdf.js) lê os bytes e renderiza em canvas, sem
// depender do plugin nativo de PDF do browser (que muitos Chrome desabilitam /
// trocam por "baixar"). O token vai no header (via useApiBlob), nunca na URL.
// `null` de documentId = ocioso (drawer fechado): não busca nada.

import { useEffect, useState } from "react";

import { useApiBlob } from "@/lib/api/use-api";

interface DocumentFileState {
  blob: Blob | null;
  loading: boolean;
  error: boolean;
}

export function useDocumentFile(documentId: string | null): DocumentFileState {
  const fetchBlob = useApiBlob();
  const [state, setState] = useState<DocumentFileState>({
    blob: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    if (!documentId) {
      setState({ blob: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState({ blob: null, loading: true, error: false });

    fetchBlob(`/v1/documentos/${documentId}/raw`)
      .then((blob) => {
        if (cancelled) return;
        setState({ blob, loading: false, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ blob: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, fetchBlob]);

  return state;
}
