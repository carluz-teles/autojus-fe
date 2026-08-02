"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const SESSIONS_KEY = ["profile", "sessions"] as const;

/**
 * Segurança da conta (headless): sessões ativas + e-mails, sobre o resource do
 * Clerk. Sessões via React Query (user.getSessions não é reativo); e-mails direto
 * do user resource (reativo). Ações são mutations — estado (isPending) do RQ.
 */
export function useSecurity() {
  const { user } = useUser();
  const { session: currentSession } = useSession();
  const qc = useQueryClient();

  const sessions = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => (user ? await user.getSessions() : []),
    enabled: !!user,
  });

  const revokeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const target = sessions.data?.find((s) => s.id === sessionId);
      if (target) await target.revoke();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });

  // Adicionar e-mail: cria E dispara o código de verificação em seguida.
  const addEmail = useMutation({
    mutationFn: async (email: string) => {
      if (!user) throw new Error("no user");
      const created = await user.createEmailAddress({ email });
      await created.prepareVerification({ strategy: "email_code" });
      return created;
    },
  });

  const verifyEmail = useMutation({
    mutationFn: async ({
      emailId,
      code,
    }: {
      emailId: string;
      code: string;
    }) => {
      const target = user?.emailAddresses.find((e) => e.id === emailId);
      if (!target) throw new Error("email not found");
      await target.attemptVerification({ code });
    },
  });

  const resendCode = useMutation({
    mutationFn: async (emailId: string) => {
      const target = user?.emailAddresses.find((e) => e.id === emailId);
      if (!target) throw new Error("email not found");
      await target.prepareVerification({ strategy: "email_code" });
    },
  });

  const setPrimary = useMutation({
    mutationFn: async (emailId: string) => {
      if (!user) throw new Error("no user");
      await user.update({ primaryEmailAddressId: emailId });
    },
  });

  const removeEmail = useMutation({
    mutationFn: async (emailId: string) => {
      const target = user?.emailAddresses.find((e) => e.id === emailId);
      if (!target) throw new Error("email not found");
      await target.destroy();
    },
  });

  return {
    user,
    currentSessionId: currentSession?.id,
    emails: user?.emailAddresses ?? [],
    primaryEmailId: user?.primaryEmailAddressId ?? null,
    sessions: sessions.data ?? [],
    isSessionsLoading: sessions.isPending,
    revokeSession: revokeSession.mutateAsync,
    isRevoking: revokeSession.isPending,
    addEmail: addEmail.mutateAsync,
    isAddingEmail: addEmail.isPending,
    verifyEmail: verifyEmail.mutateAsync,
    isVerifyingEmail: verifyEmail.isPending,
    resendCode: resendCode.mutateAsync,
    setPrimary: setPrimary.mutateAsync,
    isSettingPrimary: setPrimary.isPending,
    removeEmail: removeEmail.mutateAsync,
    isRemovingEmail: removeEmail.isPending,
  };
}
