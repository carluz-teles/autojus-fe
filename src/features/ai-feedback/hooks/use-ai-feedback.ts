"use client";

import { useClerk } from "@clerk/nextjs";
import { useId } from "react";

import { ApiError } from "@/lib/api/errors";

import {
  feedbackAccessError,
  feedbackFailureMessage,
  feedbackWait,
} from "../services/failures";
import type { FeedbackDetails } from "../services/feedback";
import { useFeedbackCooldown } from "./_private/use-feedback-cooldown";
import { useFeedbackExposure } from "./_private/use-feedback-exposure";
import { useFeedbackForm } from "./_private/use-feedback-form";
import { useFeedbackQuery } from "./_private/use-feedback-query";
import { useFeedbackWrite } from "./_private/use-feedback-write";

export function useAiFeedback(result: string, key: readonly string[]) {
  const query = useFeedbackQuery(result, key),
    editor = useFeedbackForm(),
    clerk = useClerk(),
    id = useId();
  const write = useFeedbackWrite(result, query.refetch);
  const writeError = write.mutation.error;
  const error = query.error ?? writeError;
  const blocked = feedbackAccessError(error);
  const until = Math.max(
    query.errorUpdatedAt + feedbackWait(query.error) * 1000,
    (write.mutation.isError ? write.failedAt() : 0) +
      feedbackWait(writeError) * 1000,
  );
  const wait = useFeedbackCooldown(until);
  const state = !query.isError && !blocked ? query.data : undefined;
  const observeCTA = useFeedbackExposure(result, !!state);
  const busy = write.mutation.isPending || query.isFetching;
  const canVote = !!state && !busy && !wait && !write.hasPending();
  const selected =
    state?.status === "active" ? [state.helpful ? "yes" : "no"] : [];
  async function vote(helpful: boolean, details?: FeedbackDetails) {
    if (!canVote || !state) return;
    const values = details ?? {
      reason_code: state.reason_code ?? "",
      comment: state.comment ?? "",
      correction: state.correction ?? "",
    };
    await write.execute({
      action: "vote",
      body: {
        request_id: crypto.randomUUID(),
        expected_revision: state.revision,
        helpful,
        ...values,
      },
    });
  }
  function select(values: string[]) {
    if (values.length && values[0] !== selected[0])
      void vote(values[0] === "yes");
  }
  async function withdraw() {
    if (!canVote || state?.status !== "active") return;
    const receipt = await write.execute({
      action: "withdraw",
      body: {
        request_id: crypto.randomUUID(),
        expected_revision: state.revision,
      },
    });
    if (receipt) editor.close();
  }
  function openDetails() {
    if (canVote && state) editor.open(state);
  }
  const submitDetails = editor.form.handleSubmit(async (values) => {
    if (state?.status === "active") await vote(state.helpful!, values);
  });
  async function retry() {
    if (busy || wait || blocked) return;
    const receipt = await write.execute();
    if (receipt?.status === "withdrawn") editor.close();
  }
  async function refresh() {
    if (busy || wait) return;
    if (!write.hasPending()) write.mutation.reset();
    await query.refetch();
  }
  function signIn() {
    clerk.openSignIn({});
  }
  return {
    observeCTA,
    id,
    state,
    selected,
    busy,
    canVote,
    blocked,
    wait,
    editor,
    select,
    withdraw,
    openDetails,
    submitDetails,
    retry,
    refresh,
    signIn,
    needsSignIn: error instanceof ApiError && error.status === 401,
    canRetry: write.hasPending() && !blocked,
    message: error
      ? query.isError &&
        !write.hasPending() &&
        !(
          error instanceof ApiError &&
          (error.status === 401 ||
            error.status === 403 ||
            error.status === 404 ||
            error.status === 409 ||
            error.status === 429)
        )
        ? "Não foi possível consultar seu feedback. Atualize para tentar novamente."
        : feedbackFailureMessage(error)
      : write.mutation.isPending
        ? "Enviando seu feedback…"
        : query.isPending
          ? "Carregando feedback…"
          : state?.status === "active"
            ? "Obrigado pelo feedback."
            : state?.status === "withdrawn"
              ? "Feedback retirado."
              : "",
    isError: !!error,
    detailsVisible: editor.editing && state?.status === "active" && !blocked,
  };
}
