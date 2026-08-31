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
import { applyParagraphChangeToHtml } from "../lib/apply-change-html";
import type { Draft, PendingChange, QuickAdjustKind } from "../types";
import { draftKeys } from "./use-draft";
import { useIterate, useQuickAdjust } from "./use-iterate";
import { useSaveContentHtml } from "./use-workflow";

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

/** Proposta = um PendingChange + id de cliente estável + o pedido que a originou
 *  (instrução livre ou rótulo do chip), ecoado no cabeçalho do card. */
export interface Proposta extends PendingChange {
  key: string;
  pedido: string;
}

let propostaSeq = 0;

export function useAssistente(id: string) {
  const qc = useQueryClient();
  const saveHtml = useSaveContentHtml(id);
  const iterate = useIterate(id);
  const quick = useQuickAdjust(id);

  const [propostas, setPropostas] = useState<Proposta[]>([]);

  const pensando = iterate.isPending || quick.isPending;

  // Aplica uma mudança aceita SOBRE O content_html (a mesma base do iterate e do
  // editor — evita o descolamento structured×content_html que fazia o "Antigo"
  // virar fantasma). Substitui o run de parágrafos old→new no HTML, faz update
  // otimista do cache e persiste via content_html. Se o run não for encontrado
  // (base divergente), o helper devolve o HTML intacto — não corrompe.
  const applyChange = (c: PendingChange) => {
    const prev = qc.getQueryData<Draft>(draftKeys.detail(id));
    const baseHtml =
      prev?.contentHtml && prev.contentHtml.trim() !== ""
        ? prev.contentHtml
        : prev
          ? structuredToHtml({
              preamble: prev.preamble,
              sections: prev.sections,
            })
          : "";
    const nextHtml = applyParagraphChangeToHtml(
      baseHtml,
      c.oldParagraphs,
      c.newParagraphs,
    );
    if (nextHtml === baseHtml) {
      toast.error(
        "Não encontrei esse trecho no texto atual — recarregue a peça.",
      );
      return false;
    }
    qc.setQueryData<Draft>(draftKeys.detail(id), (d) =>
      d ? { ...d, contentHtml: nextHtml } : d,
    );
    saveHtml.mutate(nextHtml);
    return true;
  };

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

  const enviar = (instruction: string) => {
    const t = instruction.trim();
    if (!t || pensando) return;
    iterate.mutate(
      { scope: { kind: "whole" }, instruction: t },
      {
        onSuccess: (r) => onResult(r.changes, t),
        onError: () =>
          toast.error("Não foi possível gerar a proposta. Tente de novo."),
      },
    );
  };

  const usarChip = (kind: QuickAdjustKind) => {
    if (pensando) return;
    const label = ASSISTENTE_CHIPS.find((c) => c.kind === kind)?.label ?? "";
    quick.mutate(
      { scope: { kind: "whole" }, kind },
      {
        onSuccess: (r) => onResult(r.changes, label),
        onError: () =>
          toast.error("Não foi possível gerar a proposta. Tente de novo."),
      },
    );
  };

  const aceitar = (p: Proposta) => {
    if (!applyChange(p)) return; // trecho não encontrado → mantém o card (já avisou)
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
