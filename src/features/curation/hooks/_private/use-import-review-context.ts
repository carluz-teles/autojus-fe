"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getImportMatters,
  getImportPrivacyPolicy,
} from "../../services/import-admission";
import { getImport } from "../../services/imports";

export function useImportReviewContext(
  batchId: string,
  itemId: string,
  enabled: boolean,
) {
  const api = useApi();
  const query = useQuery({
    queryKey: ["curation", "import-review", batchId, itemId],
    enabled,
    retry: false,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const [batch, policy, matters] = await Promise.all([
        getImport(api, batchId, signal),
        getImportPrivacyPolicy(api, signal),
        getImportMatters(api, signal),
      ]);
      const item = batch.items.find((candidate) => candidate.id === itemId);
      if (!item) throw new Error("Item não encontrado neste lote.");
      return { batch, item, policy, matters };
    },
  });
  function refresh() {
    void query.refetch();
  }
  return { query, refresh };
}
