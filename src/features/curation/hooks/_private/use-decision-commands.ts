"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  type DecisionCommand,
  decisionKeys,
  postCriticalAlert,
  postDecision,
} from "../../services/annotation-decisions";
import { isUncertainCommandFailure } from "../../services/command-recovery";

export type DecisionWrite =
  | { action: "decision"; body: DecisionCommand }
  | { action: "alert"; body: { request_id: string; reason: string } };
export function useDecisionCommands(task: string) {
  const api = useApi(),
    client = useQueryClient(),
    busy = useRef(false),
    pending = useRef<DecisionWrite | null>(null);
  const mutation = useMutation({
    mutationFn: async (command: DecisionWrite) =>
      command.action === "decision"
        ? {
            action: "decision" as const,
            receipt: await postDecision(api, task, command.body),
          }
        : {
            action: "alert" as const,
            receipt: await postCriticalAlert(api, task, command.body),
          },
    retry: false,
    onSuccess(result) {
      pending.current = null;
      if (result.action === "decision")
        client.setQueryData(
          decisionKeys.receipt(result.receipt.id),
          result.receipt,
        );
      // Do not refresh comparison inputs behind an edited decision form.
      void client.invalidateQueries({
        queryKey: [...decisionKeys.all, "queue"],
      });
    },
    onError(error) {
      if (!isUncertainCommandFailure(error)) pending.current = null;
    },
  });
  async function execute(command: DecisionWrite, recovery = false) {
    if (busy.current || (pending.current && !recovery)) return;
    busy.current = true;
    const frozen = recovery ? pending.current! : structuredClone(command);
    pending.current = frozen;
    try {
      return await mutation.mutateAsync(frozen);
    } finally {
      busy.current = false;
    }
  }
  function run(command: DecisionWrite) {
    return execute(command);
  }
  function recover() {
    return pending.current
      ? execute(pending.current, true)
      : Promise.resolve(undefined);
  }
  return {
    mutation,
    run,
    recover,
    isBusy: () => busy.current,
    uncertain: mutation.isError && isUncertainCommandFailure(mutation.error),
  };
}
