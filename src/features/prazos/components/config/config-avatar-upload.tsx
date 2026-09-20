"use client";

import { Camera, ImagePlus } from "lucide-react";
import { useRef } from "react";

// Avatar (foto/logo) + botão de upload, compartilhado por Perfil (foto do usuário)
// e Organização (logo do escritório). Mesma linguagem do onboarding: anel em
// degradê primário→latão, círculo clicável com overlay de câmera no hover, selo
// dourado quando vazio, spinner no envio. Sem imagem, cai nas iniciais discretas.
// O upload real vive no hook chamador (Clerk setProfileImage / setLogo).
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
  const open = () => inputRef.current?.click();

  return (
    <div className="surface-inset mb-[18px] flex items-center gap-4 p-3.5">
      <button
        type="button"
        onClick={podeEditar ? open : undefined}
        disabled={!podeEditar}
        aria-label={podeEditar ? label : undefined}
        className="group focus-visible:ring-primary/40 relative flex-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-default"
      >
        <span
          className="grid size-14 place-items-center rounded-full p-[2.5px] transition-transform duration-200 group-enabled:group-hover:scale-[1.03]"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--primary), var(--gold))",
          }}
        >
          <span className="bg-panel text-primary relative grid size-full place-items-center overflow-hidden rounded-full text-[17px] font-semibold">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              iniciais
            )}
            {podeEditar ? (
              <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Camera className="size-5 text-white" strokeWidth={1.8} />
              </span>
            ) : null}
            {enviando ? (
              <span className="absolute inset-0 grid place-items-center bg-black/45">
                <span className="spin size-5 rounded-full border-2 border-white/40 border-t-white" />
              </span>
            ) : null}
          </span>
        </span>
        {podeEditar && !url && !enviando ? (
          <span
            className="text-primary-foreground absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full ring-2 ring-[var(--panel)]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--primary), var(--gold))",
            }}
          >
            <ImagePlus className="size-3" strokeWidth={2} />
          </span>
        ) : null}
      </button>

      {podeEditar ? (
        <>
          <button
            onClick={open}
            disabled={enviando}
            className="border-line bg-panel text-foreground hover:bg-hover min-h-9 rounded-lg border px-3.5 py-2 text-[12.5px] transition-colors disabled:opacity-50 pointer-coarse:min-h-11"
          >
            {enviando ? "Enviando…" : url ? "Trocar imagem" : label}
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
