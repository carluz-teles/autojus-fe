"use client";

import { useMemo } from "react";

import { useIntimacoesDoProcesso } from "@/features/intimacoes/hooks/use-intimacoes-do-processo";
import { usePrazosDoProcesso } from "@/features/prazos/hooks/use-prazos-do-processo";
import { useTasksDoProcesso } from "@/features/tasks/hooks/use-tasks-do-processo";

import { computeProximaProvidencia } from "../lib/proxima-providencia";
import { computeRisco, isPrazoVivo } from "../lib/risco";
import { useProcessoDetalhe } from "./use-processo-detalhe";

// Contagens de tarefas derivadas no cliente (o BE não entrega o recorte).
function contaTasks(tasks: { status: string; due_date: string | null }[]) {
  const now = Date.now();
  let abertas = 0;
  let atrasadas = 0;
  for (const t of tasks) {
    if (t.status !== "OPEN") continue;
    abertas += 1;
    if (t.due_date) {
      const due = new Date(t.due_date).getTime();
      if (!Number.isNaN(due) && due < now) atrasadas += 1;
    }
  }
  return { abertas, atrasadas };
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

  const tasksCount = useMemo(() => contaTasks(tasks), [tasks]);

  const intimacoesPendentes = useMemo(() => {
    const idsComPrazo = new Set(prazos.map((p) => p.intimation_id));
    return intimacoes.filter(
      (i) => i.status === "ACTIVE" && !idsComPrazo.has(i.id),
    ).length;
  }, [intimacoes, prazos]);

  // Badge da aba Intimações: contagem pela situação de triagem (user_status),
  // o mesmo "Pendente" já usado na inbox global (lib/labels.ts USER_STATUS_LABEL).
  const intimacoesTriagemPendente = useMemo(
    () => intimacoes.filter((i) => i.user_status === "PENDING").length,
    [intimacoes],
  );

  // Badge da aba Prazos: prazos "vivos" (mesmo filtro de lib/risco.ts, reusado
  // também em lib/proxima-providencia.ts — não reinventar).
  const prazosVivos = useMemo(
    () => prazos.filter(isPrazoVivo).length,
    [prazos],
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
    counts: {
      intimacoesTotal: intimacoesQ.totalCount,
      intimacoesPendentes,
      intimacoesTriagemPendente,
      tasksAbertas: tasksCount.abertas,
      tasksAtrasadas: tasksCount.atrasadas,
      prazosVivos,
    },
    // estados de carregamento dos blocos secundários (não bloqueiam o header)
    signalsPending:
      prazosQ.isPending || tasksQ.isPending || intimacoesQ.isPending,
  };
}
