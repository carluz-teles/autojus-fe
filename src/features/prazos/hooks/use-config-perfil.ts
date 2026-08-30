"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useMe } from "@/features/onboarding/hooks/use-me";
import {
  iniciais as calcIniciais,
  nomeExibicao,
  roleLabel,
} from "@/features/organization/lib/labels";

export interface PerfilRow {
  rot: string;
  val: string;
}

/**
 * Aba Perfil (Configurações) ligada ao real: os dados PESSOAIS vêm do Clerk
 * (useUser: nome, e-mail, telefone, foto) e o Cargo vem do BE (/identity/me →
 * role). A foto (setProfileImage), o nome (modal → user.update), a senha
 * (updatePassword) e as sessões (getSessions/revoke) são todas do Clerk, mas
 * renderizadas nos NOSSOS componentes (headless) — experiência unificada. Só o
 * "Editar dados" (nome) abre modal; Senha e Sessões são cards inline.
 */
export function useConfigPerfil() {
  const { user, isLoaded } = useUser();
  const { data: me } = useMe();
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [editarAberto, setEditarAberto] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const nome = nomeExibicao(user?.fullName, email);

  const rows = useMemo<PerfilRow[]>(() => {
    const linhas: PerfilRow[] = [
      { rot: "Nome", val: nome || "—" },
      { rot: "E-mail", val: email || "—" },
    ];
    const tel = user?.primaryPhoneNumber?.phoneNumber;
    if (tel) linhas.push({ rot: "Telefone", val: tel });
    linhas.push({ rot: "Cargo", val: me ? roleLabel(me.role) : "—" });
    return linhas;
  }, [nome, email, user?.primaryPhoneNumber?.phoneNumber, me]);

  const trocarFoto = useCallback(
    async (file: File) => {
      if (!user) return;
      setEnviandoFoto(true);
      try {
        await user.setProfileImage({ file });
        toast.success("Foto atualizada.");
      } catch {
        toast.error("Não foi possível atualizar a foto. Tente novamente.");
      } finally {
        setEnviandoFoto(false);
      }
    },
    [user],
  );

  return {
    isLoaded,
    avatarUrl: user?.hasImage ? user.imageUrl : null,
    iniciais: calcIniciais(nome || email),
    nome,
    rows,
    trocarFoto,
    enviandoFoto,
    editarAberto,
    abrirEditar: useCallback(() => setEditarAberto(true), []),
    fecharEditar: useCallback(() => setEditarAberto(false), []),
  };
}
