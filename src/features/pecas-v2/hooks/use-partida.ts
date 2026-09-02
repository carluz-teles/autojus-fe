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

import type { PecaContexto } from "../lib/peca-contexto";
import {
  createDraft,
  generateDraft,
  generateIntimationTheses,
  getIntimationTheses,
} from "../services/pecas-v2.service";
import type { Thesis } from "../types";
import { isSelectedForGeneration } from "./use-theses";

/** Detalhe da intimação (model do useIntimacaoDetalhe) → contexto do rail. Na partida
 *  ainda não há draft: valor da causa desconhecido ("") e sem anexos (só o Teor). */
function intimacaoToPecaContexto(
  m: NonNullable<ReturnType<typeof useIntimacaoDetalhe>["model"]>,
): PecaContexto {
  return {
    processo: {
      cnj: m.cnj,
      classe: m.classe,
      assunto: m.assunto,
      orgao: m.orgao,
      tribunalGrau: m.tribunalGrau,
      valor: "",
    },
    intimacao: {
      id: m.id,
      tipoLabel: m.tipoLabel,
      publishedAt: m.publicadoEm,
      prazoLabel: `${m.prazoNum} ${m.prazoFrase}`.trim(),
      teor: m.teor,
    },
    partes: m.destinatarios.map((d) => ({
      roleLabel: "Advogado(a)",
      name: d.nome,
      counselLabel: d.oab ? `OAB ${d.oab}` : "",
      isClient: d.matched,
    })),
    autos: [],
  };
}

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
    // Teses persistidas só mudam por "Regenerar" explícito — nunca por refetch.
    // Evita regeneração/refetch acidental ao revisitar a PARTIDA.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const generate = useMutation({
    mutationFn: () => generateIntimationTheses(fetcher, intimacaoId),
    onSuccess: (theses) => {
      qc.setQueryData(thesesKey(intimacaoId), theses);
      // Recém-geradas: semeia a seleção pelo ESTADO persistido do BE (pending_add
      // = pré-selecionada; off = não). Só grounded/alta nascem marcadas.
      seededRef.current = true;
      setSelected(
        new Set(
          theses
            .filter((t) => isSelectedForGeneration(t.state))
            .map((t) => t.id),
        ),
      );
    },
    onError: () =>
      toast.error("Não foi possível gerar as teses. Tente de novo."),
  });

  const data = thesesQuery.data;
  const theses = data ?? [];

  // Primeira visita sem teses persistidas → auto-gera uma vez (idempotente por ref).
  // Depende só do estado da LISTA (data/isLoading/isError), nunca do objeto de mutation
  // (muda de identidade a cada render). Como o GET devolve as persistidas, revisitas NÃO
  // caem aqui (data.length > 0) → a geração roda no MÁXIMO 1x por escopo.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thesesQuery.isLoading, thesesQuery.isError, data]);

  // Teses já persistidas (revisita) → semeia a seleção pelo ESTADO persistido
  // (included|pending_add = selecionada; off = não), respeitando a regra do BE
  // (só grounded/alta nascem marcadas). Roda uma vez ao carregar.
  useEffect(() => {
    if (!seededRef.current && data && data.length > 0) {
      seededRef.current = true;
      setSelected(
        new Set(
          data.filter((t) => isSelectedForGeneration(t.state)).map((t) => t.id),
        ),
      );
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
    contexto: detalhe.model ? intimacaoToPecaContexto(detalhe.model) : null,
    contextoLoading: detalhe.isPending,
    teor: detalhe.model?.teor ?? "",
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
