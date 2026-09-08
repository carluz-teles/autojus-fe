"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import { useDocumentFile } from "../hooks/use-document-file";
import { DocumentPreview } from "./document-preview";

export interface OpenDocument {
  id: string;
  titulo: string;
  meta: string;
  initialPage?: number;
}

/** Visualizador único dos autos, usado no processo e na construção de peças. */
export function PdfDrawer({
  doc,
  onClose,
}: {
  doc: OpenDocument | null;
  onClose: () => void;
}) {
  const { blob, loading, error, retry } = useDocumentFile(doc?.id ?? null);
  return (
    <Sheet
      open={doc !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        title={doc?.titulo ?? "Documento"}
        description={doc?.meta}
        eyebrow="Autos · Documento original"
        className="max-w-[860px]"
      >
        <div className="bg-muted/30 h-full min-h-64 rounded-lg border">
          {loading ? (
            <div
              role="status"
              className="text-muted-foreground flex h-full items-center justify-center gap-2 p-6 text-sm"
            >
              <Loader2 className="size-4 animate-spin" /> Carregando documento…
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-sm"
            >
              <p>Não foi possível abrir o documento.</p>
              <Button variant="outline" onClick={() => void retry()}>
                Tentar novamente
              </Button>
            </div>
          ) : blob ? (
            <DocumentPreview
              blob={blob}
              title={doc?.titulo ?? "Documento"}
              initialPage={doc?.initialPage}
              onRetry={() => void retry()}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
