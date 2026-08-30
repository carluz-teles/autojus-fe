"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { origem, stageLabel } from "../lib/derivar";
import type { PrazoOrigem, PrazoStage } from "../mocks/prazos.mock";
import { listPrazos } from "../services/prazos-triagem.service";
import { prazosKeys } from "./use-prazos-inbox";

// Uma linha do feed do DJEN (Acervo · Intimações): tudo que chegou, inclusive
// sem prazo. Colunas: Publicado / Providência / Cliente / Origem / Status.
export interface AcervoIntimacaoRow {
  id: string;
  publicacao: string;
  providencia: string;
  cliente: string;
  origem: PrazoOrigem;
  origemLabel: string;
  origemCor: string;
  origemFundo: string;
  statusLabel: string;
  statusK: PrazoStage;
}

// Hook público do feed. Uma linha por publicação do mock, ordenada da mais
// recente para a mais antiga. O componente só faz JSX + binding.
export function useAcervoIntimacoes() {
  const query = useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });

  const todos = useMemo(() => query.data ?? [], [query.data]);

  const rows = useMemo<AcervoIntimacaoRow[]>(
    () =>
      [...todos]
        .sort((a, b) => b.publicacao.localeCompare(a.publicacao))
        .map((p) => {
          const o = origem(p.origem);
          return {
            id: p.id,
            publicacao: p.publicacao,
            providencia: p.providencia,
            cliente: p.cliente,
            origem: p.origem,
            origemLabel: o.label,
            origemCor: o.cor,
            origemFundo: o.fundo,
            statusLabel: stageLabel(p.stage),
            statusK: p.stage,
          };
        }),
    [todos],
  );

  return {
    isLoading: query.isLoading,
    rows,
    total: rows.length.toLocaleString("pt-BR"),
  };
}
