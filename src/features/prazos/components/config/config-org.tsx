"use client";

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
          <button
            onClick={o.abrirEditar}
            className="border-line bg-panel text-foreground hover:bg-hover flex-none rounded-lg border px-3.5 py-2 text-[12.5px] font-medium"
          >
            Editar dados
          </button>
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
        <div className="border-line bg-panel overflow-hidden rounded-xl border">
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
        <div className="border-line bg-panel overflow-hidden rounded-xl border">
          {o.rows.map((l) => (
            <div
              key={l.rot}
              className="border-line2 flex items-center gap-3.5 border-b px-4 py-3 last:border-b-0"
            >
              <span className="text-fg3 w-[120px] flex-none text-[12px]">
                {l.rot}
              </span>
              <span className="flex-1 text-[13px]">{l.val}</span>
            </div>
          ))}
        </div>
      )}

      {o.editarAberto ? <OrgEditModal onFechar={o.fecharEditar} /> : null}
    </>
  );
}
