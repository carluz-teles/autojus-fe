"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useApi } from "@/lib/api/use-api";

type Result = {
  status: "ready" | "busy" | "unavailable" | "no_sources";
  expires_in_seconds?: number;
};

export function useGenerationPreparation(
  id: string,
  instructions: string,
  thesisIds: string[],
  sourceVersion: string,
  enabled: boolean,
) {
  const api = useApi();
  const input = JSON.stringify({
    instructions: instructions.trim(),
    thesis_ids: [...thesisIds].sort(),
    sourceVersion,
  });
  const [settled, setSettled] = useState("");
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => setSettled(input), 2000);
    return () => clearTimeout(timer);
  }, [input, enabled]);
  const query = useQuery({
    queryKey: ["pecas-v2", "generation-preparation", id, input],
    enabled: enabled && settled === input && !!instructions.trim(),
    queryFn: async ({ signal }) => {
      const body = JSON.parse(input) as {
        instructions: string;
        thesis_ids: string[];
        sourceVersion: string;
      };
      const response = await api<{ data: Result }>(
        `/v1/pecas/${id}/generation-preparation`,
        {
          method: "POST",
          body: {
            instructions: body.instructions,
            thesis_ids: body.thesis_ids,
          },
          signal,
        },
      );
      return response.data;
    },
    retry: false,
    staleTime: 60_000,
    gcTime: 120_000,
    refetchInterval: (query) =>
      query.state.data?.status === "busy" ? 5000 : 90_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  if (!enabled || !instructions.trim()) return undefined;
  if (settled !== input)
    return "As fontes serão conferidas após você concluir as alterações.";
  if (query.isFetching)
    return "Conferindo as fontes em segundo plano. Você já pode gerar a peça.";
  if (query.isError)
    return "Pré-análise indisponível. As fontes serão conferidas durante a geração.";
  switch (query.data?.status) {
    case "ready":
      return "Pré-análise concluída. Ao gerar, o contexto será conferido novamente antes do reaproveitamento.";
    case "no_sources":
      return "Sem trechos de autos disponíveis para antecipar a análise. Confira as fontes.";
    case "busy":
      return "Outra pré-análise está em andamento. Isso não impede a geração.";
    default:
      return "As fontes serão conferidas durante a geração.";
  }
}
