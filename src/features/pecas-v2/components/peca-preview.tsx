"use client";

// Preview read-only da peça (usado nas telas Assinatura + Protocolo). Renderiza
// preâmbulo + section-cards sem editor rico — cada parágrafo vira <p>. Sem
// interação de autosave, sem toolbar, sem "refazer seção". Layout visualmente
// próximo do editor pra o advogado reconhecer a peça.

import type { DraftPreamble, DraftSection } from "../types";

interface Props {
  title: string;
  preamble: DraftPreamble;
  sections: DraftSection[];
}

export function PecaPreview({ title, preamble, sections }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-4">
      <h1 className="font-display text-foreground text-2xl leading-tight font-medium">
        {title}
      </h1>

      {preamble.paragraphs.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {preamble.paragraphs.map((p, i) => (
            <p key={i} className="text-foreground text-[14px] leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      )}

      {sections.map((s) => (
        <section key={s.id} className="border-border mt-6 rounded-lg border p-5">
          <h2 className="text-foreground text-[15px] font-medium">
            {s.roman} — {s.title}
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {s.paragraphs.map((p, i) => (
              <p key={i} className="text-foreground text-[14px] leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
