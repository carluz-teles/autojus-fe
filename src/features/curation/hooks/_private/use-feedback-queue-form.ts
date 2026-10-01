"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { defaultMetricsPeriod } from "../../services/feedback-metrics";
import {
  type FeedbackCurationScope,
  type FeedbackQueueForm,
  feedbackQueueFormSchema,
  freezeFeedbackQueue,
} from "../../services/feedback-queues";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";

export function useFeedbackQueueForm(
  scope: FeedbackCurationScope,
  allowed: boolean,
) {
  const router = useRouter();
  const form = useForm<FeedbackQueueForm>({
    resolver: zodResolver(feedbackQueueFormSchema),
    defaultValues: {
      ...defaultMetricsPeriod(scope),
      quotas: { random: 25, correction: 25, negative: 25, positive: 25 },
    },
  });
  const write = useCurationWrite(allowed, freezeFeedbackQueue, [
    "curation",
    "feedback-queues",
  ]);
  const locked = !allowed || write.mutation.isPending || write.uncertain;
  const navigation = useAnnotationNavigation(
    write.mutation.isPending || write.uncertain || form.formState.isDirty,
  );
  async function submitValues(values: FeedbackQueueForm) {
    if (locked || write.isBusy()) return;
    if (values.from < scope.period_start || values.to > scope.period_end) {
      form.setError("root", { message: "Período fora do recorte autorizado." });
      return;
    }
    try {
      form.clearErrors("root");
      const queue = await write.run({
        ...values,
        scope_id: scope.id,
        expected_scope_revision: scope.revision,
        request_id: crypto.randomUUID(),
      });
      if (queue) {
        form.reset(values);
        router.push(`/backoffice/feedback-queues/${queue.id}`);
      }
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Falha ao gerar a fila.",
      });
    }
  }
  async function recover() {
    try {
      const queue = await write.recover();
      if (queue) {
        form.reset(form.getValues());
        router.push(`/backoffice/feedback-queues/${queue.id}`);
      }
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Envio ainda não confirmado.",
      });
    }
  }
  return {
    form,
    submit: form.handleSubmit(submitValues),
    locked,
    write,
    recover,
    navigation,
  };
}
