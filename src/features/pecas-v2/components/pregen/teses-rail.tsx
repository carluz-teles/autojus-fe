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

import type { Thesis, ThesisAnchor, ThesisState } from "../../types";

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

  // Âncoras da tese: quando o BE devolve N (uma tese sustentada por vários autos),
  // listamos todas agrupadas por label. Quando vazio, caímos no fallback singular
  // (um AUTO ou o TEOR da intimação) — a tese se funda no teor, o 1º item da
  // "Fundada em". Assim o bloco "ver fonte" nunca fica vazio.
  const groups = groupAnchors(thesis.anchors);
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

      {groups.length > 0 ? (
        <AnchorsBlock
          legalRef={thesis.legalRef}
          groups={groups}
          onFonte={onFonte}
        />
      ) : (
        <FallbackSource
          legalRef={thesis.legalRef}
          sourceDocumentId={thesis.sourceDocumentId}
          sourceLabel={thesis.sourceLabel}
          teorSourceId={teorSourceId}
          onFonte={onFonte}
        />
      )}
    </div>
  );
}

/** Uma âncora agrupada por label: id representante (pro clique), rótulo e contagem
 *  de documentos distintos que compartilham esse label. */
interface AnchorGroup {
  documentId: string;
  label: string;
  count: number;
}

// Agrupa as âncoras por label — os labels podem repetir ("Ato ordinatório · pág. 1")
// porque são DOCUMENTOS distintos com mesmo tipo/página. Preserva a 1ª ocorrência
// como representante do clique e conta quantos documentos há no grupo.
function groupAnchors(anchors: ThesisAnchor[]): AnchorGroup[] {
  const byLabel = new Map<string, AnchorGroup>();
  for (const a of anchors) {
    const g = byLabel.get(a.label);
    if (g) {
      g.count += 1;
    } else {
      byLabel.set(a.label, {
        documentId: a.documentId,
        label: a.label,
        count: 1,
      });
    }
  }
  return [...byLabel.values()];
}

/** Bloco de fontes quando a tese tem N âncoras. legalRef (dispositivo) na 1ª linha;
 *  abaixo, os grupos de âncoras como chips clicáveis. Cada chip mostra o label e,
 *  quando há mais de um documento no grupo, um sufixo "(N)". */
function AnchorsBlock({
  legalRef,
  groups,
  onFonte,
}: {
  legalRef: string;
  groups: AnchorGroup[];
  onFonte: (docId: string) => void;
}) {
  return (
    <div className="border-line2 border-t border-dashed py-2 pr-2.5 pl-[35px]">
      {legalRef && (
        <span className="text-primary flex items-center gap-[7px] text-[10.5px] font-medium">
          <Link2 className="text-primary size-3 flex-none" />
          {legalRef}
        </span>
      )}
      <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-1">
        {groups.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => onFonte(g.documentId)}
            disabled={!g.documentId}
            title={g.label}
            className="border-line2 text-fg3 hover:bg-hover hover:text-primary max-w-full truncate rounded-full border px-2 py-px text-[10px] disabled:opacity-60"
          >
            {g.label}
            {g.count > 1 && <span className="text-fg3"> ({g.count})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Fallback singular (âncoras vazias): um AUTO ou o TEOR da intimação, como antes. */
function FallbackSource({
  legalRef,
  sourceDocumentId,
  sourceLabel,
  teorSourceId,
  onFonte,
}: {
  legalRef: string;
  sourceDocumentId: string;
  sourceLabel: string;
  teorSourceId: string;
  onFonte: (docId: string) => void;
}) {
  const hasDoc = sourceDocumentId !== "";
  const sourceId = hasDoc ? sourceDocumentId : teorSourceId;
  const label = hasDoc ? sourceLabel : "Teor da intimação";
  // legalRef é a linha primária quando existe; senão a própria fonte sobe pra
  // primária (evita uma linha primária vazia com a fonte pendurada embaixo).
  const primary = legalRef || label;
  const secondary = legalRef ? label : "";
  return (
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
