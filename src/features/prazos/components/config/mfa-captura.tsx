"use client";

import { ImageUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// Captura do segundo fator: o advogado tira um print do QR que o tribunal mostra
// ao configurar o 2º fator (ou exporta as contas do autenticador) e sobe a imagem;
// alternativamente cola o código. Controlado pelo pai (precisa reenviar o MESMO
// print quando o BE pede para escolher a conta). Design da tela de Configurações.
export function MfaCaptura({
  file,
  onFile,
  secret,
  onSecret,
  disabled,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  secret: string;
  onSecret: (s: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function selecionar(f: File | undefined | null) {
    if (!f || !f.type.startsWith("image/")) return;
    onFile(f);
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => selecionar(e.target.files?.[0])}
      />

      {preview ? (
        <div className="border-line bg-bg relative overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Prévia do print do segundo fator"
            className="max-h-52 w-full object-contain"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onFile(null)}
              className="border-line bg-panel hover:bg-hover absolute top-2 right-2 grid size-7 place-items-center rounded-full border"
              aria-label="Remover imagem"
            >
              <X className="size-3.5" strokeWidth={1.8} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            selecionar(e.dataTransfer.files?.[0]);
          }}
          className={
            "border-line bg-bg row-hover flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed p-[26px_22px] text-center" +
            (dragging ? " border-primary" : "")
          }
        >
          <ImageUp className="text-primary size-[24px]" strokeWidth={1.7} />
          <span className="text-foreground text-[13px] font-medium">
            Enviar o print do segundo fator
          </span>
          <span className="text-fg3 text-[11.5px] leading-[1.5]">
            Arraste a imagem ou clique — o print do QR que o tribunal mostra ao
            configurar o segundo fator.
          </span>
        </button>
      )}

      <div className="flex items-center gap-3">
        <span className="bg-line h-px flex-1" />
        <span className="text-fg3 text-[11px]">ou cole o código</span>
        <span className="bg-line h-px flex-1" />
      </div>

      <textarea
        value={secret}
        disabled={disabled}
        onChange={(e) => onSecret(e.target.value)}
        placeholder="Cole aqui o código/chave que aparece junto do QR"
        rows={2}
        spellCheck={false}
        autoComplete="off"
        className="border-line bg-bg text-foreground w-full resize-none rounded-[9px] border px-[13px] py-2.5 text-[13px] outline-none"
      />
    </div>
  );
}
