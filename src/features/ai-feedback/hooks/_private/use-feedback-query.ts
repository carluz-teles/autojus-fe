"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { feedbackErrorCode, feedbackWait } from "../../services/failures";
import { getFeedback } from "../../services/feedback";

export function useFeedbackQuery(result: string, queryKey: readonly string[]) {
  const api = useApi();
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => getFeedback(api, result, signal),
    retry: (count, error) =>
      count < 2 && feedbackErrorCode(error) === "result_not_ready",
    retryDelay: (_count, error) => feedbackWait(error) * 1000,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
  });
}
