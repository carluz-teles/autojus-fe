"use client";

import type {
  AnnotationActOption,
  AnnotationProtocol,
  PreparedTask,
} from "../services/annotation-preparation";
import { useLocalPredictionState } from "./_private/use-local-prediction";
import {
  useBatchEditor,
  useProtocolEditor,
} from "./_private/use-preparation-forms";
import {
  usePreparationLists,
  usePreparedBatchQuery,
  useProtocolCatalog,
  useProtocolQuery,
} from "./_private/use-preparation-queries";
import { useBackofficeContext } from "./use-backoffice-context";

export function usePreparationWorkspace(frame?: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.manage");
  const lists = usePreparationLists(allowed),
    editor = useBatchEditor(allowed, frame);
  function refresh() {
    lists.refresh();
    editor.refreshSelection();
  }
  return { allowed, ...lists, editor, refresh };
}
export function useProtocolPage(id?: string) {
  const { capabilities } = useBackofficeContext();
  const allowed = capabilities.includes("curation.manage");
  const previous = useProtocolQuery(id ?? "", allowed),
    catalog = useProtocolCatalog(allowed);
  function refresh() {
    if (!allowed) return;
    void catalog.refetch();
    if (id) void previous.refetch();
  }
  return {
    allowed,
    author: capabilities.includes("curation.author"),
    previous,
    catalog,
    refresh,
  };
}
export function useProtocolForm(
  previous: AnnotationProtocol | null,
  catalog: AnnotationActOption[],
) {
  const { capabilities } = useBackofficeContext();
  return useProtocolEditor(
    previous,
    catalog,
    capabilities.includes("curation.manage"),
    capabilities.includes("curation.author"),
  );
}
export function usePreparedBatch(id: string) {
  const { capabilities } = useBackofficeContext();
  const allowed = capabilities.includes("curation.manage");
  const batch = usePreparedBatchQuery(id, allowed),
    protocol = useProtocolQuery(batch.data?.protocol_id ?? "", allowed);
  function refresh() {
    if (allowed) {
      void batch.refetch();
      if (batch.data) void protocol.refetch();
    }
  }
  return {
    allowed,
    canAnnotate: capabilities.includes("curation.annotate"),
    batch,
    protocol,
    refresh,
  };
}
export function useLocalPrediction(
  task: PreparedTask,
  protocolDigest: string,
  valid: boolean,
) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.predict");
  return {
    allowed,
    ...useLocalPredictionState(task, protocolDigest, allowed, valid),
  };
}
