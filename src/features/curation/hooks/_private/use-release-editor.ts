"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ChangeEvent, type SyntheticEvent, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { goldError } from "../../services/annotation-gold";
import {
  createRelease,
  releaseBody,
  releaseFormSchema,
  type ReleaseFormValues,
  releaseKeys,
} from "../../services/dataset-releases";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";
import { useReleasePreviewQuery } from "./use-release-queries";
export function useReleaseEditor(batch: string, allowed: boolean) {
  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: {
      name: "",
      purpose: "evaluation",
      confirmed: false,
      preview_digest: "",
    },
  });
  const purpose = useWatch({ control: form.control, name: "purpose" });
  const preview = useReleasePreviewQuery(batch, purpose, allowed);
  const write = useCurationWrite(allowed, createRelease, releaseKeys.all);
  const [message, setMessage] = useState<string | null>(null);
  const locked =
    !allowed ||
    write.mutation.isPending ||
    write.uncertain ||
    !!write.mutation.data;
  const navigation = useAnnotationNavigation(
    (form.formState.isDirty && !write.mutation.data) ||
      write.uncertain ||
      write.mutation.isPending,
  );
  function change(event: SyntheticEvent<HTMLFormElement>) {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.name !== "confirmed"
    )
      form.setValue("confirmed", false);
  }
  function confirm(event: ChangeEvent<HTMLInputElement>) {
    form.setValue("confirmed", event.target.checked, { shouldDirty: true });
    form.setValue("preview_digest", preview.data?.digest ?? "");
  }
  function refresh() {
    if (allowed && !locked) void preview.refetch();
  }
  async function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    if (locked || write.isBusy() || preview.isFetching || preview.isError)
      return;
    try {
      setMessage(null);
      await write.run(
        releaseBody(form.getValues(), preview.data, batch, crypto.randomUUID()),
      );
    } catch (e) {
      setMessage(goldError(e));
    }
  }
  async function recover() {
    try {
      await write.recover();
    } catch (e) {
      setMessage(goldError(e));
    }
  }
  return {
    form,
    preview,
    write,
    message,
    locked,
    navigation,
    change,
    confirm,
    refresh,
    submit,
    recover,
  };
}
