"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
const PdfCanvas = dynamic(
  () =>
    import("@/features/documentos/components/pdf-canvas").then(
      (m) => m.PdfCanvas,
    ),
  { ssr: false },
);
export function PdfPreview({ url }: { url: string }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("download");
        const blob = await response.blob();
        if (!controller.signal.aborted) {
          setBlob(blob);
          setError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [url, attempt]);
  if (error)
    return (
      <div role="alert">
        <p>Não foi possível abrir a prévia.</p>
        <Button variant="outline" onClick={() => setAttempt((x) => x + 1)}>
          Tentar novamente
        </Button>
      </div>
    );
  return blob ? (
    <PdfCanvas blob={blob} />
  ) : (
    <p role="status">Carregando prévia do PDF…</p>
  );
}
