"use client";
// Imported only from the disposable copy. No product route loads this fixture.
import { useSyncExternalStore } from "react";

import {
  beginOrganizationTransition,
  verifyOrganizationTransition,
} from "@/lib/auth/organization-transition";

let auth = {
  isLoaded: true,
  isSignedIn: true,
  userId: "person-a",
  orgId: "org-a",
  sessionId: "session-a",
};
const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function snapshot() {
  return auth;
}
export function useAuth() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
export function useClerk() {
  return {
    openSignIn: (_options: object) => {
      window.dispatchEvent(new Event("qa-sign-in"));
    },
  };
}
export function setFeedbackIdentity(userId: string, orgId: string) {
  const generation = beginOrganizationTransition();
  auth = { ...auth, userId, orgId };
  listeners.forEach((fn) => fn());
  verifyOrganizationTransition(generation, orgId);
}
