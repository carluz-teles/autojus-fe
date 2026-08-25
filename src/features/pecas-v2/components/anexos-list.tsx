"use client";

// Lista read-only de anexos da peça — usada nas telas Assinatura e Protocolo
// pra o advogado conferir quais documentos vão junto antes de assinar/protocolar.
// Sem botões de adicionar/remover: quem edita anexos é a Construção.

import type { DraftAttachment } from "../types";

interface Props {
  attachments: DraftAttachment[];
}

export function AnexosList({ attachments }: Props) {
  if (attachments.length === 0) {
    return (
      <div className="border-border rounded-xl border p-5">
        <h2 className="font-display text-lg font-medium">Anexos</h2>
        <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
          Nenhum documento anexado. Volte para Construção se precisar juntar
          procuração, comprovantes ou outros documentos antes de protocolar.
        </p>
      </div>
    );
  }
  return (
    <div className="border-border rounded-xl border p-5">
      <h2 className="font-display text-lg font-medium">
        Anexos{" "}
        <span className="text-muted-foreground ml-1 text-[13px] font-normal">
          ({attachments.length})
        </span>
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {attachments.map((a) => (
          <li
            key={a.id}
            className="border-border rounded-lg border px-3 py-2.5"
          >
            <div className="text-foreground truncate text-[12.5px] font-medium">
              {a.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-[var(--gold-light,rgba(212,175,55,0.15))] px-1.5 py-0.5 text-[10px] font-medium tracking-[0.02em] text-[var(--gold,#a67c1c)] uppercase">
                {a.category}
              </span>
              <span className="text-muted-foreground text-[11px]">
                {a.sizeLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
