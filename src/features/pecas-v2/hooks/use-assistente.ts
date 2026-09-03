"use client";

// Assistente da peça — dirige o /iterate do BE: o advogado pede um ajuste (texto
// livre ou chip) e a IA devolve PROPOSTAS (diff antigo/proposto). Aceitar aplica a
// mudança DIRETO NO EDITOR VIVO (content_html, a fonte-única) via `applyToEditor` —
// que reflete na hora e dispara o autosave. Sem cache/estruturado paralelo.

import { useState } from "react";
import { toast } from "sonner";

import type { IterateScope, PendingChange, QuickAdjustKind } from "../types";
import { useIterate, useQuickAdjust } from "./use-iterate";

export interface AssistenteChip {
  label: string;
  kind: QuickAdjustKind;
}

/** Chips de ajuste rápido — mapeiam nos 4 kinds do /iterate do BE. */
export const ASSISTENTE_CHIPS: AssistenteChip[] = [
  { label: "Mais assertivo", kind: "emphatic" },
  { label: "Mais conciso", kind: "concise" },
  { label: "Reforçar a tese", kind: "reinforce_thesis" },
  { label: "Mais fundamentos", kind: "add_grounds" },
];

/** Proposta = um PendingChange + id de cliente estável + o pedido que a originou. */
export interface Proposta extends PendingChange {
  key: string;
  pedido: string;
}

let propostaSeq = 0;

/** `applyToEditor` aplica a mudança (old→new) no editor vivo; devolve false quando
 *  o trecho não foi encontrado (não corrompe). Vem da construction-page (editorRef). */
export function useAssistente(
  id: string,
  applyToEditor: (sectionRoman: string, newParagraphs: string[]) => boolean,
) {
  const iterate = useIterate(id);
  const quick = useQuickAdjust(id);

  const [propostas, setPropostas] = useState<Proposta[]>([]);

  const pensando = iterate.isPending || quick.isPending;

  const onResult = (changes: PendingChange[], pedido: string) => {
    if (changes.length === 0) {
      toast("Nenhuma mudança sugerida — o texto já está adequado.");
      return;
    }
    const novas: Proposta[] = changes.map((c) => ({
      ...c,
      key: `p${++propostaSeq}`,
      pedido,
    }));
    // Mais nova no topo.
    setPropostas((prev) => [...novas, ...prev]);
  };

  const enviar = (
    instruction: string,
    scope: IterateScope = { kind: "whole" },
  ) => {
    const t = instruction.trim();
    if (!t || pensando) return;
    iterate.mutate(
      { scope, instruction: t },
      {
        onSuccess: (r) => onResult(r.changes, t),
        onError: () =>
          toast.error("Não foi possível gerar a proposta. Tente de novo."),
      },
    );
  };

  const usarChip = (
    kind: QuickAdjustKind,
    scope: IterateScope = { kind: "whole" },
  ) => {
    if (pensando) return;
    const label = ASSISTENTE_CHIPS.find((c) => c.kind === kind)?.label ?? "";
    quick.mutate(
      { scope, kind },
      {
        onSuccess: (r) => onResult(r.changes, label),
        onError: () =>
          toast.error("Não foi possível gerar a proposta. Tente de novo."),
      },
    );
  };

  const aceitar = (p: Proposta) => {
    const aplicou = applyToEditor(p.sectionRoman, p.newParagraphs);
    if (!aplicou) {
      toast.error(
        "Não encontrei essa seção no texto atual — recarregue a peça.",
      );
      return; // mantém o card
    }
    setPropostas((prev) => prev.filter((x) => x.key !== p.key));
    toast.success("Ajuste aplicado à peça.");
  };

  const rejeitar = (p: Proposta) => {
    setPropostas((prev) => prev.filter((x) => x.key !== p.key));
  };

  return {
    propostas,
    pensando,
    chips: ASSISTENTE_CHIPS,
    enviar,
    usarChip,
    aceitar,
    rejeitar,
  };
}
