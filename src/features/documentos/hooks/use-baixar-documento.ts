"use client";

import { useMutation } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getDownloadUrl } from "../services/documentos.service";
import type { DownloadUrlResult } from "../types";

/**
 * Sub-hook `_private`: pede o presigned GET (TTL curto) e abre o documento numa nova aba.
 * Não é cache-ável (a URL expira), por isso mutation e não query. `mutate(id)` para baixar.
 */
export function useBaixarDocumento() {
  const fetcher = useApi();

  return useMutation<DownloadUrlResult, Error, string>({
    mutationFn: (id) => getDownloadUrl(fetcher, id),
    onSuccess: (res) => window.open(res.url, "_blank", "noopener,noreferrer"),
  });
}
