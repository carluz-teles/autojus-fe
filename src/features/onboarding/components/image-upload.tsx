"use client";

import { Camera, ImagePlus } from "lucide-react";
import { useRef } from "react";

// Upload de imagem do onboarding (avatar do usuário / logo do escritório). Diferente
// do ConfigAvatarUpload (Configurações), aqui a peça é o herói do passo: círculo com
// anel em degradê primário→latão, o círculo INTEIRO é clicável (alvo grande), hover
// revela um overlay com câmera, e o estado de envio mostra spinner. Mantém a
// linguagem do app (verde/latão, iniciais discretas quando vazio). transform/opacity
// só (150–250ms), com foco visível e aria-label — acessível.
export function OnboardingImageUpload({
  url,
  initials,
  label,
  hint,
  onFile,
  uploading = false,
}: {
  url: string | null;
  initials: string;
  label: string;
  hint?: string;
  onFile: (file: File) => void;
  uploading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const open = () => inputRef.current?.click();

  return (
    <div className="mb-[18px] flex flex-col items-center gap-2.5">
      <button
        type="button"
        onClick={open}
        aria-label={label}
        className="group focus-visible:ring-primary/40 relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {/* anel em degradê primário→latão */}
        <span
          className="grid size-[92px] place-items-center rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-100"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--primary), var(--gold))",
          }}
        >
          <span className="bg-panel relative grid size-full place-items-center overflow-hidden rounded-full">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              <span
                className="text-[26px] font-semibold"
                style={{ color: "var(--primary)" }}
              >
                {initials}
              </span>
            )}

            {/* overlay de hover com câmera */}
            <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Camera className="size-6 text-white" strokeWidth={1.8} />
            </span>

            {/* spinner de envio */}
            {uploading ? (
              <span className="absolute inset-0 grid place-items-center bg-black/45">
                <span className="spin size-6 rounded-full border-2 border-white/40 border-t-white" />
              </span>
            ) : null}
          </span>
        </span>

        {/* selinho de adicionar no canto */}
        {!url && !uploading ? (
          <span
            className="text-primary-foreground absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full ring-2 ring-[var(--panel)] transition-transform duration-200 group-hover:scale-110"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--primary), var(--gold))",
            }}
          >
            <ImagePlus className="size-3.5" strokeWidth={2} />
          </span>
        ) : null}
      </button>

      <button
        type="button"
        onClick={open}
        disabled={uploading}
        className="text-fg3 hover:text-foreground text-[12px] transition-colors disabled:opacity-50"
      >
        {uploading ? "Enviando…" : url ? "Trocar imagem" : label}
      </button>
      {hint ? <p className="text-fg3 text-[11px]">{hint}</p> : null}

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
    </div>
  );
}
