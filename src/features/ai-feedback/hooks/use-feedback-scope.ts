"use client";

import { useFeedbackIdentity } from "./_private/use-feedback-identity";

export function useFeedbackScope(resultId: string) {
  const key = useFeedbackIdentity(resultId);
  return key ? { queryKey: key, componentKey: JSON.stringify(key) } : null;
}
