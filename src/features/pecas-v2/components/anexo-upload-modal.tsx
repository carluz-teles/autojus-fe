"use client";

// Modal de upload de anexo — file picker + select de categoria (Procuração,
// Comprovante etc). Orquestra upload em 3 passos via useAttachDocument + fecha
// no sucesso. Progress bar simples durante o PUT no S3.

import { useEffect, useState } from "react";

import { Dialog } from "@/components/mock-ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ATTACHMENT_CATEGORIES,
  type AttachmentCategory,
  useAttachDocument,
} from "../hooks/use-attachments";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  draftId: string;
  courtRecordId: string;
}

export function AnexoUploadModal({
  aberto,
  onFechar,
  draftId,
  courtRecordId,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<AttachmentCategory>("Outro");
  const { upload, isUploading, progress, uploadError } =
    useAttachDocument(draftId);

  // Reseta o form ao abrir/fechar

  useEffect(() => {
    if (!aberto) {
      setFile(null);
      setCategory("Outro");
    }
  }, [aberto]);

  const handleUpload = () => {
    if (!file) return;
    upload({ file, category, courtRecordId }, { onSuccess: () => onFechar() });
  };

  return (
    <Dialog aberto={aberto} titulo="Anexar documento" onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-foreground text-[12.5px] font-medium">
            Arquivo
          </span>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isUploading}
            className="border-border bg-background text-foreground file:bg-muted file:text-foreground hover:file:bg-muted/70 rounded-md border px-3 py-2 text-[12.5px] file:mr-3 file:cursor-pointer file:rounded file:border-0 file:px-3 file:py-1 file:text-[12px] file:font-medium"
          />
          {file && (
            <span className="text-muted-foreground text-[11.5px]">
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-foreground text-[12.5px] font-medium">
            Tipo do documento
          </span>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as AttachmentCategory)}
            disabled={isUploading}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTACHMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {isUploading && progress != null && (
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-[width] duration-100"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}

        {uploadError && (
          <p className="text-destructive text-[12px]">
            Não foi possível enviar. Tente novamente.
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex-1"
          >
            {isUploading ? "Enviando…" : "Anexar"}
          </Button>
          <Button
            variant="outline"
            onClick={onFechar}
            disabled={isUploading}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
