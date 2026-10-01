"use client";

import {
  preparationKeys,
  type PreparedTask,
  prepareLocalPrediction,
} from "../../services/annotation-preparation";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";

export function useLocalPredictionState(
  task: PreparedTask,
  protocolDigest: string,
  allowed: boolean,
  valid: boolean,
) {
  const write = useCurationWrite(
    allowed,
    prepareLocalPrediction,
    preparationKeys.all,
  );
  const navigation = useAnnotationNavigation(
    write.uncertain || write.mutation.isPending,
  );
  async function generate() {
    if (
      !allowed ||
      !valid ||
      !protocolDigest ||
      task.mode !== "assisted" ||
      write.uncertain ||
      write.mutation.data ||
      write.isBusy()
    )
      return;
    try {
      await write.run({
        task: task.id,
        body: {
          request_id: crypto.randomUUID(),
          engine_version: "snapshot-rules-v1",
          expected_protocol_digest: protocolDigest,
          expected_snapshot_digest: task.snapshot_digest,
        },
      });
    } catch {
      /* Mutation retains the exact command and displays its failure. */
    }
  }
  async function recover() {
    try {
      await write.recover();
    } catch {
      /* Preserve the receipt recovery request. */
    }
  }
  return {
    write,
    navigation,
    generate,
    recover,
    canGenerate:
      allowed &&
      valid &&
      !!protocolDigest &&
      task.mode === "assisted" &&
      !write.mutation.data &&
      !write.uncertain &&
      !write.mutation.isPending,
  };
}
