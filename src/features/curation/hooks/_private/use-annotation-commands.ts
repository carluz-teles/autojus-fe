"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  type AnnotationAssignmentDetail,
  type AnnotationAssignmentInput,
  type AnnotationCommand,
  type AnnotationCommandResult,
  annotationKeys,
  sendAnnotationCommand,
} from "../../services/annotation-assignments";
import { isUncertainCommandFailure } from "../../services/command-recovery";

export function useAnnotationCommands(
  id: string,
  acknowledged?: (
    command: AnnotationCommand,
    receipt: AnnotationCommandResult,
  ) => void,
) {
  const api = useApi(),
    client = useQueryClient(),
    busy = useRef(false),
    unresolved = useRef<AnnotationCommand | null>(null);
  const mutation = useMutation({
    mutationFn: (command: AnnotationCommand) =>
      sendAnnotationCommand(api, id, command),
    retry: false,
    onSuccess(receipt, command) {
      acknowledged?.(command, receipt);
      unresolved.current = null;
      client.setQueryData<AnnotationAssignmentDetail>(
        annotationKeys.detail(id),
        (old) =>
          old
            ? {
                ...old,
                assignment: receipt.assignment,
                submission: receipt.submission ?? old.submission,
              }
            : old,
      );
      client.setQueryData<AnnotationAssignmentInput>(
        annotationKeys.input(id),
        (old) => {
          if (!old) return old;
          const draft =
            receipt.draft &&
            command.action === "draft" &&
            receipt.draft.revision >= old.draft.revision
              ? { ...receipt.draft, annotation: command.body.annotation }
              : old.draft;
          return { ...old, assignment: receipt.assignment, draft };
        },
      );
      void client.invalidateQueries({
        queryKey: [...annotationKeys.all, "own"],
      });
    },
    onError(error) {
      if (!isUncertainCommandFailure(error)) unresolved.current = null;
      void client.invalidateQueries({ queryKey: annotationKeys.detail(id) });
      void client.invalidateQueries({ queryKey: annotationKeys.input(id) });
    },
  });
  async function execute(command: AnnotationCommand, recovery = false) {
    if (busy.current) return;
    if (unresolved.current && !recovery)
      throw new Error(
        "Recupere o resultado do envio anterior antes de enviar outro comando.",
      );
    busy.current = true;
    const frozen = recovery ? unresolved.current! : structuredClone(command);
    unresolved.current = frozen;
    try {
      return await mutation.mutateAsync(frozen);
    } finally {
      busy.current = false;
    }
  }
  function run(command: AnnotationCommand) {
    return execute(command);
  }
  function recover() {
    if (!unresolved.current || busy.current) return Promise.resolve(undefined);
    return execute(unresolved.current, true);
  }
  return {
    mutation,
    run,
    recover,
    uncertain: mutation.isError && isUncertainCommandFailure(mutation.error),
    isBusy: () => busy.current,
  };
}
