"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { updateOrgProfile } from "@/features/onboarding/services/onboarding.service";
import type { OrgProfileInput } from "@/features/onboarding/types";
import { useApi } from "@/lib/api/use-api";

import { getOrgProfile } from "../services/organization.service";

export const ORG_PROFILE_KEY = ["organization", "profile"] as const;

/**
 * Perfil fiscal do escritório na página /organization: leitura via GET (React
 * Query — isPending/isError) + escrita reusando o MESMO PUT do onboarding
 * (fonte única), invalidando a leitura no sucesso.
 */
export function useOrgProfile() {
  const fetcher = useApi();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ORG_PROFILE_KEY,
    queryFn: () => getOrgProfile(fetcher),
  });

  const update = useMutation({
    mutationFn: (input: OrgProfileInput) => updateOrgProfile(fetcher, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORG_PROFILE_KEY }),
  });

  return {
    profile: profile.data,
    isProfileLoading: profile.isPending,
    profileLoadFailed: profile.isError,
    updateProfile: update.mutateAsync,
    isSaving: update.isPending,
  };
}
