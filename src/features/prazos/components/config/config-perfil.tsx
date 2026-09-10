"use client";

import { Pencil } from "lucide-react";

import { IconAction } from "@/components/ui/icon-action";

import { useConfigPerfil } from "../../hooks/use-config-perfil";
import { ConfigAvatarUpload } from "./config-avatar-upload";
import { ConfigPerfilSessoes } from "./config-perfil-sessoes";
import { PerfilEditModal } from "./perfil-edit-modal";

// Aba Perfil — dados pessoais do Clerk (nome/e-mail/telefone/foto) + Cargo do BE.
// Experiência unificada e headless: "Editar dados" (nome) abre modal nosso;
// Senha e Sessões são cards inline (Clerk headless em componentes nossos).
export function ConfigPerfil() {
  const p = useConfigPerfil();

  return (
    <>
      <div className="mb-1 flex items-start justify-between gap-4">
        <div className="font-display text-[20px] font-medium">Perfil</div>
        <IconAction
          label="Editar dados"
          icon={Pencil}
          onClick={p.abrirEditar}
          className="pointer-coarse:size-11"
        />
      </div>
      <p className="text-fg3 mt-0 mb-[18px] text-[12.5px]">
        Seus dados pessoais e credenciais.
      </p>

      <ConfigAvatarUpload
        url={p.avatarUrl}
        iniciais={p.iniciais}
        label="Trocar foto"
        onFile={p.trocarFoto}
        enviando={p.enviandoFoto}
      />

      <div className="surface-panel overflow-hidden">
        {p.rows.map((l) => (
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

      <ConfigPerfilSessoes />

      {p.editarAberto ? <PerfilEditModal onFechar={p.fecharEditar} /> : null}
    </>
  );
}
