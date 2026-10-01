"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { type ApiFetcher, useApi } from "@/lib/api/use-api";

import { isUncertainCommandFailure } from "../../services/command-recovery";

export function useCurationWrite<Command, Receipt>(
  allowed: boolean,
  send: (api: ApiFetcher, command: Command) => Promise<Receipt>,
  invalidate: readonly string[],
) {
  const api = useApi(),
    client = useQueryClient(),
    busy = useRef(false),
    pending = useRef<Command | null>(null);
  const mutation = useMutation({
    mutationFn: (command: Command) => send(api, command),
    retry: false,
    onSuccess() {
      pending.current = null;
      void client.invalidateQueries({ queryKey: invalidate });
    },
    onError(error) {
      if (!isUncertainCommandFailure(error)) pending.current = null;
    },
  });
  async function execute(command: Command, recovery = false) {
    if (!allowed || busy.current || (pending.current && !recovery)) return;
    busy.current = true;
    const frozen = recovery ? pending.current! : structuredClone(command);
    pending.current = frozen;
    try {
      return await mutation.mutateAsync(frozen);
    } finally {
      busy.current = false;
    }
  }
  function run(command: Command) {
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
