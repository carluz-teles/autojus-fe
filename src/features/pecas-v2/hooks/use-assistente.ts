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
  applyToEditor: (
    sectionRoman: string,
    newParagraphs: string[],
    expectedParagraphs?: string[],
  ) => boolean,
  beforeRequest?: () => Promise<void>,
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

  const enviar = async (
    instruction: string,
    scope: IterateScope = { kind: "whole" },
  ) => {
    const t = instruction.trim();
    if (!t || pensando) return false;
    try {
      await beforeRequest?.();
      const r = await iterate.mutateAsync({ scope, instruction: t });
      onResult(r.changes, t);
      return true;
    } catch {
      toast.error("Não foi possível gerar a proposta. Seu pedido foi mantido.");
      return false;
    }
  };
  const usarChip = async (
    kind: QuickAdjustKind,
    scope: IterateScope = { kind: "whole" },
  ) => {
    if (pensando) return;
    try {
      await beforeRequest?.();
      const r = await quick.mutateAsync({ scope, kind });
      onResult(
        r.changes,
        ASSISTENTE_CHIPS.find((c) => c.kind === kind)?.label ?? "",
      );
    } catch {
      toast.error("Salve o texto e tente novamente.");
    }
  };

  const aceitar = (p: Proposta) => {
    const aplicou = applyToEditor(
      p.sectionRoman,
      p.newParagraphs,
      p.oldParagraphs,
    );
    if (!aplicou) {
      toast.error(
        "Não foi possível aplicar esta proposta com segurança: o trecho mudou ou contém formatação complexa. Suas edições foram mantidas; revise o trecho no editor.",
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
