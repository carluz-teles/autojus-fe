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
  /** Id da intimação de origem — fonte-padrão das teses SEM documento ancorado
   *  (elas se fundam no TEOR, o 1º item da "Fundada em"). Casa com fundada-em-{id}. */
  teorSourceId: string;
  /** true enquanto a IA gera as teses — a geração é AUTOMÁTICA (no load), sem botão. */
  isRegenerating: boolean;
  /** PARTIDA (pré-geração): a peça ainda não existe, então a tese selecionada é só
   *  "marcada" (✓), SEM o badge "no texto" (não há texto ainda). */
  pregen?: boolean;
}

export function TesesRail({
  theses,
  selectedCount,
  isLoading,
  isError,
  onToggle,
  onFonte,
  teorSourceId,
  isRegenerating,
  pregen = false,
}: Props) {
  const gerando = isLoading || isRegenerating;
  return (
    <>
      <div className="text-fg3 mt-5 mb-2 flex items-center gap-2 text-[10.5px] font-medium tracking-[0.05em] uppercase">
        <span className="flex-1">
          Teses a incluir <span className="text-primary">{selectedCount}</span>
        </span>
        {gerando && (
          <span className="text-fg3 flex items-center gap-1 tracking-normal normal-case">
            <span className="border-fg3/40 border-t-primary size-3 animate-spin rounded-full border" />
            Gerando…
          </span>
        )}
      </div>

      {gerando && theses.length === 0 && (
        <RailNote>Gerando teses ancoradas no teor e nos autos…</RailNote>
      )}
      {!gerando && isError && (
        <RailNote>
          Não foi possível gerar as teses. Recarregue a página.
        </RailNote>
      )}
      {!gerando && !isError && theses.length === 0 && (
        <RailNote>Nenhuma tese ancorável no material disponível.</RailNote>
      )}

      <div className="flex flex-col gap-[7px]">
        {theses.map((t) => (
          <TeseRow
            key={t.id}
            thesis={t}
            onToggle={onToggle}
            onFonte={onFonte}
            teorSourceId={teorSourceId}
            pregen={pregen}
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
  teorSourceId,
  pregen,
}: {
  thesis: Thesis;
  onToggle: (t: Thesis) => void;
  onFonte: (docId: string) => void;
  teorSourceId: string;
  pregen: boolean;
}) {
  const box = boxStyle(thesis.state);
  const included = thesis.state === "included";
  // Na partida (pregen) não há texto gerado — a tese marcada é só "selecionada",
  // sem o badge "no texto" (que só faz sentido depois da geração).
  const showNoTexto = included && !pregen;

  // Fonte da tese: um AUTO (sourceDocumentId preenchido) OU o TEOR da intimação
  // (fallback quando a IA não ancorou num documento — a tese se funda no teor, que
  // é o 1º item da "Fundada em"). Assim o chip "ver fonte" nunca fica vazio.
  const hasDoc = thesis.sourceDocumentId !== "";
  const sourceId = hasDoc ? thesis.sourceDocumentId : teorSourceId;
  const sourceLabel = hasDoc ? thesis.sourceLabel : "Teor da intimação";
  // legalRef é a linha primária quando existe; senão a própria fonte sobe pra
  // primária (evita uma linha primária vazia com a fonte pendurada embaixo).
  const primary = thesis.legalRef || sourceLabel;
  const secondary = thesis.legalRef ? sourceLabel : "";
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
            {showNoTexto && (
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
        onClick={() => onFonte(sourceId)}
        disabled={!sourceId}
        className="border-line2 hover:bg-hover flex w-full items-center gap-[7px] border-t border-dashed py-2 pr-2.5 pl-[35px] text-left disabled:opacity-60"
      >
        <Link2 className="text-primary size-3 flex-none" />
        <span className="min-w-0">
          <span className="text-primary block text-[10.5px] font-medium">
            {primary}
          </span>
          {secondary && (
            <span className="text-fg3 mt-px block truncate text-[10px]">
              {secondary}
            </span>
          )}
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
