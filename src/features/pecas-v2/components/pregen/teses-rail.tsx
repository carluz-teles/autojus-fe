"use client";

// Bloco TESES A INCLUIR do rail (contrato Teses). Cada linha:
//   - checkbox `marca` por estado (off:vazio / pending_add:· / included:✓ / pending_remove:–)
//   - label + badge "no texto" (só quando included) + affordance de grounding (✓ verde / ? dourado)
//   - foundation (desc)
//   - linha de fonte (legalRef + sourceLabel) com ação "ver fonte" → destaca o
//     attachment correspondente em FUNDADA EM (provenance).
// Clicar na linha alterna o estado via PATCH (propor): off↔pending_add,
// included↔pending_remove. A contagem selecionada = included ∪ pending_add.

import { Link2 } from "lucide-react";

import type { Thesis, ThesisState } from "../../types";

interface Props {
  theses: Thesis[];
  selectedCount: number;
  isLoading: boolean;
  isError: boolean;
  onToggle: (thesis: Thesis) => void;
  onFonte: (sourceDocumentId: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function TesesRail({
  theses,
  selectedCount,
  isLoading,
  isError,
  onToggle,
  onFonte,
  onRegenerate,
  isRegenerating,
}: Props) {
  return (
    <>
      <div className="text-fg3 mt-5 mb-2 flex items-center gap-2 text-[10.5px] font-medium tracking-[0.05em] uppercase">
        <span className="flex-1">
          Teses a incluir <span className="text-primary">{selectedCount}</span>
        </span>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="text-primary hover:bg-hover rounded px-1.5 py-0.5 text-[10px] font-medium tracking-normal normal-case disabled:opacity-60"
        >
          {isRegenerating ? "Gerando…" : theses.length ? "Regerar" : "Gerar"}
        </button>
      </div>

      {isLoading && <RailNote>Carregando teses…</RailNote>}
      {isError && (
        <RailNote>Não foi possível carregar as teses. Tente regerar.</RailNote>
      )}
      {!isLoading && !isError && theses.length === 0 && (
        <RailNote>
          Nenhuma tese ainda. Gere sugestões ancoradas nos documentos da peça.
        </RailNote>
      )}

      <div className="flex flex-col gap-[7px]">
        {theses.map((t) => (
          <TeseRow
            key={t.id}
            thesis={t}
            onToggle={onToggle}
            onFonte={onFonte}
          />
        ))}
      </div>
    </>
  );
}

function TeseRow({
  thesis,
  onToggle,
  onFonte,
}: {
  thesis: Thesis;
  onToggle: (t: Thesis) => void;
  onFonte: (docId: string) => void;
}) {
  const box = boxStyle(thesis.state);
  const included = thesis.state === "included";
  const border =
    thesis.state === "pending_remove"
      ? "border-red/40"
      : included || thesis.state === "pending_add"
        ? "border-primary/35"
        : "border-line";

  return (
    <div
      className={`bg-background overflow-hidden rounded-[9px] border ${border}`}
    >
      <button
        type="button"
        onClick={() => onToggle(thesis)}
        className="hover:bg-hover grid w-full grid-cols-[16px_1fr] items-start gap-[9px] px-2.5 py-[9px] text-left"
      >
        <span
          className={`mt-px grid size-[15px] flex-none place-items-center rounded border text-[9px] ${box.cls}`}
        >
          {box.marca}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium">{thesis.label}</span>
            {included && (
              <span className="bg-green/15 text-green rounded-full px-1.5 py-px text-[8.5px] font-semibold tracking-[0.03em] uppercase">
                no texto
              </span>
            )}
            <GroundingMark grounded={thesis.grounded} />
          </span>
          <span className="text-fg3 mt-0.5 block text-[10.5px] leading-[1.4]">
            {thesis.foundation}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onFonte(thesis.sourceDocumentId)}
        className="border-line2 hover:bg-hover flex w-full items-center gap-[7px] border-t border-dashed py-2 pr-2.5 pl-[35px] text-left"
      >
        <Link2 className="text-primary size-3 flex-none" />
        <span className="min-w-0">
          <span className="text-primary block text-[10.5px] font-medium">
            {thesis.legalRef}
          </span>
          <span className="text-fg3 mt-px block truncate text-[10px]">
            {thesis.sourceLabel}
          </span>
        </span>
      </button>
    </div>
  );
}

/** Affordance de grounding: fonte sustenta (✓ verde) ou dispositivo a verificar
 *  (? dourado). */
function GroundingMark({ grounded }: { grounded: boolean }) {
  return grounded ? (
    <span
      title="Fonte sustenta a tese"
      className="text-green text-[11px] font-semibold"
    >
      ✓
    </span>
  ) : (
    <span
      title="Dispositivo/doutrina a verificar"
      className="text-gold text-[11px] font-semibold"
    >
      ?
    </span>
  );
}

/** Estilo do checkbox `marca` por estado. */
function boxStyle(state: ThesisState): { marca: string; cls: string } {
  switch (state) {
    case "pending_add":
      return {
        marca: "·",
        cls: "border-primary text-primary",
      };
    case "included":
      return {
        marca: "✓",
        cls: "border-primary bg-primary text-primary-foreground",
      };
    case "pending_remove":
      return { marca: "–", cls: "border-red text-red" };
    default:
      return { marca: "", cls: "border-line" };
  }
}

function RailNote({ children }: { children: React.ReactNode }) {
  return <p className="text-fg3 mb-2 text-[11px] leading-[1.5]">{children}</p>;
}
