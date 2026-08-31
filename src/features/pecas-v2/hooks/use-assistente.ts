"use client";

// Assistente da peça — dirige o /iterate do BE: o advogado pede um ajuste (texto
// livre ou um chip de ajuste rápido) e a IA devolve PROPOSTAS (diff por seção).
// Aceitar aplica a mudança no editor (update otimista do cache reconstruindo o
// content_html via structuredToHtml — o mesmo mecanismo do ConstrucaoPage antigo —
// + PATCH persistindo). Rejeitar só descarta o card.

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { structuredToHtml } from "../components/rich-editor/html-adapter";
import type { Draft, PendingChange, QuickAdjustKind } from "../types";
import { draftKeys, useSaveDraft } from "./use-draft";
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

/** Proposta = um PendingChange + um id de cliente estável (pra key/aceite). */
export interface Proposta extends PendingChange {
  key: string;
}

let propostaSeq = 0;

export function useAssistente(id: string) {
  const qc = useQueryClient();
  const save = useSaveDraft(id);
  const iterate = useIterate(id);
  const quick = useQuickAdjust(id);

  const [propostas, setPropostas] = useState<Proposta[]>([]);

  const pensando = iterate.isPending || quick.isPending;

  // Aplica uma mudança aceita: update otimista (rebuild content_html a partir do
  // structured com a seção trocada) + PATCH persistindo. O editor prefere
  // content_html, então a mudança reflete na hora.
  const applyChange = (c: PendingChange) => {
    qc.setQueryData<Draft>(draftKeys.detail(id), (prev) => {
      if (!prev) return prev;
      const nextSections = prev.sections.map((s) =>
        s.id === c.sectionId ? { ...s, paragraphs: c.newParagraphs } : s,
      );
      const nextHtml = structuredToHtml({
        preamble: prev.preamble,
        sections: nextSections,
      });
      return { ...prev, sections: nextSections, contentHtml: nextHtml };
    });
    save.mutate({
      sections: [{ id: c.sectionId, paragraphs: c.newParagraphs }],
    });
  };

  const onResult = (changes: PendingChange[]) => {
    if (changes.length === 0) {
      toast("Nenhuma mudança sugerida — o texto já está adequado.");
      return;
    }
    const novas: Proposta[] = changes.map((c) => ({
      ...c,
      key: `p${++propostaSeq}`,
    }));
    // Mais nova no topo.
    setPropostas((prev) => [...novas, ...prev]);
  };

  const enviar = (instruction: string) => {
    const t = instruction.trim();
    if (!t || pensando) return;
    iterate.mutate(
      { scope: { kind: "whole" }, instruction: t },
      {
        onSuccess: (r) => onResult(r.changes),
        onError: () =>
          toast.error("Não foi possível gerar a proposta. Tente de novo."),
      },
    );
  };

  const usarChip = (kind: QuickAdjustKind) => {
    if (pensando) return;
    quick.mutate(
      { scope: { kind: "whole" }, kind },
      {
        onSuccess: (r) => onResult(r.changes),
        onError: () =>
          toast.error("Não foi possível gerar a proposta. Tente de novo."),
      },
    );
  };

  const aceitar = (p: Proposta) => {
    applyChange(p);
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
