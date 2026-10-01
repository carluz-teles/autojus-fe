"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import { goldError } from "../../services/annotation-gold";
import {
  closedLimitsSchema,
  type ClosedSelection,
  closedSelectionSchema,
} from "../../services/closed-test-schemas";
import {
  previewClosedTest,
  sameClosedSelection,
} from "../../services/closed-tests";
import type { useClosedTestActions } from "./use-closed-test-actions";
import type { useClosedTestQueries } from "./use-closed-test-queries";

const schema = z.strictObject({
  limits: closedLimitsSchema,
  reason: closedSelectionSchema.shape.reason,
});
export function useClosedTestEditor(
  q: ReturnType<typeof useClosedTestQueries>,
  a: ReturnType<typeof useClosedTestActions>,
) {
  const api = useApi();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      limits: {
        max_cases: 100,
        max_http_calls: 0,
        max_output_tokens: 0,
        concurrency: 1,
      },
      reason: "",
    },
  });
  useWatch({ control: form.control });
  const [message, setMessage] = useState<string | null>(null);
  const preview = useMutation({
    mutationFn: async (command: {
      id: string;
      selection: ClosedSelection;
      context: string;
    }) => ({
      preview: await previewClosedTest(api, command.id, command.selection),
      context: command.context,
    }),
    retry: false,
  });
  const c = q.candidate.data,
    release = q.release.data;
  const canPrepare =
    !a.locked &&
    q.releaseFresh &&
    q.reservation.data === null &&
    !!c?.eligible &&
    c.closed_test_available &&
    !!release?.eligible &&
    !release.withdrawn &&
    release.manifest.purpose === "evaluation";
  function selection(): ClosedSelection {
    return {
      ...form.getValues(),
      expected_candidate_digest: c?.digest ?? "",
      expected_manifest_digest: release?.manifest_digest ?? "",
    };
  }
  const current =
    canPrepare &&
    preview.isSuccess &&
    !preview.isPending &&
    preview.data.context === q.context &&
    sameClosedSelection(preview.data.preview.selection, selection())
      ? preview.data.preview
      : undefined;
  const context = current ? `${q.context}:${current.digest}` : "";
  function change() {
    a.confirmReserve("");
  }
  function confirm(checked: boolean) {
    a.confirmReserve(checked ? context : "");
  }
  const prepare = form.handleSubmit(async () => {
    if (!canPrepare || preview.isPending || !c) return;
    a.clearConfirmations();
    setMessage(null);
    try {
      await preview.mutateAsync({
        id: c.document.id,
        selection: selection(),
        context: q.context,
      });
    } catch (error) {
      setMessage(goldError(error));
    }
  });
  async function reserve() {
    if (!current || !context || preview.isPending) return;
    await a.reserve(current, context);
  }
  return {
    form,
    preview,
    current,
    canPrepare,
    message,
    prepare,
    reserve,
    confirm,
    change,
    confirmed: !!context && a.confirmation.reserve === context,
  };
}
