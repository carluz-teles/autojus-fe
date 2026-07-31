"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";

// Extrai a mensagem de erro do Clerk (ClerkAPIResponseError tem .errors[].message)
// sem acoplar ao tipo interno; cai num texto genérico se o formato mudar.
function clerkErr(e: unknown, fallback: string): string {
  const errs = (e as { errors?: { message?: string; longMessage?: string }[] })
    ?.errors;
  return errs?.[0]?.longMessage || errs?.[0]?.message || fallback;
}

/**
 * Hook headless do perfil (conta do usuário) sobre useUser. Expõe os dados e duas
 * ações: atualizar nome (user.update) e trocar senha (user.updatePassword). Cada
 * ação devolve {ok, error} para a UI mostrar o resultado inline — sem o
 * <UserProfile/> do Clerk. passwordEnabled indica se o usuário tem senha (contas
 * só-OAuth não têm, então escondemos a troca de senha).
 */
export function useProfile() {
  const { user, isLoaded } = useUser();
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const updateName = useCallback(
    async (firstName: string, lastName: string) => {
      if (!user) return { ok: false, error: "Sessão não carregada." };
      setSavingName(true);
      try {
        await user.update({ firstName, lastName });
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          error: clerkErr(e, "Não foi possível salvar."),
        };
      } finally {
        setSavingName(false);
      }
    },
    [user],
  );

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) return { ok: false, error: "Sessão não carregada." };
      setSavingPassword(true);
      try {
        // signOutOfOtherSessions: uma troca de senha invalida as outras sessões.
        await user.updatePassword({
          currentPassword,
          newPassword,
          signOutOfOtherSessions: true,
        });
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          error: clerkErr(e, "Não foi possível trocar a senha."),
        };
      } finally {
        setSavingPassword(false);
      }
    },
    [user],
  );

  return {
    isLoaded,
    user,
    email: user?.primaryEmailAddress?.emailAddress,
    passwordEnabled: user?.passwordEnabled ?? false,
    savingName,
    savingPassword,
    updateName,
    updatePassword,
  };
}
