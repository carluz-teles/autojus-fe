"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useApi } from "@/lib/api/use-api";

import { retainFeedbackCommand } from "../../services/failures";
import { type FeedbackCommand, sendFeedback } from "../../services/feedback";

export function useFeedbackWrite(
  result: string,
  refresh: () => Promise<unknown>,
) {
  const api = useApi();
  const busy = useRef(false),
    pending = useRef<FeedbackCommand | null>(null),
    controller = useRef<AbortController | null>(null),
    mounted = useRef(true),
    failedAt = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      pending.current = null;
    };
  }, []);
  const mutation = useMutation({
    mutationFn: (command: FeedbackCommand) =>
      sendFeedback(api, result, command, controller.current?.signal),
    retry: false,
    gcTime: 0,
    async onSuccess() {
      if (!mounted.current) return;
      pending.current = null;
      // A replay confirms its original revision, which may no longer be current.
      // Always re-read instead of painting the historical receipt as current.
      await refresh();
    },
    async onError(error) {
      if (!mounted.current) return;
      failedAt.current = Date.now();
      if (!retainFeedbackCommand(error)) pending.current = null;
      if (!retainFeedbackCommand(error)) await refresh();
    },
  });
  async function execute(command?: FeedbackCommand) {
    if (!mounted.current || busy.current || (command && pending.current))
      return;
    const frozen = command ? structuredClone(command) : pending.current;
    if (!frozen) return;
    busy.current = true;
    pending.current = frozen;
    controller.current = new AbortController();
    try {
      const receipt = await mutation.mutateAsync(frozen);
      return mounted.current ? receipt : undefined;
    } catch {
      /* Inline recovery owns the failure. */
    } finally {
      busy.current = false;
      controller.current = null;
    }
  }
  return {
    mutation,
    execute,
    hasPending: () => pending.current !== null,
    failedAt: () => failedAt.current,
  };
}
