"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { type ApiFetcher, useApi } from "@/lib/api/use-api";

import { goldError } from "../../services/annotation-gold";
import {
  comparisonKeys,
  createComparison,
  type CreateComparisonCommand,
  getComparisonMetadata,
  issueComparison,
  type IssueComparisonCommand,
} from "../../services/comparisons";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";

type Command =
  | { kind: "create"; command: CreateComparisonCommand }
  | { kind: "issue"; command: IssueComparisonCommand };
function send(api: ApiFetcher, c: Command) {
  return c.kind === "create"
    ? createComparison(api, c.command)
    : issueComparison(api, c.command);
}
export type ComparisonProtection = { dirty?: boolean; locked?: boolean };
export function useComparisonActions(
  allowed: boolean,
  id?: string,
  protection: ComparisonProtection = {},
) {
  const api = useApi();
  const write = useCurationWrite(allowed, send, comparisonKeys.all);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const receipt = write.mutation.data;
  const target = id ?? receipt?.document.id ?? "";
  const metadata = useQuery({
    queryKey: comparisonKeys.metadata(target),
    queryFn: ({ signal }) => getComparisonMetadata(api, target, signal),
    enabled: allowed && !!target,
    retry: false,
  });
  const locked =
    !allowed ||
    write.mutation.isPending ||
    write.uncertain ||
    !!protection.locked;
  const metadataReady =
    allowed &&
    metadata.isSuccess &&
    !metadata.isFetching &&
    metadata.data.eligible;
  const delivery =
    metadataReady &&
    write.mutation.isSuccess &&
    receipt?.document.id === target &&
    receipt.digest === metadata.data?.digest
      ? receipt
      : undefined;
  function confirm(checked: boolean, context: string) {
    if (!locked) setConfirmation(checked ? context : "");
  }
  function reset() {
    if (locked || write.isBusy()) return;
    setConfirmation("");
    setMessage(null);
    write.mutation.reset();
  }
  async function submit(command: Command, context: string, ready: boolean) {
    if (!ready || locked || write.isBusy()) return;
    if (!context || confirmation !== context) {
      setMessage(
        "Confirme a exposição aos gabaritos antes de abrir a comparação.",
      );
      return;
    }
    setMessage(null);
    try {
      if (await write.run(command)) setConfirmation("");
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  async function recover() {
    if (!allowed || write.isBusy() || protection.locked) return;
    try {
      if (await write.recover()) {
        setConfirmation("");
        setMessage(null);
      }
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  async function refresh() {
    if (!allowed) return;
    setConfirmation("");
    if (target) await metadata.refetch();
  }
  const navigation = useAnnotationNavigation(
    write.uncertain ||
      write.mutation.isPending ||
      !!confirmation ||
      !!protection.dirty,
  );
  return {
    write,
    metadata,
    metadataReady,
    delivery,
    locked,
    confirmation,
    confirm,
    reset,
    submit,
    recover,
    refresh,
    message,
    navigation,
  };
}
