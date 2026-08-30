"use client";

import { useConfigPerfil } from "../../hooks/use-config-perfil";
import { ConfigAvatarUpload } from "./config-avatar-upload";
import { ConfigPerfilSenha } from "./config-perfil-senha";
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
        <button
          onClick={p.abrirEditar}
          className="border-line bg-panel text-foreground hover:bg-hover flex-none rounded-lg border px-3.5 py-2 text-[12.5px] font-medium"
        >
          Editar dados
        </button>
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

      <div className="border-line bg-panel overflow-hidden rounded-xl border">
        {p.rows.map((l) => (
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

      <ConfigPerfilSenha />
      <ConfigPerfilSessoes />

      {p.editarAberto ? <PerfilEditModal onFechar={p.fecharEditar} /> : null}
    </>
  );
}
