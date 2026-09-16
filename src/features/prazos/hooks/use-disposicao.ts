"use client";

// Hook da DISPOSIÇÃO da intimação (a unidade de trabalho). Compõe a derivação
// pura (derivarDisposicao) com os rótulos de peça e os handlers de ação:
//   · "Dar ciência" → conclui o action_item de ciência (comecar → concluir).
//     Sem item materializado, resolve a própria intimação (caminho equivalente).
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
} from "@/features/action-items/components/new-providencia";
import {
  comecarActionItem,
  concluirActionItem,
} from "@/features/action-items/services/action-items.service";
import {
  intimacoesKeys,
  useResolverIntimacao,
} from "@/features/intimacoes/hooks/use-intimacoes";
import type { IntimacaoProvidencia } from "@/features/intimacoes/types";
import { useApi } from "@/lib/api/use-api";

import { derivarDisposicao, type DisposicaoPeca } from "../lib/disposicao";

/** Rótulo pt-BR da peça: perfil do catálogo, com fallback no tipo do ato. */
export function rotuloPeca(p: DisposicaoPeca): string {
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
  const api = useApi();
  const qc = useQueryClient();
  const resolver = useResolverIntimacao();

  const disposicao = useMemo(() => {
    const d = derivarDisposicao(providencias);
    return {
      ...d,
      pecas: d.pecas.map((p) => ({ ...p, label: rotuloPeca(p) })),
    };
  }, [providencias]);

  // "Dar ciência" = levar o item de ciência a DONE. A partir de SUGGESTED/TODO,
  // `comecar` avança para WORKING; `concluir` fecha em DONE. Concluir a ciência
  // resolve a intimação (sem peça). O BE espelha o efeito na view do detalhe.
  const darCiencia = useMutation({
    mutationFn: async (ciencia: (typeof disposicao)["ciencia"]) => {
      if (!ciencia) {
        // Disposição de ciência sem item materializado: resolve a intimação.
        await resolver.mutateAsync(intimationId);
        return;
      }
      if (ciencia.status === "DONE") return;
      if (ciencia.status !== "WORKING") {
        await comecarActionItem(api, ciencia.actionItemId);
      }
      await concluirActionItem(api, ciencia.actionItemId);
    },
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
    onDarCiencia: () => darCiencia.mutate(disposicao.ciencia),
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
