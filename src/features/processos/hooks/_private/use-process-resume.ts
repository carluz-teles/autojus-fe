"use client";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useApi } from "@/lib/api/use-api";

import { getResumo } from "../../services/resumo";

export function useProcessResumeRequest(id: string) {
  const api = useApi();
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const mutation = useMutation({
    mutationFn: (signal: AbortSignal) => getResumo(api, id, signal),
    retry: false,
    gcTime: 0,
    networkMode: "always",
  });
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  async function load() {
    if (busy.current) return;
    busy.current = true;
    controller.current = new AbortController();
    try {
      await mutation.mutateAsync(controller.current.signal);
    } catch {
      /* Keep error visible; never repeat a potentially generating GET automatically. */
    } finally {
      busy.current = false;
    }
  }
  return {
    load,
    pending: mutation.isPending,
    error: mutation.isError,
    result: mutation.isSuccess ? mutation.data : null,
  };
}
