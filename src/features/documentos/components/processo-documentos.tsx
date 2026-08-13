"use client";

import { FileText, Loader2, Upload } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { useDocumentosDoProcesso } from "../hooks/use-documentos-do-processo";
import { DocumentoRow } from "./documento-row";

// Aba "Documentos" do processo: envio por link seguro (presigned, 3 passos) + lista com
// selo de origem, baixar e excluir. Só JSX + binding — toda a lógica (upload em 3 passos,
// download, exclusão, polling que se auto-desliga) vive no hook público.
export function ProcessoDocumentos({ processoId }: { processoId: string }) {
  const {
    documentos,
    isEmpty,
    isPending,
    isError,
    error,
    upload,
    excluir,
    baixar,
  } = useDocumentosDoProcesso(processoId);

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho + envio */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Autos e peças anexadas — a IA fundamenta as revisões nestes
          documentos.
        </p>
        <label
          className={cn(
            buttonVariants({ size: "sm" }),
            "cursor-pointer",
            upload.isUploading && "pointer-events-none opacity-50",
          )}
        >
          {upload.isUploading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Upload />
          )}
          {upload.isUploading ? "Enviando…" : "Enviar documento"}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={upload.isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.enviar(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Barra de progresso do upload em andamento */}
      {upload.progress !== null ? (
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${upload.progress}%` }}
          />
        </div>
      ) : null}

      {upload.uploadError ? (
        <p className="text-destructive text-sm">
          {upload.uploadError instanceof ApiError
            ? upload.uploadError.message
            : upload.uploadError.message}
        </p>
      ) : null}

      {/* Corpo: loading / erro / vazio / lista */}
      {isPending ? (
        <div className="flex flex-col gap-2">
          <div className="bg-muted/50 h-16 animate-pulse rounded-xl" />
          <div className="bg-muted/50 h-16 animate-pulse rounded-xl" />
        </div>
      ) : isError ? (
        <p className="border-destructive/30 bg-destructive/[0.03] text-destructive rounded-xl border px-4 py-6 text-center text-sm">
          {error instanceof ApiError
            ? error.message
            : "Erro ao carregar os documentos."}
        </p>
      ) : isEmpty ? (
        <div className="text-muted-foreground flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center text-sm">
          <FileText className="size-5 opacity-60" />
          <span className="max-w-xs">
            Nenhum documento — envie os autos ou uma peça para a IA fundamentar.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {documentos.map((doc) => (
            <DocumentoRow
              key={doc.id}
              doc={doc}
              onBaixar={baixar.mutate}
              onExcluir={excluir.mutate}
              baixando={baixar.isPending && baixar.variables === doc.id}
              excluindo={excluir.isPending && excluir.variables === doc.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
