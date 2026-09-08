"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  type DocumentPreview as Preview,
  prepareDocumentPreview,
} from "../lib/document-preview";

const PdfCanvas = dynamic(
  () => import("./pdf-canvas").then((module) => module.PdfCanvas),
  { ssr: false },
);

/** One viewer for the actual file format, shared by process and piece drawers. */
export function DocumentPreview({
  blob,
  title,
  initialPage,
  onRetry,
}: {
  blob: Blob;
  title: string;
  initialPage?: number;
  onRetry: () => void;
}) {
  const [result, setResult] = useState<{
    blob: Blob;
    preview?: Preview;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void prepareDocumentPreview(blob)
      .then((preview) => {
        if (!cancelled) setResult({ blob, preview });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setResult({
            blob,
            error:
              error instanceof Error
                ? error.message
                : "Não foi possível abrir o documento.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [blob]);
  if (result?.blob !== blob)
    return (
      <div
        role="status"
        className="text-muted-foreground flex h-full items-center justify-center gap-2 p-6 text-sm"
      >
        <Loader2 className="size-4 animate-spin" />
        Preparando documento…
      </div>
    );
  if (result.error)
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-sm"
      >
        <p>{result.error}</p>
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  if (result.preview?.kind === "html")
    return (
      <iframe
        title={title}
        srcDoc={result.preview.srcDoc}
        sandbox=""
        referrerPolicy="no-referrer"
        className="h-full min-h-96 w-full rounded-lg border-0 bg-white"
      />
    );
  if (result.preview?.kind === "pdf")
    return <PdfCanvas blob={result.preview.blob} initialPage={initialPage} />;
  return null;
}
