"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  beginOrganizationTransition,
  subscribeTransition,
  transitionSnapshot,
} from "@/lib/auth/organization-transition";

export function useBackofficeIsolation() {
  const queryClient = useQueryClient();
  const [generation, setGeneration] = useState<number | null>(null);
  const transition = useSyncExternalStore(
    subscribeTransition,
    transitionSnapshot,
    transitionSnapshot,
  );
  const invalidate = useCallback(() => {
    setGeneration(beginOrganizationTransition());
  }, []);

  useEffect(() => {
    // This synchronizes an external authorization boundary before enabling any
    // queries. Its initial render deliberately exposes no internal children.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    invalidate();
    return () => {
      beginOrganizationTransition();
      void queryClient.cancelQueries();
      queryClient.clear();
    };
  }, [invalidate, queryClient]);

  return { generation, transition, invalidate };
}
