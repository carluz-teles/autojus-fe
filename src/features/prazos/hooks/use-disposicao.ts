"use client";

// Hook da DISPOSIÇÃO da intimação. A UNIDADE DE TRABALHO é a própria INTIMAÇÃO
// (não há mais "providência"/action_item como unidade). Compõe a derivação pura
// (derivarDisposicao) com os rótulos de peça e o handler de "Dar ciência":
//   · "Dar ciência" → RESOLVE a intimação (POST /v1/intimacoes/:id/resolve). O
//     status (PENDENTE→RESOLVIDA) mora na intimação; o ⋮ "Reabrir" desfaz. É o
//     mesmo caminho do "dar ciência em lote" (resolveIntimacoesBatch). Não há mais
//     máquina de estados de action_item aqui (SUGGESTED→TODO→WORKING→DONE).
// "Gerar peça" NÃO é responsabilidade deste hook — o fluxo canônico único vive
// em `GerarPecaButton`/`usePecaGeracao` (pecas-v2/components/pregen/gerar-peca-
// button.tsx: gate de autos → orientação opcional → /pecas/nova?auto=1 → loading
// de 4 fases → workbench pronto). Este hook só fornece `disposicao` (de onde o
// caller escolhe o `actionItemId`-alvo) para quem monta o `GerarPecaButton`.
// O componente chama só este hook (JSX + binding).

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
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

import { derivarDisposicao, type DisposicaoObrigacao } from "../lib/disposicao";

/** Rótulo pt-BR da obrigação: `title` do action_item, com fallback no perfil
 *  do catálogo (quando gera peça) e, por fim, no tipo do ato. Nunca inventa um
 *  tipo — quando nada disso resolve (tipo desconhecido, sem perfil), cai no
 *  mesmo rótulo neutro do estado "indeterminado".
 *
 *  `recorrer` (Oportunidade) tem fallback PRÓPRIO e FACTUAL — "Avaliar
 *  cabimento de recurso" — antes do perfil/WORK_TYPES: o BE já envia esse
 *  título quando materializa via matcher determinístico/IA (item com `title`
 *  preenchido usa ele, sem passar por este fallback); isto só cobre dado
 *  legado/degradado (title nulo) pra nunca cair em "Recorrer" (WORK_TYPES),
 *  que lê como dever/imperativo — nunca afirmar "dever de recorrer". */
function rotuloObrigacao(o: DisposicaoObrigacao): string {
  if (o.title) return o.title;
  if (o.tipo === "recorrer") return "Avaliar cabimento de recurso";
  const perfil = o.pieceProfileKey ? PIECE_PROFILES[o.pieceProfileKey] : "";
  return perfil || WORK_TYPES[o.tipo] || "Trabalho a identificar";
}

export function useDisposicao({
  intimationId,
  providencias,
  onSucesso,
}: {
  intimationId: string;
  providencias: IntimacaoProvidencia[];
  /** Chamado quando "Dar ciência" RESOLVE a intimação com sucesso — sinaliza ao
   *  painel contextual (Mesa) que pode avançar ao próximo item (docs/revamp-
   *  mesa-trabalho-intimacoes.md §4). Nunca chamado em erro (a intimação
   *  continua aberta). */
  onSucesso?: () => void;
}) {
  const qc = useQueryClient();
  const resolver = useResolverIntimacao();

  const disposicao = useMemo(() => {
    const d = derivarDisposicao(providencias);
    const comLabel = (o: DisposicaoObrigacao) => ({
      ...o,
      label: rotuloObrigacao(o),
    });
    return {
      ...d,
      pecas: d.pecas.map(comLabel),
      obrigacoes: d.obrigacoes.map(comLabel),
      // Recorte aditivo de pecas/obrigacoes (mesma identidade, já rotulada
      // acima) — mapear de novo aqui manteria a MESMA referência de objeto por
      // item (comLabel é pura), então não há divergência de rótulo entre a
      // oportunidade e sua entrada em pecas/obrigacoes.
      oportunidades: d.oportunidades.map(comLabel),
      indeterminados: d.indeterminados.map(comLabel),
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
      onSucesso?.();
    },
    onError: () =>
      toast.error("Não foi possível dar ciência. Tente novamente."),
  });

  return {
    disposicao,
    onDarCiencia: () => darCiencia.mutate(),
    dandoCiencia: darCiencia.isPending || resolver.isPending,
    cienciaErro: darCiencia.isError,
  };
}
