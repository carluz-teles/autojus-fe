"use client";

import { useClerk } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { ApiError } from "@/lib/api/errors";
import { verifyOrganizationTransition } from "@/lib/auth/organization-transition";

import { sessionMatchesOrganization } from "../services/backoffice";
import { useBackofficeIsolation } from "./_private/use-backoffice-isolation";
import { useBackofficeSession } from "./_private/use-backoffice-session";

export function useBackoffice() {
  const clerk = useClerk();
  const { generation, transition, invalidate } = useBackofficeIsolation();
  const logout = useMutation({
    mutationFn: async () => {
      invalidate();
      await clerk.signOut({ redirectUrl: "/sign-in" });
    },
  });
  const { query, isLoaded, userId, orgId } = useBackofficeSession(
    generation !== null && !logout.isPending,
  );
  const matching = sessionMatchesOrganization(query.data, orgId);

  const activate = useMutation({
    mutationFn: async () => {
      const organization = query.data?.organization_id;
      if (!organization) throw new Error("Organização interna indisponível.");
      invalidate();
      await clerk.setActive({ organization });
      await clerk.session?.getToken({
        organizationId: organization,
        skipCache: true,
      });
    },
  });
  useEffect(() => {
    if (
      query.isSuccess &&
      !activate.isPending &&
      !logout.isPending &&
      matching &&
      generation !== null &&
      orgId
    )
      verifyOrganizationTransition(generation, orgId);
  }, [
    generation,
    matching,
    orgId,
    query.isSuccess,
    query.dataUpdatedAt,
    activate.isPending,
    logout.isPending,
  ]);

  useEffect(() => {
    if (query.isError) invalidate();
  }, [query.isError, query.errorUpdatedAt, invalidate]);

  const switchOrganization = useCallback(() => activate.mutate(), [activate]);
  const retry = useCallback(() => {
    void query.refetch();
  }, [query]);
  const signOut = useCallback(() => logout.mutate(), [logout]);
  const error = query.error instanceof ApiError ? query.error : null;
  const ready =
    !activate.isPending &&
    !logout.isPending &&
    isLoaded &&
    Boolean(userId) &&
    query.isSuccess &&
    matching &&
    transition.generation === generation &&
    !transition.blocked &&
    transition.organizationId === orgId;

  return {
    ready,
    session: ready ? query.data : undefined,
    loading:
      logout.isPending || !isLoaded || (Boolean(userId) && query.isPending),
    expired: isLoaded && (!userId || error?.status === 401),
    forbidden: error?.status === 403,
    unavailable:
      query.isError && error?.status !== 401 && error?.status !== 403,
    requiresSwitch: query.isSuccess && !matching,
    switching: activate.isPending,
    switchError: activate.isError,
    switchOrganization,
    retry,
    signOut,
  };
}
