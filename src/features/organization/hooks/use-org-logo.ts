"use client";

import { useOrganization } from "@clerk/nextjs";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Logo da organização — Clerk-nativo (organization.setLogo), mesmo mecanismo do
 * passo "Sua empresa" do onboarding, mas sem staging: aqui a org já existe, então
 * o upload é imediato. Nenhuma volta ao BE — o logo não faz parte do profile
 * (internal/identity), é asset do Clerk mesmo (igual sidebar-org.tsx já lê).
 */
export function useOrgLogo() {
  const { organization } = useOrganization();
  const [isUploading, setIsUploading] = useState(false);

  const uploadLogo = async (file: File) => {
    if (!organization) return;
    setIsUploading(true);
    try {
      await organization.setLogo({ file });
      toast.success("Logo atualizada.");
    } catch {
      toast.error("Não foi possível atualizar a foto. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  return {
    // Só o logo de verdade (upload do admin) — o imageUrl "default" que o Clerk
    // gera sozinho (hasImage=false) é um círculo colorido chamativo, destoa do
    // resto do design; sem upload, o card cai pro fallback de iniciais discreto.
    logoUrl: organization?.hasImage ? organization.imageUrl : null,
    uploadLogo,
    isUploading,
  };
}
