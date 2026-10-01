"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ChangeEvent, type SyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";

import {
  goldBody,
  goldError,
  goldFormSchema,
  type GoldFormValues,
  type GoldPreview,
  goldPreviewReference,
  promoteGold,
  withdrawalSchema,
  type WithdrawalValues,
  withdrawGold,
} from "../../services/annotation-gold";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";
export function useGoldEditor(
  preview: GoldPreview,
  allowed: boolean,
  loading: boolean,
) {
  const form = useForm<GoldFormValues>({
    resolver: zodResolver(goldFormSchema),
    defaultValues: {
      purposes: [],
      legal_valid_from: "",
      legal_valid_until: "",
      reason: "",
      confirmed: false,
      preview_reference: "",
    },
  });
  const write = useCurationWrite(allowed, promoteGold, ["curation"]);
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
    form.setValue("preview_reference", goldPreviewReference(preview));
  }
  async function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    if (locked || loading || write.isBusy()) return;
    try {
      setMessage(null);
      await write.run(goldBody(form.getValues(), preview, crypto.randomUUID()));
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
    write,
    message,
    locked,
    navigation,
    change,
    confirm,
    submit,
    recover,
  };
}
export function useGoldWithdrawal(
  id: string,
  allowed: boolean,
  withdrawn: boolean,
) {
  const form = useForm<WithdrawalValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { reason: "", confirmed: false },
  });
  const write = useCurationWrite(allowed, withdrawGold, ["curation"]);
  const [message, setMessage] = useState<string | null>(null);
  const locked =
    !allowed ||
    withdrawn ||
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
      const f = withdrawalSchema.parse(form.getValues());
      setMessage(null);
      await write.run({
        id,
        body: { request_id: crypto.randomUUID(), reason: f.reason },
      });
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
  function change(event: SyntheticEvent<HTMLFormElement>) {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.name !== "confirmed"
    )
      form.setValue("confirmed", false);
  }
  return { form, write, message, locked, navigation, submit, recover, change };
}
