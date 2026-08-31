"use client";

import { ImageUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Captura do segundo fator: o advogado tira um PRINT do QR que o eproc mostra ao
 * configurar o 2º fator (ou exporta as contas do Google Authenticator) e sobe a
 * imagem aqui; como alternativa, pode colar o código manual. Nada do segredo fica
 * neste componente além do necessário para o upload — quem sela é o BE.
 *
 * Controlado: o pai guarda `file`/`secret` (precisa reenviar o MESMO print quando
 * o BE pede para escolher a conta). O preview é derivado do `file`.
 */
export function MfaCapture({
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

  // Preview derivado do arquivo (sem setState em effect) — o object URL é
  // memoizado e revogado no cleanup quando o file muda/desmonta.
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function selecionar(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return; // só imagem (print/QR)
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
        <div className="border-border relative overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Prévia do print do segundo fator"
            className="max-h-56 w-full bg-[var(--muted)] object-contain"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onFile(null)}
              className="bg-background/90 border-border hover:bg-background absolute top-2 right-2 grid size-7 place-items-center rounded-full border"
              aria-label="Remover imagem"
            >
              <X className="size-3.5" />
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
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
            dragging
              ? "border-[color-mix(in_oklch,var(--primary)_50%,transparent)] bg-[color-mix(in_oklch,var(--primary)_4%,transparent)]"
              : "border-border hover:bg-muted/40",
          )}
        >
          <ImageUp className="text-muted-foreground size-6" />
          <span className="text-[13px] font-medium">
            Enviar o print do segundo fator
          </span>
          <span className="text-muted-foreground text-xs">
            Arraste a imagem aqui ou clique para escolher — o print do QR que o
            tribunal mostra ao configurar o segundo fator.
          </span>
        </button>
      )}

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">ou cole o código</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <textarea
        value={secret}
        disabled={disabled}
        onChange={(e) => onSecret(e.target.value)}
        placeholder="Cole aqui o código/chave que aparece junto do QR"
        rows={2}
        className="border-border bg-background focus:border-primary w-full resize-none rounded-lg border px-3 py-2 text-[13px] outline-none"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
