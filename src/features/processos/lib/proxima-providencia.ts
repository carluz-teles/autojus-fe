// Próxima providência (§10) — DETERMINÍSTICA, sem LLM. Escolhe o prazo vivo
// (OPEN/PENDING) mais próximo e monta o "o que fazer a seguir": o motivo/origem
// (intimação), o vencimento, o responsável (via tarefa vinculada) e o nível de
// urgência para a UI pintar. Função pura e testável; nada de cálculo no JSX.

import type { PrazoView } from "@/features/prazos/types";
import type { TaskView } from "@/features/tasks/types";

import { isPrazoVivo } from "./risco";

export type ProvidenciaUrgencia = "vencido" | "urgente" | "proximo" | "normal";

export interface ProvidenciaResult {
  prazo: PrazoView;
  /** Tarefa em aberto vinculada ao prazo (define o responsável), se houver. */
  task: TaskView | null;
  /** Id da intimação de origem, para deep-link "por quê". */
  intimationId: string | null;
  urgencia: ProvidenciaUrgencia;
}

function urgenciaDe(daysLeft: number): ProvidenciaUrgencia {
  if (daysLeft < 0) return "vencido";
  if (daysLeft <= 3) return "urgente";
  if (daysLeft <= 7) return "proximo";
  return "normal";
}

/**
 * O prazo vivo de menor days_left é a providência. Retorna null quando não há
 * prazo em aberto (a UI cai num estado calmo "nada urgente agora").
 */
export function computeProximaProvidencia(
  prazos: PrazoView[],
  tasks: TaskView[],
): ProvidenciaResult | null {
  const live = prazos.filter(isPrazoVivo);
  if (live.length === 0) return null;

  const prazo = live.reduce((menor, p) =>
    p.days_left < menor.days_left ? p : menor,
  );

  const task =
    tasks.find((t) => t.status === "OPEN" && t.deadline_id === prazo.id) ??
    null;

  return {
    prazo,
    task,
    intimationId: prazo.intimation_id || null,
    urgencia: urgenciaDe(prazo.days_left),
  };
}
