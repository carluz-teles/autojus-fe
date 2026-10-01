"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ChangeEvent, type SyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";

import { goldError } from "../../services/annotation-gold";
import {
  scopedWithdrawalBody,
  type ScopedWithdrawalForm,
  scopedWithdrawalSchema,
  type WithdrawalImpact,
  withdrawScope,
} from "../../services/withdrawals";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";
export function useScopedWithdrawal(
  impact: WithdrawalImpact,
  allowed: boolean,
  loading: boolean,
) {
  const form = useForm<ScopedWithdrawalForm>({
      resolver: zodResolver(scopedWithdrawalSchema),
      defaultValues: { reason: "", confirmed: false, preview_digest: "" },
    }),
    write = useCurationWrite(allowed, withdrawScope, ["curation"]);
  const [message, setMessage] = useState<string | null>(null),
    locked =
      !allowed ||
      write.uncertain ||
      write.mutation.isPending ||
      !!write.mutation.data ||
      impact.already_withdrawn;
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
    form.setValue("preview_digest", impact.digest);
  }
  async function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    if (locked || loading || write.isBusy()) return;
    try {
      setMessage(null);
      await write.run(
        scopedWithdrawalBody(form.getValues(), impact, crypto.randomUUID()),
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
