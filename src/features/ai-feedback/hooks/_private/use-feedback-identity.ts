"use client";

import { useAuth } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";

import {
  subscribeTransition,
  transitionSnapshot,
} from "@/lib/auth/organization-transition";

export function useFeedbackIdentity(resultId: string) {
  const { isLoaded, isSignedIn, userId, orgId, sessionId } = useAuth();
  const transition = useSyncExternalStore(
    subscribeTransition,
    transitionSnapshot,
    transitionSnapshot,
  );
  if (
    !isLoaded ||
    !isSignedIn ||
    !userId ||
    !orgId ||
    !sessionId ||
    transition.blocked ||
    transition.organizationId !== orgId
  )
    return null;
  return [
    "ai-feedback",
    orgId,
    userId,
    sessionId,
    String(transition.generation),
    resultId,
    "usefulness",
  ];
}
