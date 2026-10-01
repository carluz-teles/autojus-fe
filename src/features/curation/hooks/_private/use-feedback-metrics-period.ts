"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  defaultMetricsPeriod,
  type FeedbackMetricScope,
  type MetricsPeriod,
  metricsPeriodSchema,
} from "../../services/feedback-metrics";

export function useFeedbackMetricsPeriod(scope: FeedbackMetricScope) {
  const form = useForm<MetricsPeriod>({
    resolver: zodResolver(metricsPeriodSchema),
    defaultValues: defaultMetricsPeriod(scope),
  });
  const [period, setPeriod] = useState<MetricsPeriod | null>(null);
  const [submission, setSubmission] = useState(0);
  const submit = form.handleSubmit((values) => {
    if (values.from < scope.period_start || values.to > scope.period_end) {
      form.setError("root", { message: "Período fora do recorte autorizado." });
      return;
    }
    form.clearErrors("root");
    setPeriod(values);
    setSubmission((value) => value + 1);
  });
  return { form, period, submission, submit };
}
