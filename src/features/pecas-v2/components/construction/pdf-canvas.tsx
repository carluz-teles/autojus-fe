"use client";

// Renderiza um PDF (Blob) em canvas via pdf.js — NÃO depende do plugin nativo de
// PDF do browser (que muitos Chrome desabilitam ou trocam por download), então o
// documento sempre aparece embutido. Renderiza TODAS as páginas empilhadas, cada
// uma num canvas ajustado à largura do container (HiDPI-aware). O worker do pdf.js
// é servido de /public (pdf.worker.min.mjs, versão casada com pdfjs-dist).

import { Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function PdfCanvas({ blob }: { blob: Blob }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    const host = hostRef.current;
    setRendering(true);
    setError(false);

    (async () => {
      try {
        const data = await blob.arrayBuffer();
        if (cancelled || !host) return;
        task = pdfjsLib.getDocument({ data });
        const pdf = await task.promise;
        if (cancelled) return;

        host.replaceChildren();
        const targetW = (host.clientWidth || 600) - 24;
        const outputScale = window.devicePixelRatio || 1;

        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(2, targetW / base.width);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.className = "mx-auto mb-3 rounded shadow-sm";
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.maxWidth = "100%";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          host.appendChild(canvas);

          await page.render({
            canvasContext: ctx,
            viewport,
            transform:
              outputScale !== 1
                ? [outputScale, 0, 0, outputScale, 0, 0]
                : undefined,
          }).promise;
          if (cancelled) return;
        }
        if (!cancelled) setRendering(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setRendering(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [blob]);

  return (
    <div className="relative h-full overflow-y-auto px-3 py-3">
      {rendering && !error && (
        <div className="text-fg3 absolute inset-0 flex items-center justify-center gap-2 text-[12px]">
          <Loader2 className="size-4 animate-spin" />
          Renderizando documento…
        </div>
      )}
      {error && (
        <div className="text-fg3 absolute inset-0 flex items-center justify-center px-8 text-center text-[12px]">
          Não foi possível renderizar o documento.
        </div>
      )}
      <div ref={hostRef} />
    </div>
  );
}
