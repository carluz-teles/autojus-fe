"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { type MouseEvent, type SyntheticEvent, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import {
  type AnnotationActOption,
  type AnnotationProtocol,
  batchBody,
  batchFormSchema,
  createPreparedBatch,
  createProtocol,
  emptyProtocolRule,
  preparationKeys,
  protocolBody,
  protocolDefaults,
  type ProtocolForm,
  protocolFormSchema,
} from "../../services/annotation-preparation";
import { getSamplingFrame } from "../../services/sampling";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";
import { useProtocolQuery } from "./use-preparation-queries";

function formError(error: unknown) {
  return error instanceof z.ZodError
    ? error.issues.map((i) => i.message).join(" · ")
    : error instanceof Error
      ? error.message
      : "Confira os campos.";
}
export function useProtocolEditor(
  previous: AnnotationProtocol | null,
  catalog: AnnotationActOption[],
  allowed: boolean,
  author: boolean,
) {
  const form = useForm<ProtocolForm>({
    resolver: zodResolver(protocolFormSchema),
    defaultValues: protocolDefaults(previous),
  });
  const values = useWatch({ control: form.control });
  const fields = useFieldArray({ control: form.control, name: "rules" });
  const write = useCurationWrite(allowed, createProtocol, preparationKeys.all);
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
  async function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    if (locked || write.isBusy()) return;
    try {
      const body = protocolBody(
        form.getValues(),
        previous,
        catalog,
        author,
        crypto.randomUUID(),
      );
      setMessage(null);
      await write.run(body);
    } catch (error) {
      setMessage(formError(error));
    }
  }
  async function recover() {
    try {
      await write.recover();
    } catch (error) {
      setMessage(formError(error));
    }
  }
  function addRule() {
    if (!locked && fields.fields.length < 256) {
      fields.append(emptyProtocolRule());
      form.setValue("confirmed", false);
    }
  }
  function removeRule(event: MouseEvent<HTMLButtonElement>) {
    if (!locked) {
      fields.remove(Number(event.currentTarget.dataset.index));
      form.setValue("confirmed", false);
    }
  }
  function changeField(event: SyntheticEvent<HTMLFormElement>) {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.name !== "confirmed"
    )
      form.setValue("confirmed", false);
  }
  return {
    form,
    values,
    fields: fields.fields,
    write,
    message,
    locked,
    navigation,
    submit,
    recover,
    addRule,
    removeRule,
    changeField,
    missingTypes: (values.act_types ?? []).filter(
      (key) => key && !catalog.some((option) => option.key === key),
    ),
  };
}
export function useBatchEditor(allowed: boolean, initialFrame = "") {
  const api = useApi();
  const form = useForm<z.infer<typeof batchFormSchema>>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: { frame: initialFrame, protocol: "", confirmed: false },
  });
  const [frameID, protocolID] = useWatch({
    control: form.control,
    name: ["frame", "protocol"],
  });
  const frame = useQuery({
    queryKey: ["curation", "sampling-frame", frameID],
    queryFn: ({ signal }) => getSamplingFrame(api, frameID, signal),
    enabled: allowed && !!frameID,
    retry: false,
  });
  const protocol = useProtocolQuery(protocolID, allowed);
  const write = useCurationWrite(
    allowed,
    createPreparedBatch,
    preparationKeys.all,
  );
  const [message, setMessage] = useState<string | null>(null);
  const locked =
    !allowed ||
    write.mutation.isPending ||
    write.uncertain ||
    !!write.mutation.data;
  const navigation = useAnnotationNavigation(
    write.uncertain || write.mutation.isPending,
  );
  async function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    if (
      locked ||
      write.isBusy() ||
      frame.isFetching ||
      protocol.isFetching ||
      frame.isError ||
      protocol.isError
    )
      return;
    try {
      const body = batchBody(
        form.getValues(),
        frame.data,
        protocol.data,
        crypto.randomUUID(),
      );
      setMessage(null);
      await write.run(body);
    } catch (error) {
      setMessage(formError(error));
    }
  }
  async function recover() {
    try {
      await write.recover();
    } catch (error) {
      setMessage(formError(error));
    }
  }
  // Changing either reference clears the human confirmation synchronously.
  function changeSelection() {
    form.setValue("confirmed", false);
  }
  function refreshSelection() {
    if (!allowed) return;
    if (frameID) void frame.refetch();
    if (protocolID) void protocol.refetch();
  }
  return {
    form,
    frame,
    protocol,
    write,
    message,
    locked,
    navigation,
    submit,
    recover,
    changeSelection,
    refreshSelection,
  };
}
