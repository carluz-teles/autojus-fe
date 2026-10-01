"use client";
import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getFeedbackMetrics,
  listFeedbackScopes,
  type MetricsPeriod,
} from "../../services/feedback-metrics";

export function useFeedbackScopes(allowed: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ["curation", "feedback-scopes"],
    queryFn: ({ signal }) => listFeedbackScopes(api, signal),
    enabled: allowed,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}
export function useFeedbackMetricsQuery(
  id: string,
  period: MetricsPeriod | null,
  allowed: boolean,
  submission: number,
) {
  const api = useApi();
  return useQuery({
    queryKey: [
      "curation",
      "feedback-metrics",
      id,
      period?.from,
      period?.to,
      submission,
    ],
    queryFn: ({ signal }) => getFeedbackMetrics(api, id, period!, signal),
    enabled: allowed && !!period,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}
