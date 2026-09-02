"use client";

// Seção "II — Do direito" no editor: um bloco por tese com state ≠ off, com a
// APROVAÇÃO inline (propor→aprovar). Diff visual conforme o design:
//   • pending_add   → fundo/borda verde (accent) + rótulo "Inclusão proposta" +
//                     botões Aprovar / Descartar
//   • pending_remove→ fundo/borda vermelho + texto tachado/esmaecido + rótulo
//                     "Remoção proposta" + botões Aprovar remoção / Manter
//   • included      → bloco normal + botão "Remover"
//   • vazio         → nota "marque uma tese no painel à esquerda…"
//
// Sobre o texto do argumento (OPEN QUESTION resolvida): o contrato Thesis NÃO
// carrega um "parágrafo de argumento" gerado — só foundation, legal_ref e
// source_excerpt. Então compomos o bloco a partir desses campos: foundation
// como o corpo do argumento + o legal_ref como CHIP inline (verde "✓" quando
// grounded, dourado "?" senão). Se/quando o BE passar a emitir o parágrafo
// redigido por tese, é só trocar `thesis.foundation` por esse novo campo.
//
// Componente = JSX + binding: as ações chamam `onAction(thesis, verbo)`; a
// resolução do estado-alvo do PATCH vive no useThesesController.

import { Check, Sparkles } from "lucide-react";

import type { EditorThesisAction } from "../../hooks/use-theses";
import type { Thesis } from "../../types";

interface Props {
  /** Teses da seção "Do direito" (state ≠ off), já ordenadas por position. */
  direito: Thesis[];
  onAction: (thesis: Thesis, action: EditorThesisAction) => void;
  /** thesisId com PATCH em voo (desabilita os botões do bloco). */
  pendingId: string | null;
}

export function DireitoTeses({ direito, onAction, pendingId }: Props) {
  return (
    <div className="px-14 pb-1">
      <h3 className="text-fg3 m-0 mb-3 text-[10.5px] font-medium tracking-[0.05em] uppercase">
        Alterações de tese propostas
      </h3>

      {direito.length === 0 ? (
        <p className="text-fg3 m-0 text-[13px] italic">
          Nenhuma alteração pendente — proponha incluir ou remover uma tese no
          painel à esquerda.
        </p>
      ) : (
        direito.map((t, i) => (
          <TeseBlock
            key={t.id}
            thesis={t}
            index={i + 1}
            onAction={onAction}
            busy={pendingId === t.id}
          />
        ))
      )}
    </div>
  );
}

function TeseBlock({
  thesis,
  index,
  onAction,
  busy,
}: {
  thesis: Thesis;
  index: number;
  onAction: (thesis: Thesis, action: EditorThesisAction) => void;
  busy: boolean;
}) {
  const pendAdd = thesis.state === "pending_add";
  const pendRemove = thesis.state === "pending_remove";

  const container =
    "mb-3.5 rounded-[10px] border px-3.5 py-3 " +
    (pendAdd
      ? "border-primary/40 bg-primary/[0.06]"
      : pendRemove
        ? "border-red/40 bg-red/[0.06]"
        : "border-line2 bg-transparent");

  return (
    <div className={container}>
      {pendAdd && (
        <div className="text-primary mb-[7px] flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.03em] uppercase">
          <Sparkles className="size-[13px]" />
          Inclusão proposta · {thesis.label}
        </div>
      )}
      {pendRemove && (
        <div className="text-red mb-[7px] text-[10px] font-semibold tracking-[0.03em] uppercase">
          Remoção proposta · {thesis.label}
        </div>
      )}
      {!pendAdd && !pendRemove && (
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-display text-[13px] font-semibold">
            II.{index} — {thesis.label}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(thesis, "remove")}
            className="border-line bg-background text-fg3 hover:bg-hover ml-auto rounded-md border px-2 py-0.5 text-[10.5px] disabled:opacity-50"
          >
            Remover
          </button>
        </div>
      )}

      {pendRemove && thesis.segments.length > 0 ? (
        <RemovalHint />
      ) : (
        <p
          className={
            "font-display m-0 text-justify text-[14.5px] leading-[1.9] " +
            (pendRemove ? "text-fg3 line-through" : "text-foreground")
          }
        >
          {thesis.foundation}{" "}
          <LegalRefChip legalRef={thesis.legalRef} grounded={thesis.grounded} />
        </p>
      )}

      {pendAdd && (
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(thesis, "approve")}
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12px] font-medium disabled:opacity-60"
          >
            <Check className="size-[13px]" />
            Aprovar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(thesis, "discard")}
            className="border-line bg-panel text-fg2 hover:bg-hover rounded-[7px] border px-3 py-1.5 text-[12px] disabled:opacity-60"
          >
            Descartar
          </button>
        </div>
      )}
      {pendRemove && (
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(thesis, "approveRemoval")}
            className="bg-red inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
          >
            Aprovar remoção
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(thesis, "keep")}
            className="border-line bg-panel text-fg2 hover:bg-hover rounded-[7px] border px-3 py-1.5 text-[12px] disabled:opacity-60"
          >
            Manter
          </button>
        </div>
      )}
    </div>
  );
}

/** Nota compacta da remoção: o TRECHO real já aparece tachado/destacado NO
 *  PRÓPRIO TEXTO da peça (ProseMirror Decoration), então aqui só apontamos pra
 *  ele — sem duplicar o conteúdo num card. */
function RemovalHint() {
  return (
    <p className="text-fg3 m-0 text-[13px] leading-[1.6]">
      O trecho destacado em vermelho no texto acima será removido da peça.
      Confirme para aplicar.
    </p>
  );
}

/** Dispositivo legal como chip inline: verde "✓" quando a fonte sustenta
 *  (grounded), dourado "?" quando é dispositivo/doutrina a verificar. */
function LegalRefChip({
  legalRef,
  grounded,
}: {
  legalRef: string;
  grounded: boolean;
}) {
  if (!legalRef) return null;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-[5px] px-1.5 text-[12.5px] whitespace-nowrap " +
        (grounded ? "bg-green/12 text-green" : "bg-gold/14 text-gold")
      }
    >
      {legalRef} {grounded ? "✓" : "?"}
    </span>
  );
}
