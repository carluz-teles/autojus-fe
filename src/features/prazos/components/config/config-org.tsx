"use client";

import { Pencil } from "lucide-react";

import { IconAction } from "@/components/ui/icon-action";

import { useConfigOrg } from "../../hooks/use-config-org";
import { ConfigAvatarUpload } from "./config-avatar-upload";
import { OrgEditModal } from "./org-edit-modal";

// Aba Organização — dados fiscais do BE (useOrgProfile) + logo do Clerk
// (useOrgLogo), com a mesma imagem/upload do Perfil. Editar (ADMIN) abre o
// modal de perfil fiscal. Componente = JSX + binding.
export function ConfigOrg() {
  const o = useConfigOrg();

  return (
    <>
      <div className="mb-1 flex items-start justify-between gap-4">
        <div className="font-display text-[20px] font-medium">Organização</div>
        {o.isAdmin && !o.profileLoadFailed ? (
          <IconAction
            label="Editar dados do escritório"
            icon={Pencil}
            onClick={o.abrirEditar}
            className="pointer-coarse:size-11"
          />
        ) : null}
      </div>
      <p className="text-fg3 mt-0 mb-[18px] text-[12.5px]">
        Dados do escritório e identidade visual.
      </p>

      <ConfigAvatarUpload
        url={o.logoUrl}
        iniciais={o.iniciais}
        label="Trocar logo"
        onFile={o.trocarLogo}
        enviando={o.enviandoLogo}
        podeEditar={o.isAdmin}
      />

      {o.profileLoadFailed ? (
        <p className="text-destructive text-[12.5px]">
          Não foi possível carregar os dados do escritório.
        </p>
      ) : o.isProfileLoading ? (
        <div className="surface-panel overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-line2 flex items-center gap-3.5 border-b px-4 py-3.5 last:border-b-0"
            >
              <span className="bg-hover h-3 w-[120px] flex-none animate-pulse rounded" />
              <span className="bg-hover h-3 flex-1 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-panel overflow-hidden">
          {o.rows.map((l) => (
            <div
              key={l.rot}
              className="border-line2 flex flex-col items-start gap-1 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3.5"
            >
              <span className="text-fg3 w-auto flex-none text-[12px] sm:w-[120px]">
                {l.rot}
              </span>
              <span className="min-w-0 flex-1 text-[13px] [overflow-wrap:anywhere] break-words">
                {l.val}
              </span>
            </div>
          ))}
        </div>
      )}

      {o.editarAberto ? <OrgEditModal onFechar={o.fecharEditar} /> : null}
    </>
  );
}
