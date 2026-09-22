"use client";

// Hook da DISPOSIÇÃO da intimação. A UNIDADE DE TRABALHO é a própria INTIMAÇÃO
// (não há mais "providência"/action_item como unidade). Compõe a derivação pura
// (derivarDisposicao) com os rótulos de peça e os handlers de ação:
//   · "Dar ciência" → RESOLVE a intimação (POST /v1/intimacoes/:id/resolve). O
//     status (PENDENTE→RESOLVIDA) mora na intimação; o ⋮ "Reabrir" desfaz. É o
//     mesmo caminho do "dar ciência em lote" (resolveIntimacoesBatch). Não há mais
//     máquina de estados de action_item aqui (SUGGESTED→TODO→WORKING→DONE).
//   · "Gerar peça"  → abre modal de orientação opcional; ao confirmar, navega
//     para /pecas/nova?...&auto=1&retorno=.. As instructions (se houver) viajam
//     por sessionStorage (chave por actionItemId), não pela URL — evita 2000
//     chars no history e PII na barra de endereço. O componente grava antes de
//     navegar; o ConstructionEntry lê e limpa após o generate.
//     [Pular] = instructions vazio → gera com todas as teses recomendadas.
// O componente chama só este hook (JSX + binding).

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  PIECE_PROFILES,
  WORK_TYPES,
} from "@/features/action-items/lib/piece-labels";
import {
  intimacoesKeys,
  useResolverIntimacao,
} from "@/features/intimacoes/hooks/use-intimacoes";
import type { IntimacaoProvidencia } from "@/features/intimacoes/types";

import { derivarDisposicao, type DisposicaoPeca } from "../lib/disposicao";

/** Rótulo pt-BR da peça: perfil do catálogo, com fallback no tipo do ato. */
function rotuloPeca(p: DisposicaoPeca): string {
  const perfil = p.pieceProfileKey ? PIECE_PROFILES[p.pieceProfileKey] : "";
  return perfil || WORK_TYPES[p.tipo] || "Peça";
}

export function useDisposicao({
  intimationId,
  providencias,
  retorno,
}: {
  intimationId: string;
  providencias: IntimacaoProvidencia[];
  /** Para onde a construção volta (o próprio detalhe da intimação). */
  retorno: string;
}) {
  const qc = useQueryClient();
  const resolver = useResolverIntimacao();

  const disposicao = useMemo(() => {
    const d = derivarDisposicao(providencias);
    return {
      ...d,
      pecas: d.pecas.map((p) => ({ ...p, label: rotuloPeca(p) })),
    };
  }, [providencias]);

  // "Dar ciência" RESOLVE a intimação — a unidade de trabalho é a própria
  // intimação, não um action_item. Mesmo caminho do "dar ciência em lote"
  // (POST /v1/intimacoes/:id/resolve). O ⋮ "Reabrir" desfaz.
  const darCiencia = useMutation({
    mutationFn: () => resolver.mutateAsync(intimationId),
    onSuccess: async () => {
      await Promise.all(
        [
          "action-items",
          "intimacoes",
          "processos",
          "processo",
          "prazos",
          "preparation-actions",
        ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
      );
      await qc.invalidateQueries({
        queryKey: intimacoesKeys.detail(intimationId),
      });
      toast.success("Ciência registrada — intimação resolvida.");
    },
    onError: () =>
      toast.error("Não foi possível dar ciência. Tente novamente."),
  });

  // ── Modal de orientação ("Gerar peça") ─────────────────────────────────────
  // Ao clicar "Gerar peça", abrimos o modal. O caller obtém actionItemId pelo
  // closure. Ao confirmar (com ou sem instructions), navegamos para a rota de
  // construção; as instructions (se houver) vão por sessionStorage, não pela URL
  // — evita query string longa (2000 chars) e PII no histórico do browser.
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingActionItemId, setPendingActionItemId] = useState<string>("");

  const openGerarModal = (actionItemId: string) => {
    setPendingActionItemId(actionItemId);
    setModalOpen(true);
  };

  // Monta a URL de auto-partida. Se instructions for não-vazio, o caller deve
  // armazená-lo em sessionStorage (keyed by actionItemId) antes de navegar —
  // ConstructionEntry lê e limpa. Evita colocar 2000 chars na URL/history.
  const buildGerarUrl = (actionItemId: string): string =>
    `/pecas/nova?providencia=${actionItemId}&intimacao=${intimationId}&auto=1&retorno=${encodeURIComponent(retorno)}`;

  return {
    disposicao,
    onDarCiencia: () => darCiencia.mutate(),
    dandoCiencia: darCiencia.isPending || resolver.isPending,
    cienciaErro: darCiencia.isError,
    // Modal state
    modalOpen,
    pendingActionItemId,
    openGerarModal,
    closeGerarModal: () => setModalOpen(false),
    buildGerarUrl,
    pecaLabel: pendingActionItemId
      ? (disposicao.pecas.find((p) => p.actionItemId === pendingActionItemId)
          ?.label ?? "")
      : "",
  };
}
