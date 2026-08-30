"use client";

import { Sparkles } from "lucide-react";

import type { usePeca } from "../../hooks/use-peca";

type Peca = ReturnType<typeof usePeca>;

// Barra de formatação sticky do editor (port 884-898). Botões são presentacionais
// (execCommand simplificado → toast); "Refazer com IA" re-dispara a geração.
export function PecaToolbar({ peca }: { peca: Peca }) {
  const m = peca.model;
  if (!m) return null;
  return (
    <div className="border-line sticky top-0 z-[4] flex flex-wrap items-center gap-[3px] border-b bg-[color-mix(in_oklch,var(--panel)_94%,transparent)] px-4 py-2 backdrop-blur-md">
      {m.toolbar.map((tb, i) =>
        tb.sep ? (
          <span key={i} className="bg-line mx-1 h-5 w-px" />
        ) : (
          <button
            key={i}
            onClick={() => peca.exec(tb.titulo)}
            title={tb.titulo}
            className="navi text-fg2 hover:bg-hover inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-[7px] px-2"
          >
            {tb.conteudo}
          </button>
        ),
      )}
      <button
        onClick={peca.refazer}
        className="text-primary ml-auto inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1.5 text-[11.5px] font-medium"
        style={{
          borderColor: "color-mix(in oklch, var(--primary) 35%, transparent)",
          background: "color-mix(in oklch, var(--primary) 7%, transparent)",
        }}
      >
        <Sparkles className="size-[13px]" strokeWidth={1.8} />
        Refazer com IA
      </button>
    </div>
  );
}
