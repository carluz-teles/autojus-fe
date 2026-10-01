"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { type ChangeEvent, type SyntheticEvent, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import { goldError } from "../../services/annotation-gold";
import type { DatasetRelease } from "../../services/dataset-releases";
import {
  evaluationLimitsSchema,
  type EvaluationSelection,
  evaluationTypeModeSchema,
} from "../../services/evaluation-schemas";
import {
  evaluationKeys,
  freezeEvaluationPlan,
  previewEvaluationPlan,
  sameEvaluationSelection,
} from "../../services/evaluations";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";

const schema = z.strictObject({
  split: z.enum(["train", "validation"]),
  pipeline: z.union([z.literal(""), evaluationTypeModeSchema]),
  limits: evaluationLimitsSchema,
  confirmation: z.string(),
});
type Values = z.infer<typeof schema>;
export function useEvaluationEditor(
  release: DatasetRelease,
  allowed: boolean,
  unavailable: boolean,
) {
  const api = useApi();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      split: "validation",
      pipeline: "",
      limits: {
        max_cases: NaN,
        max_http_calls: NaN,
        max_output_tokens: NaN,
        concurrency: 1,
      },
      confirmation: "",
    },
  });
  useWatch({ control: form.control });
  const preview = useMutation({
    mutationFn: (selection: EvaluationSelection) =>
      previewEvaluationPlan(api, selection),
    retry: false,
  });
  const write = useCurationWrite(
    allowed,
    freezeEvaluationPlan,
    evaluationKeys.all,
  );
  const [message, setMessage] = useState<string | null>(null);
  const locked =
    !allowed ||
    write.mutation.isPending ||
    write.uncertain ||
    !!write.mutation.data;
  const canPrepare =
    !locked &&
    !unavailable &&
    release.eligible &&
    !release.withdrawn &&
    release.manifest.purpose === "evaluation";
  function selection(): EvaluationSelection {
    const v = form.getValues();
    return {
      release_id: release.id,
      expected_manifest_digest: release.manifest_digest,
      split: v.split,
      limits: v.limits,
      ...(v.pipeline ? { pipeline: v.pipeline } : {}),
    };
  }
  const current =
    preview.data && sameEvaluationSelection(preview.data.selection, selection())
      ? preview.data
      : undefined;
  const confirmed =
    !!current && form.getValues("confirmation") === current.digest;
  function change(event: SyntheticEvent<HTMLFormElement>) {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.name !== "confirmation"
    )
      form.setValue("confirmation", "");
  }
  function confirm(e: ChangeEvent<HTMLInputElement>) {
    form.setValue(
      "confirmation",
      e.target.checked && current ? current.digest : "",
      { shouldDirty: true },
    );
  }
  const prepare = form.handleSubmit(async () => {
    if (!canPrepare || preview.isPending) return;
    form.setValue("confirmation", "");
    setMessage(null);
    try {
      await preview.mutateAsync(selection());
    } catch (error) {
      setMessage(goldError(error));
    }
  });
  async function freeze() {
    if (
      !canPrepare ||
      preview.isPending ||
      preview.isError ||
      !current ||
      write.isBusy()
    )
      return;
    if (
      form.getValues("confirmation") !== current.digest ||
      !sameEvaluationSelection(current.selection, selection())
    ) {
      setMessage("Confira e confirme o preview atual antes de congelar.");
      return;
    }
    setMessage(null);
    try {
      await write.run({
        request_id: crypto.randomUUID(),
        selection: current.selection,
        expected_preview_digest: current.digest,
        confirmed: true,
      });
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  async function recover() {
    if (!allowed || write.isBusy()) return;
    try {
      await write.recover();
      setMessage(null);
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  const navigation = useAnnotationNavigation(
    write.uncertain ||
      write.mutation.isPending ||
      (form.formState.isDirty && !write.mutation.data),
  );
  return {
    form,
    preview,
    current,
    confirmed,
    locked,
    canPrepare,
    write,
    message,
    change,
    confirm,
    prepare,
    freeze,
    recover,
    navigation,
  };
}
