"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { actionItemsKeys } from "@/features/action-items/hooks/use-action-items";
import {
  confirmarActionItem,
  getActionItem,
} from "@/features/action-items/services/action-items.service";
import { useApi } from "@/lib/api/use-api";

/** Read the full detail after confirmation: the POST response has fewer fields. */
export function useActionItemReview(id: string, enabled: boolean) {
  const api = useApi();
  const qc = useQueryClient();
  const confirming = useRef(false);
  const detail = useQuery({
    queryKey: actionItemsKeys.detail(id),
    queryFn: () => getActionItem(api, id),
    enabled: enabled && !!id,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const confirm = useMutation({
    mutationFn: async () => {
      await confirmarActionItem(api, id);
      return getActionItem(api, id);
    },
    onSuccess: async (item) => {
      qc.setQueryData(actionItemsKeys.detail(id), item);
      await Promise.all([
        qc.invalidateQueries({ queryKey: actionItemsKeys.lists() }),
        qc.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });
  async function confirmOnce() {
    if (confirming.current) return;
    confirming.current = true;
    try {
      return await confirm.mutateAsync();
    } finally {
      confirming.current = false;
    }
  }
  return { detail, confirm, confirmOnce };
}
