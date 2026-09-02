"use client";

// Drawer lateral (direita) que embute o PDF ORIGINAL de um documento dos autos —
// fiel ao documento, sem o texto reconstruído (que é feito pra embeddings, não pra
// leitura). Mesma casca do TeorDrawer (overlay + painel deslizante, fecha no X /
// backdrop / Esc); o corpo é um viewer <object> alimentado por um object URL
// (bytes buscados com auth via useDocumentFile). Aberto por um clique num item da
// "Fundada em" (ou por "ver fonte" numa tese ancorada no auto).

import { Loader2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect } from "react";

import { useDocumentFile } from "../../hooks/use-document-file";

// pdf.js é browser-only (toca DOMMatrix/worker) — carrega só no cliente pra não
// avaliar no SSR (quebraria o build do Next).
const PdfCanvas = dynamic(
  () => import("./pdf-canvas").then((m) => m.PdfCanvas),
  { ssr: false },
);

interface Props {
  /** Documento aberto (id/título/meta) ou null quando fechado. */
  doc: { id: string; titulo: string; meta: string } | null;
  onClose: () => void;
}

export function PdfDrawer({ doc, onClose }: Props) {
  const open = doc !== null;
  const { blob, loading, error } = useDocumentFile(doc?.id ?? null);

  // Fecha no Esc enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />
      <aside className="border-line bg-panel relative flex h-full w-[640px] max-w-[94vw] flex-none flex-col border-l shadow-[-8px_0_30px_oklch(0.27_0.012_200/10%)]">
        <div className="border-line flex items-center gap-2 border-b px-5 py-3.5">
          <span className="bg-primary/15 text-primary rounded-full px-[7px] py-0.5 text-[9px] font-semibold tracking-[0.03em] uppercase">
            Auto
          </span>
          <span className="text-[13px] font-medium">{doc.titulo}</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-hover text-fg3 ml-auto grid size-7 place-items-center rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="text-fg3 border-line flex items-center gap-2 border-b px-5 py-2 text-[11px]">
          <span>{doc.meta}</span>
          <span className="border-line ml-auto rounded border px-1.5 py-px font-mono text-[9.5px]">
            PDF
          </span>
        </div>

        <div className="bg-background min-h-0 flex-1">
          {loading && (
            <div className="text-fg3 flex h-full items-center justify-center gap-2 text-[12px]">
              <Loader2 className="size-4 animate-spin" />
              Carregando documento…
            </div>
          )}
          {error && (
            <div className="text-fg3 flex h-full items-center justify-center px-8 text-center text-[12px]">
              Não foi possível abrir o documento.
            </div>
          )}
          {blob && !loading && !error && <PdfCanvas blob={blob} />}
        </div>
      </aside>
    </div>
  );
}
