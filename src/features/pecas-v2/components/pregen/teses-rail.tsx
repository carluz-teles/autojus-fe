"use client";

// Bloco TESES A INCLUIR do rail (contrato Teses). Cada linha:
//   - checkbox `marca` por estado (off:vazio / included:✓)
//   - label + badge "no texto" (só quando included) + affordance de grounding
//   - foundation (desc)
//   - linha de fonte (âncoras/teor) com "ver fonte" → destaca o attachment.
//
// Clicar na linha alterna a tese. Depois de gerada a peça (`confirmBeforeToggle`),
// o clique abre um POPOVER de confirmação (a mudança REGENERA a peça) com opção
// "não perguntar novamente" — substitui a antiga moldura de dupla confirmação
// embaixo da folha. Na partida (pré-geração) o clique só seleciona, sem popover.

import { Popover } from "@base-ui/react/popover";
import { Link2 } from "lucide-react";
import { useState } from "react";

import { isSelectedForGeneration } from "../../hooks/use-theses";
import type { Thesis, ThesisAnchor, ThesisState } from "../../types";

const SKIP_CONFIRM_KEY = "atjus:peca:skip-thesis-confirm";

function readSkipConfirm(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SKIP_CONFIRM_KEY) === "1";
  } catch {
    return false;
  }
}

function persistSkipConfirm(): void {
  try {
    window.localStorage.setItem(SKIP_CONFIRM_KEY, "1");
  } catch {
    /* ignora storage indisponível */
  }
}

interface Props {
  theses: Thesis[];
  selectedCount: number;
  isLoading: boolean;
  isError: boolean;
  /** Ação de alternância da tese. Na construção (pós-geração) é o commit que
   *  regenera a peça; na partida é o toggle de seleção. */
  onToggle: (thesis: Thesis) => void;
  /** Quando true, o clique abre o popover de confirmação antes de `onToggle`
   *  (mudar teses regenera a peça). false = aplica direto (partida, sem peça). */
  confirmBeforeToggle?: boolean;
  /** A peça foi editada à mão — o popover avisa que a regeração descarta ajustes. */
  contentEdited?: boolean;
  onFonte: (sourceDocumentId: string) => void;
  /** Id da intimação de origem — fonte-padrão das teses SEM documento ancorado. */
  teorSourceId: string;
  /** true enquanto a IA gera as teses — a geração é AUTOMÁTICA (no load). */
  isRegenerating: boolean;
  /** PARTIDA (pré-geração): tese selecionada é só "marcada", SEM badge "no texto". */
  pregen?: boolean;
}

export function TesesRail({
  theses,
  selectedCount,
  isLoading,
  isError,
  onToggle,
  confirmBeforeToggle = false,
  contentEdited = false,
  onFonte,
  teorSourceId,
  isRegenerating,
  pregen = false,
}: Props) {
  const gerando = isLoading || isRegenerating;
  // Preferência "não perguntar novamente" (persistida). Estado no topo pra que
  // marcar numa linha valha pra todas imediatamente.
  const [skipConfirm, setSkipConfirm] = useState(readSkipConfirm);

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
            confirmBeforeToggle={confirmBeforeToggle}
            contentEdited={contentEdited}
            skipConfirm={skipConfirm}
            onSkipConfirm={() => {
              persistSkipConfirm();
              setSkipConfirm(true);
            }}
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
  confirmBeforeToggle,
  contentEdited,
  skipConfirm,
  onSkipConfirm,
  onFonte,
  teorSourceId,
  pregen,
}: {
  thesis: Thesis;
  onToggle: (t: Thesis) => void;
  confirmBeforeToggle: boolean;
  contentEdited: boolean;
  skipConfirm: boolean;
  onSkipConfirm: () => void;
  onFonte: (docId: string) => void;
  teorSourceId: string;
  pregen: boolean;
}) {
  const box = boxStyle(thesis.state);
  const included = thesis.state === "included";
  const showNoTexto = included && !pregen;
  const groups = groupAnchors(thesis.anchors);
  const selected = isSelectedForGeneration(thesis.state);
  const border =
    thesis.state === "pending_remove"
      ? "border-red/40"
      : selected
        ? "border-primary/35"
        : "border-line";

  const [open, setOpen] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);

  // Sem confirmação (partida) OU preferência "não perguntar" → aplica direto.
  const clickApplies = !confirmBeforeToggle || skipConfirm;

  const rowInner = (
    <>
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
    </>
  );

  const rowCls =
    "hover:bg-hover grid w-full grid-cols-[16px_1fr] items-start gap-[9px] px-2.5 py-[9px] text-left";

  return (
    <div
      className={`bg-background overflow-hidden rounded-[9px] border ${border}`}
    >
      {clickApplies ? (
        <button
          type="button"
          onClick={() => onToggle(thesis)}
          className={rowCls}
        >
          {rowInner}
        </button>
      ) : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger render={<button type="button" className={rowCls} />}>
            {rowInner}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="right" align="start" sideOffset={8}>
              <Popover.Popup className="border-line bg-panel z-50 w-64 rounded-[10px] border p-3 text-[12px] shadow-[0_8px_30px_oklch(0.27_0.012_200/12%)] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
                <p className="text-foreground m-0 mb-1 font-semibold">
                  {selected ? "Remover esta tese?" : "Incluir esta tese?"}
                </p>
                <p className="text-fg2 m-0 mb-2.5 leading-[1.5]">
                  {selected
                    ? "A peça será reescrita sem esta tese, mantendo a coesão e a estrutura do modelo."
                    : "A peça será reescrita incluindo esta tese, mantendo a coesão e a estrutura do modelo."}
                  {contentEdited && (
                    <span className="text-red">
                      {" "}
                      Seus ajustes manuais serão descartados.
                    </span>
                  )}
                </p>
                <label className="text-fg2 mb-2.5 flex cursor-pointer items-center gap-1.5 text-[11.5px]">
                  <input
                    type="checkbox"
                    checked={dontAsk}
                    onChange={(e) => setDontAsk(e.target.checked)}
                    className="accent-primary size-3.5"
                  />
                  Não perguntar novamente
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="border-line text-fg2 hover:bg-hover rounded-md border px-2.5 py-1 text-[11.5px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (dontAsk) onSkipConfirm();
                      onToggle(thesis);
                      setOpen(false);
                    }}
                    className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-[11.5px] font-medium"
                  >
                    Confirmar
                  </button>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}

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

// Agrupa as âncoras por label — labels podem repetir (documentos distintos com
// mesmo tipo/página). Preserva a 1ª ocorrência como representante e conta o grupo.
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

/** Bloco de fontes quando a tese tem N âncoras. */
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

/** Fallback singular (âncoras vazias): um AUTO ou o TEOR da intimação. */
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

/** Affordance de grounding: fonte sustenta (✓ verde) ou dispositivo a verificar. */
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
      return { marca: "·", cls: "border-primary text-primary" };
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
