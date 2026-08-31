"use client";

// Orquestração da PARTIDA — a tela de Construção ANTES da peça existir. Escopada à
// INTIMAÇÃO (não há draft ainda). Compõe: teses da intimação (GET; auto-gera na
// primeira visita se vazio), seleção EFÊMERA client-side, e o "Gerar minuta" que
// MATERIALIZA a peça (POST /v1/pecas com os thesis_ids selecionados) e navega pra
// /pecas/[draftId]. O componente chama só este hook público.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useIntimacaoDetalhe } from "@/features/prazos/hooks/use-intimacao-detalhe";
import { useApi } from "@/lib/api/use-api";

import {
  createDraft,
  generateDraft,
  generateIntimationTheses,
  getIntimationTheses,
} from "../services/pecas-v2.service";
import type { Thesis } from "../types";

const thesesKey = (intimacaoId: string) =>
  ["intimacao", intimacaoId, "theses"] as const;

export function usePartida(intimacaoId: string) {
  const fetcher = useApi();
  const router = useRouter();
  const qc = useQueryClient();

  // Contexto rico da origem (processo/intimação/teor/partes/prazo/providências),
  // reusando o detalhe da intimação — mesma fonte da tela de Intimação.
  const detalhe = useIntimacaoDetalhe(intimacaoId);

  // Seleção EFÊMERA (client-side) — quais teses entram na peça. Só vira estado
  // persistido (draft_thesis) no "Gerar minuta".
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  const seededRef = useRef(false);
  const autoGenRef = useRef(false);

  const thesesQuery = useQuery({
    queryKey: thesesKey(intimacaoId),
    queryFn: () => getIntimationTheses(fetcher, intimacaoId),
  });

  const generate = useMutation({
    mutationFn: () => generateIntimationTheses(fetcher, intimacaoId),
    onSuccess: (theses) => {
      qc.setQueryData(thesesKey(intimacaoId), theses);
      // Recém-geradas entram todas selecionadas por padrão (o advogado desmarca).
      seededRef.current = true;
      setSelected(new Set(theses.map((t) => t.id)));
    },
    onError: () =>
      toast.error("Não foi possível gerar as teses. Tente de novo."),
  });

  const data = thesesQuery.data;
  const theses = data ?? [];

  // Primeira visita sem teses persistidas → auto-gera uma vez (idempotente por ref).
  useEffect(() => {
    if (
      !thesesQuery.isLoading &&
      !thesesQuery.isError &&
      (data?.length ?? 0) === 0 &&
      !generate.isPending &&
      !autoGenRef.current
    ) {
      autoGenRef.current = true;
      generate.mutate();
    }
  }, [thesesQuery.isLoading, thesesQuery.isError, data, generate]);

  // Teses já persistidas (revisita) → seleciona todas uma vez ao carregar.
  useEffect(() => {
    if (!seededRef.current && data && data.length > 0) {
      seededRef.current = true;
      setSelected(new Set(data.map((t) => t.id)));
    }
  }, [data]);

  const toggle = (t: Thesis) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t.id)) next.delete(t.id);
      else next.add(t.id);
      return next;
    });

  const onFonte = (sourceDocumentId: string) => {
    setHighlightedDocId(sourceDocumentId);
    if (typeof document !== "undefined") {
      document
        .getElementById(`fundada-em-${sourceDocumentId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // A seleção efêmera é projetada no `state` que a TesesRail entende: selecionada
  // → "included" (✓ / no texto), senão "off". Sem PATCH — é tudo local até gerar.
  const railTheses: Thesis[] = theses.map((t) => ({
    ...t,
    state: selected.has(t.id) ? "included" : "off",
  }));

  // "Gerar minuta": materializa o draft (com as teses selecionadas semeadas como
  // included) E dispara a geração numa tacada — o usuário cai já no estado "gerando"
  // (streaming) da Construção, sem um segundo clique.
  const create = useMutation({
    mutationFn: async () => {
      const ids = [...selected];
      const { id } = await createDraft(fetcher, {
        intimationId: intimacaoId,
        thesisIds: ids,
      });
      await generateDraft(fetcher, id, ids);
      return { id };
    },
    onSuccess: ({ id }) => router.replace(`/pecas/${id}`),
    onError: () =>
      toast.error("Não foi possível gerar a minuta. Tente novamente."),
  });

  const gerarMinuta = () => {
    if (create.isPending) return;
    create.mutate();
  };

  const voltar = () => router.push(`/intimacoes/${intimacaoId}`);

  return {
    contexto: detalhe.model,
    contextoLoading: detalhe.isPending,
    theses: railTheses,
    selectedCount: selected.size,
    isLoading: thesesQuery.isLoading,
    isError: thesesQuery.isError,
    toggle,
    onFonte,
    highlightedDocId,
    regenerate: () => generate.mutate(),
    isRegenerating: generate.isPending,
    gerarMinuta,
    isGenerating: create.isPending,
    voltar,
  };
}
