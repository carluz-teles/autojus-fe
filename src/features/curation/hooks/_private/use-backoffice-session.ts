"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getBackofficeSession } from "../../services/backoffice";

export function useBackofficeSession(enabled: boolean) {
  const { isLoaded, userId, orgId, sessionId } = useAuth();
  const api = useApi();
  const query = useQuery({
    queryKey: ["backoffice-session", sessionId, userId, orgId],
    queryFn: ({ signal }) => getBackofficeSession(api, signal),
    enabled: enabled && isLoaded && Boolean(userId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: "always",
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  return { query, isLoaded, userId, orgId };
}
