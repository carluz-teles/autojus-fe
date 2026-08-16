"use client";

import { useMemo } from "react";

import { useIntimacoesDoProcesso } from "@/features/intimacoes/hooks/use-intimacoes-do-processo";
import { selectUltimaIntimacao } from "@/features/intimacoes/lib/ultima-intimacao";
import { usePrazosDoProcesso } from "@/features/prazos/hooks/use-prazos-do-processo";
import { isLivePrazo } from "@/features/prazos/lib/proximo-prazo";
import { useTasksDoProcesso } from "@/features/tasks/hooks/use-tasks-do-processo";

import { computeProximaProvidencia } from "../lib/proxima-providencia";
import { computeRisco } from "../lib/risco";
import { useProcessoDetalhe } from "./use-processo-detalhe";

// Contagem de tarefas abertas derivada no cliente (o BE não entrega o recorte).
function contaTasksAbertas(tasks: { status: string }[]): number {
  return tasks.filter((t) => t.status === "OPEN").length;
}

/**
 * Hook público do cockpit — compõe os sub-hooks (detalhe + prazos + tarefas +
 * intimações), roda os cálculos determinísticos (risco §27, próxima providência
 * §10) e as contagens dos cards de visão geral. O componente da página consome
 * só este; nenhum cálculo mora no JSX.
 */
export function useProcessoCockpit(processoId: string) {
  const detalhe = useProcessoDetalhe(processoId);
  const prazosQ = usePrazosDoProcesso(processoId);
  const tasksQ = useTasksDoProcesso(processoId);
  const intimacoesQ = useIntimacoesDoProcesso(processoId);

  const { prazos, proximoPrazo } = prazosQ;
  const { tasks } = tasksQ;
  const { intimacoes } = intimacoesQ;

  const risco = useMemo(
    () => computeRisco({ prazos, intimacoes, tasks }),
    [prazos, intimacoes, tasks],
  );

  const providencia = useMemo(
    () => computeProximaProvidencia(prazos, tasks),
    [prazos, tasks],
  );

  const tasksAbertas = useMemo(() => contaTasksAbertas(tasks), [tasks]);

  const intimacoesPendentes = useMemo(() => {
    const idsComPrazo = new Set(prazos.map((p) => p.intimation_id));
    return intimacoes.filter(
      (i) => i.status === "ACTIVE" && !idsComPrazo.has(i.id),
    ).length;
  }, [intimacoes, prazos]);

  // Prazos vivos (OPEN/PENDING) — mesmo critério do "próximo prazo" (herói) e da
  // separação vivos × histórico da aba, aqui sem excluir o herói (é a contagem
  // total, não a lista renderizada).
  const prazosAbertos = useMemo(
    () => prazos.filter(isLivePrazo).length,
    [prazos],
  );

  const ultimaIntimacao = useMemo(
    () => selectUltimaIntimacao(intimacoes),
    [intimacoes],
  );

  return {
    processo: detalhe.processo,
    isPending: detalhe.isPending,
    isError: detalhe.isError,
    error: detalhe.error,

    // sinais já derivados para os cards e blocos
    proximoPrazo,
    risco,
    providencia,
    ultimaIntimacao,
    counts: {
      intimacoesPendentes,
      tasksAbertas,
      prazosAbertos,
    },
    // estados de carregamento dos blocos secundários (não bloqueiam o header)
    signalsPending:
      prazosQ.isPending || tasksQ.isPending || intimacoesQ.isPending,
  };
}
