"use client";

import { useRef } from "react";

// Avatar (foto/logo) + botão que abre o seletor de arquivo, compartilhado por
// Perfil (foto do usuário) e Organização (logo do escritório). Sem imagem, cai
// no fallback de iniciais discreto. O upload real vive no hook chamador (Clerk
// setProfileImage / setLogo); aqui é só binding do <input type=file>.
export function ConfigAvatarUpload({
  url,
  iniciais,
  label,
  onFile,
  enviando,
  podeEditar = true,
}: {
  url: string | null;
  iniciais: string;
  label: string;
  onFile: (file: File) => void;
  enviando: boolean;
  podeEditar?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-[18px] flex items-center gap-3.5">
      <span className="text-primary grid size-14 flex-none place-items-center overflow-hidden rounded-full text-[18px] font-semibold [background:color-mix(in_oklch,var(--primary)_14%,transparent)]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          iniciais
        )}
      </span>
      {podeEditar ? (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2 text-[12.5px] disabled:opacity-50"
          >
            {enviando ? "Enviando…" : label}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
        </>
      ) : null}
    </div>
  );
}
