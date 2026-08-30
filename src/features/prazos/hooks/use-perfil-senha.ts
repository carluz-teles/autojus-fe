"use client";

import { useUser } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// Extrai a mensagem legível de um erro do Clerk (ClerkAPIResponseError).
function clerkMsg(e: unknown): string | null {
  const errs = (e as { errors?: { longMessage?: string; message?: string }[] })
    ?.errors;
  return errs?.[0]?.longMessage ?? errs?.[0]?.message ?? null;
}

// Card "Senha" do Perfil (Clerk headless user.updatePassword). Se o usuário já
// tem senha, exige a atual (reautenticação); se entrou só por OAuth, o card
// vira "Definir senha" e não pede a atual. Opção de encerrar as outras sessões.
export function usePerfilSenha() {
  const { user } = useUser();
  const passwordEnabled = !!user?.passwordEnabled;

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [sairOutras, setSairOutras] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const erro = useMemo(() => {
    if (nova && nova.length < 8)
      return "A nova senha precisa de ao menos 8 caracteres.";
    if (confirma && nova !== confirma) return "As senhas não coincidem.";
    return null;
  }, [nova, confirma]);

  const pode =
    !salvando &&
    nova.length >= 8 &&
    nova === confirma &&
    (!passwordEnabled || atual.length > 0);

  const salvar = async () => {
    if (!user || !pode) return;
    setSalvando(true);
    try {
      await user.updatePassword({
        ...(passwordEnabled ? { currentPassword: atual } : {}),
        newPassword: nova,
        signOutOfOtherSessions: sairOutras,
      });
      toast.success("Senha atualizada.");
      setAtual("");
      setNova("");
      setConfirma("");
      setSairOutras(false);
    } catch (e) {
      toast.error(clerkMsg(e) ?? "Não foi possível alterar a senha.");
    } finally {
      setSalvando(false);
    }
  };

  return {
    passwordEnabled,
    titulo: passwordEnabled ? "Alterar senha" : "Definir senha",
    atual,
    setAtual,
    nova,
    setNova,
    confirma,
    setConfirma,
    sairOutras,
    toggleSairOutras: () => setSairOutras((v) => !v),
    sairTrilho: sairOutras ? "var(--primary)" : "var(--line2)",
    sairKnob: sairOutras ? "translateX(16px)" : "translateX(0)",
    erro,
    pode,
    salvar: () => void salvar(),
    salvando,
  };
}
