"use client";

import { ImageUp, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Textarea } from "@/components/ui/textarea";

// Captura do segundo fator: o advogado tira um print do QR que o tribunal mostra
// ao configurar o 2º fator (ou exporta as contas do autenticador) e sobe a imagem;
// alternativamente cola o código. Controlado pelo pai (precisa reenviar o MESMO
// print quando o BE pede para escolher a conta). Design da tela de Configurações.
// Não tem submit próprio: é um controlado (file + secret) do wizard de conexão; a
// mensagem de erro do 2FA fica no pai. Aqui usamos os componentes Field/Textarea.
export function MfaCaptura({
  file,
  onFile,
  secret,
  onSecret,
  disabled,
  invalid,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  secret: string;
  onSecret: (s: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const secretId = useId();

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
            <IconAction
              label="Remover imagem"
              icon={X}
              type="button"
              onClick={() => onFile(null)}
              className="border-line bg-panel hover:bg-hover absolute top-2 right-2 rounded-full border pointer-coarse:size-11"
            />
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
        <span className="text-fg3 text-[11px]">ou informe a chave TOTP</span>
        <span className="bg-line h-px flex-1" />
      </div>

      <Field data-invalid={!!invalid}>
        <FieldLabel htmlFor={secretId} className="sr-only">
          Chave de configuração TOTP
        </FieldLabel>
        <Textarea
          id={secretId}
          value={secret}
          disabled={disabled}
          onChange={(e) => onSecret(e.target.value)}
          placeholder="Chave de configuração, não o código de seis dígitos"
          rows={2}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!!invalid}
          className="min-h-0 resize-none"
        />
      </Field>
    </div>
  );
}
