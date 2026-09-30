"use client";

import { Dialog } from "@base-ui/react/dialog";
import { FolderOpen, X } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { useDocumentTemplates } from "../hooks/use-document-templates";

const PdfCanvas = dynamic(
  () =>
    import("@/features/documentos/components/pdf-canvas").then(
      (module) => module.PdfCanvas,
    ),
  { ssr: false },
);

export function TemplatePreviewDialog({
  preview,
  open,
}: {
  preview: ReturnType<typeof useDocumentTemplates>["preview"];
  open: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={preview.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/50" />
        <Dialog.Popup className="surface-panel border-line fixed top-1/2 left-1/2 z-[70] flex h-[92dvh] w-[1100px] max-w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border shadow-2xl">
          <div className="border-line bg-panel relative flex shrink-0 flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-4">
            <div className="min-w-0 pr-9 sm:flex-1 sm:pr-0">
              <p className="text-primary mb-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
                Prévia do modelo · {preview.name}
              </p>
              <Dialog.Title className="font-display text-[22px] leading-tight font-medium">
                Documento de exemplo
              </Dialog.Title>
              <Dialog.Description className="text-fg3 mt-1 text-[12px] leading-relaxed">
                {preview.result.data?.version
                  ? `Versão ${preview.result.data.version.version_no} · PDF de exemplo gerado a partir deste modelo.`
                  : "Carregando a versão disponível para prévia."}
              </Dialog.Description>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={preview.toggleZoom}
                disabled={!preview.result.data?.blob}
              >
                {preview.expanded ? "Ajustar à largura" : "Ampliar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={preview.openPdf}
                disabled={!preview.result.data?.blob}
              >
                <FolderOpen data-icon="inline-start" aria-hidden /> Abrir PDF
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={preview.close}
                aria-label="Fechar prévia"
                className="absolute top-2 right-2 sm:static"
              >
                <X aria-hidden />
              </Button>
            </div>
          </div>
          <div className="bg-bg min-h-0 flex-1 overflow-auto p-3 sm:p-6">
            {preview.result.isPending ? (
              <p
                role="status"
                className="text-fg3 py-12 text-center text-[13px]"
              >
                Carregando PDF de exemplo…
              </p>
            ) : preview.result.isError ? (
              <div className="mx-auto max-w-[440px] py-12 text-center">
                <p role="alert" className="text-destructive text-[13px]">
                  Não foi possível carregar a prévia.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={preview.retry}
                  className="mt-3"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : !preview.result.data?.blob ? (
              <p className="text-fg3 py-12 text-center text-[13px]">
                Este modelo ainda não tem uma versão pronta com PDF de exemplo.
              </p>
            ) : (
              <div
                className={cn(
                  "border-line mx-auto h-full min-h-0 overflow-hidden border bg-white shadow-[0_18px_45px_-28px_rgba(30,45,38,.5)]",
                  preview.expanded
                    ? "w-[1000px] max-w-none"
                    : "w-full max-w-[800px]",
                )}
              >
                <PdfCanvas
                  key={`${preview.result.data.version?.id}-${preview.expanded}`}
                  blob={preview.result.data.blob}
                />
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
