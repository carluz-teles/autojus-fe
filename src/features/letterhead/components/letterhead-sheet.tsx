"use client";

import { LoaderCircle, UploadCloud } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  useCreateLetterhead,
  useLetterhead,
  useUpdateLetterhead,
} from "../hooks/use-letterheads";
import {
  DEFAULT_MARGINS,
  type LetterheadContentType,
  type LetterheadMargins,
  type LetterheadView,
} from "../types";
import { LetterheadPreview } from "./letterhead-preview";

const ACCEPTED: LetterheadContentType[] = ["image/png", "image/jpeg"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MARGIN_KEYS: { key: keyof LetterheadMargins; label: string }[] = [
  { key: "top_mm", label: "Superior (mm)" },
  { key: "right_mm", label: "Direita (mm)" },
  { key: "bottom_mm", label: "Inferior (mm)" },
  { key: "left_mm", label: "Esquerda (mm)" },
];

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sheet de adicionar/editar papel timbrado. Fica montado só quando aberto e é
 * remontado por `key` a cada alvo, então o formulário nasce sempre limpo. A
 * orquestração de rede (upload em 3 passos, PATCH) vive nos hooks.
 */
export function LetterheadSheet({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LetterheadView | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <LetterheadSheetForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function LetterheadSheetForm({
  editing,
  onDone,
}: {
  editing: LetterheadView | null;
  onDone: () => void;
}) {
  const uid = useId();
  const isEdit = !!editing;
  const create = useCreateLetterhead();
  const update = useUpdateLetterhead(editing?.id ?? "");
  // No modo edição buscamos o detalhe só para o `asset_url` (preview real do timbre).
  const detail = useLetterhead(isEdit ? editing.id : null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(editing?.name ?? "");
  const [margins, setMargins] = useState<LetterheadMargins>(
    editing?.margins ?? DEFAULT_MARGINS,
  );
  const [isDefault, setIsDefault] = useState(editing?.is_default ?? false);

  // Object URL do arquivo escolhido para o preview ao vivo — derivado do arquivo
  // (não é server state); o efeito abaixo só cuida de revogá-lo ao trocar/desmontar.
  const localUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    if (!localUrl) return;
    return () => URL.revokeObjectURL(localUrl);
  }, [localUrl]);

  const busy = create.isSaving || update.isPending;
  const previewUrl = localUrl ?? (isEdit ? detail.data?.asset_url : undefined);
  const canSave = isEdit
    ? name.trim().length > 0
    : !!file && name.trim().length > 0;

  function pickFile(picked: File | undefined) {
    if (!picked) return;
    if (!ACCEPTED.includes(picked.type as LetterheadContentType)) {
      toast.error("Formato inválido. Envie um PNG ou JPEG.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error("Arquivo muito grande. O limite é 10 MB.");
      return;
    }
    setFile(picked);
    if (!name.trim()) setName(picked.name.replace(/\.[^.]+$/, ""));
  }

  function setMargin(key: keyof LetterheadMargins, raw: string) {
    const value = Math.max(0, Math.min(60, Number(raw) || 0));
    setMargins((m) => ({ ...m, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !canSave) return;
    if (isEdit) {
      update.mutate({ name: name.trim(), margins }, { onSuccess: onDone });
      return;
    }
    if (!file) return;
    try {
      await create.salvar({
        file,
        name: name.trim(),
        margins,
        is_default: isDefault,
      });
      onDone();
    } catch {
      // erro já sinalizado por toast no hook; mantém o sheet aberto com os dados
    }
  }

  return (
    <SheetContent
      title={isEdit ? "Editar papel timbrado" : "Adicionar papel timbrado"}
      description="Suba a imagem do timbre e defina a área segura onde o texto da peça será impresso."
      footer={
        <>
          <Button variant="outline" onClick={onDone} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form={uid} disabled={busy || !canSave}>
            {busy ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : null}
            {isEdit ? "Salvar alterações" : "Salvar timbrado"}
          </Button>
        </>
      }
    >
      <form id={uid} onSubmit={submit}>
        <FieldGroup className="gap-5">
          {/* Imagem do timbrado */}
          <Field>
            <FieldLabel htmlFor={isEdit ? undefined : `${uid}-file`}>
              Imagem do timbrado
            </FieldLabel>
            {isEdit ? (
              <div className="flex items-center gap-3">
                <LetterheadPreview
                  margins={margins}
                  imageUrl={detail.data?.asset_url}
                  className="w-16 shrink-0"
                />
                <FieldDescription>
                  A imagem não pode ser trocada aqui. Para usar outro timbre,
                  adicione um novo papel timbrado.
                </FieldDescription>
              </div>
            ) : (
              <>
                <input
                  ref={fileInput}
                  id={`${uid}-file`}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? undefined)}
                />
                {file ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {file.name}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatBytes(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="text-primary ml-auto text-xs font-medium underline-offset-4 hover:underline"
                      >
                        Trocar arquivo
                      </button>
                    </div>
                    {create.progress !== null ? (
                      <div
                        className="bg-muted h-1.5 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-valuenow={create.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          className="bg-primary block h-full rounded-full transition-[width] duration-200"
                          style={{ width: `${create.progress}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="border-border bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center text-sm transition-colors outline-none focus-visible:ring-3"
                  >
                    <UploadCloud
                      className="text-muted-foreground size-7"
                      strokeWidth={1.5}
                    />
                    <span>
                      Clique para{" "}
                      <span className="text-primary font-medium">
                        escolher do computador
                      </span>
                    </span>
                    <span className="text-fg3 text-xs">
                      PNG ou JPEG · até 10 MB · proporção A4 recomendada
                    </span>
                  </button>
                )}
              </>
            )}
          </Field>

          {/* Nome */}
          <Field>
            <FieldLabel htmlFor={`${uid}-name`}>Nome</FieldLabel>
            <Input
              id={`${uid}-name`}
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Timbrado principal"
              required
            />
          </Field>

          {/* Área segura (margens) + preview ao vivo */}
          <Field>
            <FieldLabel>Área segura (margens)</FieldLabel>
            <div className="grid grid-cols-[1fr_112px] items-start gap-4">
              <div className="grid grid-cols-2 gap-2.5">
                {MARGIN_KEYS.map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label
                      htmlFor={`${uid}-${key}`}
                      className="text-fg3 text-[11.5px]"
                    >
                      {label}
                    </label>
                    <Input
                      id={`${uid}-${key}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={60}
                      className="h-9"
                      value={margins[key]}
                      onChange={(e) => setMargin(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <LetterheadPreview margins={margins} imageUrl={previewUrl} />
                <span className="text-fg3 text-center text-[11px]">
                  Área do corpo
                </span>
              </div>
            </div>
            <FieldDescription>
              Padrão ABNT forense: 3 · 2 · 2 · 3 cm. O corpo é impresso dentro
              dessa área para não colidir com o timbre.
            </FieldDescription>
          </Field>

          {/* Definir como padrão (apenas na criação) */}
          {isEdit ? null : (
            <Field
              orientation="horizontal"
              className={cn("border-border items-start border-t pt-4")}
            >
              <FieldLabel
                htmlFor={`${uid}-default`}
                className="flex-col items-start gap-1"
              >
                <span className="text-sm font-medium">Definir como padrão</span>
                <FieldDescription>
                  Usado na assinatura e quando nenhum timbrado é escolhido no
                  export.
                </FieldDescription>
              </FieldLabel>
              <Switch
                id={`${uid}-default`}
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </Field>
          )}
        </FieldGroup>
      </form>
    </SheetContent>
  );
}
