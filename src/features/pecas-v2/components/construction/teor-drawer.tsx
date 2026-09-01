"use client";

// Drawer lateral (direita) com o TEOR/AUTOS completo de uma fonte da "Fundada em".
// Aberto pelo "ver inteiro teor →" do card INTIMAÇÃO ou por um clique num item da
// Fundada em. Overlay + painel deslizante; fecha no X, no backdrop ou no Esc.

import { X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Rótulo do documento (ex.: "Intimação de origem"). */
  titulo: string;
  /** Badge do tipo (ex.: "Teor" | "Auto"). */
  tipo: string;
  /** Linha de metadados (ex.: "Publicado 24/08 · DJEN · ~1 lauda"). */
  meta: string;
  /** Texto integral (teor da intimação / conteúdo do documento). */
  conteudo: string;
}

export function TeorDrawer({
  open,
  onClose,
  titulo,
  tipo,
  meta,
  conteudo,
}: Props) {
  // Fecha no Esc enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />
      {/* painel */}
      <aside className="border-line bg-panel relative flex h-full w-[460px] max-w-[92vw] flex-none flex-col border-l shadow-[-8px_0_30px_oklch(0.27_0.012_200/10%)]">
        <div className="border-line flex items-center gap-2 border-b px-5 py-3.5">
          <span className="bg-green/15 text-green rounded-full px-[7px] py-0.5 text-[9px] font-semibold tracking-[0.03em] uppercase">
            {tipo}
          </span>
          <span className="text-[13px] font-medium">{titulo}</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-hover text-fg3 ml-auto grid size-7 place-items-center rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="text-fg3 border-line flex items-center gap-2 border-b px-5 py-2 text-[11px]">
          <span>{meta}</span>
          <span className="border-line ml-auto rounded border px-1.5 py-px font-mono text-[9.5px]">
            HTML
          </span>
        </div>
        {/* Fundo do drawer é o panel (claro); o conteúdo vive num CARD destacado
            (bg-background + borda, igual ao card da intimação) — o card é que
            ganha o fundo pra dar ênfase ao texto, não a área ao redor. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="border-line bg-background rounded-xl border px-6 py-5 shadow-[0_1px_2px_oklch(0.27_0.012_200/6%)]">
            <p className="text-foreground text-[13px] leading-[1.7] whitespace-pre-wrap">
              {conteudo || "Sem teor disponível."}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
