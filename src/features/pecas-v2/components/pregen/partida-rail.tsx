"use client";

// Rail de contexto da PARTIDA (antes da peça existir). Diferente do ContextRail
// (que exige um Draft carregado), aqui só temos a INTIMAÇÃO + as teses geradas.
// "FUNDADA EM" é derivada das próprias teses (os documentos de origem que elas
// citam) — é a proveniência agregada, sem depender de um draft. O bloco
// "TESES A INCLUIR" entra via `tesesSlot`.

import { FileText, Mail } from "lucide-react";
import type { ReactNode } from "react";

import type { Thesis } from "../../types";

interface Props {
  intimacaoId: string;
  theses: Thesis[];
  highlightedDocId: string | null;
  tesesSlot: ReactNode;
}

export function PartidaRail({
  intimacaoId,
  theses,
  highlightedDocId,
  tesesSlot,
}: Props) {
  // Fontes distintas citadas pelas teses (proveniência agregada → "Fundada em").
  const sources = dedupeSources(theses);

  return (
    <div className="border-line bg-panel w-72 flex-none overflow-y-auto border-r p-4">
      <SectionLabel>Origem</SectionLabel>
      <div className="mt-1 flex items-start gap-2.5">
        <Mail className="text-fg3 mt-0.5 size-[15px] flex-none" />
        <div className="min-w-0 flex-1">
          <div className="text-fg2 text-[12px] font-medium">Intimação</div>
          <div className="text-fg3 mt-px font-mono text-[10.5px]">
            {intimacaoId.slice(0, 8)}…
          </div>
        </div>
      </div>
      <p className="text-fg3 mt-3 text-[11px] leading-[1.5]">
        A peça ainda não existe. Selecione as teses e clique{" "}
        <strong className="text-foreground font-medium">Gerar minuta</strong>{" "}
        para criá-la.
      </p>

      {sources.length > 0 && (
        <>
          <SectionLabel className="mt-5">Fundada em</SectionLabel>
          <div className="mt-1 flex flex-col gap-1.5">
            {sources.map((s) => (
              <div
                key={s.id}
                id={`fundada-em-${s.id}`}
                className={`bg-background flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                  highlightedDocId === s.id
                    ? "border-primary/50"
                    : "border-line"
                }`}
              >
                <FileText className="text-fg3 mt-px size-[13px] flex-none" />
                <span className="text-fg2 min-w-0 flex-1 truncate text-[11px]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tesesSlot}
    </div>
  );
}

/** Fontes distintas (por sourceDocumentId), preservando o primeiro rótulo visto. */
function dedupeSources(theses: Thesis[]): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const t of theses) {
    if (t.sourceDocumentId && !seen.has(t.sourceDocumentId)) {
      seen.set(t.sourceDocumentId, t.sourceLabel || "Documento");
    }
  }
  return [...seen].map(([id, label]) => ({ id, label }));
}

function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-fg3 text-[10.5px] font-medium tracking-[0.05em] uppercase ${className}`}
    >
      {children}
    </div>
  );
}
