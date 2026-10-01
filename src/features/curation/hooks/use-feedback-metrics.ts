"use client";
import {
  type FeedbackMetricScope,
  metricRows,
} from "../services/feedback-metrics";
import { useFeedbackMetricsPeriod } from "./_private/use-feedback-metrics-period";
import {
  useFeedbackMetricsQuery,
  useFeedbackScopes,
} from "./_private/use-feedback-metrics-queries";
import { useBackofficeContext } from "./use-backoffice-context";

export function useFeedbackMetricsScopes(id?: string) {
  const allowed = useBackofficeContext().capabilities.includes("curation.read");
  const query = useFeedbackScopes(allowed);
  const scopes = query.isSuccess && !query.isFetching ? query.data : [];
  function refresh() {
    if (allowed) void query.refetch();
  }
  return {
    allowed,
    query,
    scopes,
    scope: scopes.find((s) => s.id === id),
    refresh,
  };
}
export function useFeedbackMetrics(scope: FeedbackMetricScope) {
  const allowed = useBackofficeContext().capabilities.includes("curation.read");
  const selection = useFeedbackMetricsPeriod(scope);
  const query = useFeedbackMetricsQuery(
    scope.id,
    selection.period,
    allowed,
    selection.submission,
  );
  const report =
    allowed && query.isSuccess && !query.isFetching ? query.data : undefined;
  function refresh() {
    if (allowed && selection.period) void query.refetch();
  }
  return {
    ...selection,
    query,
    report,
    rows: metricRows(report?.rows ?? []),
    refresh,
  };
}
