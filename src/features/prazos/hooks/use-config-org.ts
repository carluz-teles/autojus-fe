"use client";

import { useCallback, useMemo, useState } from "react";

import { useOrgLogo } from "@/features/organization/hooks/use-org-logo";
import { useOrgProfile } from "@/features/organization/hooks/use-org-profile";
import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { iniciais as calcIniciais } from "@/features/organization/lib/labels";
import { maskCnpj, maskPhone } from "@/lib/masks";

export interface OrgRow {
  rot: string;
  val: string;
}

/**
 * Aba Organização (Configurações) ligada ao real: os dados FISCAIS vêm do BE
 * (GET /v1/organization/profile via useOrgProfile) e a LOGO é asset do Clerk
 * (useOrgLogo → organization.setLogo), igual ao avatar do Perfil. A edição do
 * perfil fiscal (PUT) é ADMIN e abre um modal que reusa o form do onboarding.
 * Componente só faz binding.
 */
export function useConfigOrg() {
  const { profile, isProfileLoading, profileLoadFailed } = useOrgProfile();
  const { logoUrl, uploadLogo, isUploading } = useOrgLogo();
  const { isAdmin } = useIsOrgAdmin();
  const [editarAberto, setEditarAberto] = useState(false);

  const nome = profile?.trade_name || "Escritório";

  const rows = useMemo<OrgRow[]>(() => {
    if (!profile) return [];
    // Sempre expõe TODAS as linhas que o modal de edição controla (mesmo vazias,
    // com "—"): assim a leitura reflete o que dá pra editar, sem sumir campo que
    // o escritório ainda não preencheu.
    const ou = (v?: string | null) => (v && v.trim() ? v : "—");
    const end = profile.address;
    const linhas: OrgRow[] = [
      { rot: "Escritório", val: ou(profile.trade_name) },
    ];
    if (profile.legal_name && profile.legal_name !== profile.trade_name) {
      linhas.push({ rot: "Razão social", val: profile.legal_name });
    }
    linhas.push(
      { rot: "CNPJ", val: profile.cnpj ? maskCnpj(profile.cnpj) : "—" },
      { rot: "E-mail administrativo", val: ou(profile.email) },
      { rot: "Telefone", val: profile.phone ? maskPhone(profile.phone) : "—" },
      { rot: "Cidade", val: ou(end?.cidade) },
      { rot: "UF", val: ou(end?.uf) },
    );
    return linhas;
  }, [profile]);

  return {
    isAdmin,
    isProfileLoading,
    profileLoadFailed,
    logoUrl,
    iniciais: calcIniciais(nome),
    nome,
    rows,
    trocarLogo: uploadLogo,
    enviandoLogo: isUploading,
    editarAberto,
    abrirEditar: useCallback(() => setEditarAberto(true), []),
    fecharEditar: useCallback(() => setEditarAberto(false), []),
  };
}
