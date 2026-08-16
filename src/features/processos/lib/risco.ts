// Risco do processo (§27) — DETERMINÍSTICO, sem LLM. Função pura e testável: a
// partir dos sinais já carregados (prazos, intimações, tarefas) decide o nível e
// os motivos. A UI (RiskBadge) só pinta o resultado; nada de cálculo no JSX.

import type { RiskLevel } from "@/components/ui/risk-badge";
import type { IntimacaoView } from "@/features/intimacoes/types";
import type { PrazoView } from "@/features/prazos/types";
import type { TaskView } from "@/features/tasks/types";

const LIVE_PRAZO: ReadonlySet<PrazoView["status"]> = new Set([
  "OPEN",
  "PENDING",
]);

export interface RiscoInput {
  prazos: PrazoView[];
  intimacoes: IntimacaoView[];
  tasks: TaskView[];
}

export interface RiscoResult {
  level: RiskLevel;
  /** Motivos legíveis que sustentam o nível — mostrados no cartão de risco. */
  reasons: string[];
}

/** Prazos vivos (OPEN/PENDING) do menor days_left ao maior. */
function livePrazosOrdered(prazos: PrazoView[]): PrazoView[] {
  return prazos
    .filter((p) => LIVE_PRAZO.has(p.status))
    .sort((a, b) => a.days_left - b.days_left);
}

// Uma tarefa "cobre" um prazo quando está em aberto e aponta pro mesmo deadline.
function prazoTemTarefa(prazo: PrazoView, tasks: TaskView[]): boolean {
  return tasks.some((t) => t.status === "OPEN" && t.deadline_id === prazo.id);
}

/**
 * Regras (§27), da mais severa à mais branda:
 *  - CRÍTICO: existe prazo vivo vencido (days_left < 0); OU prazo vivo a ≤ 3 dias
 *    sem tarefa em aberto que o cubra (ninguém está tocando o que vence já).
 *  - ATENÇÃO: prazo vivo próximo (≤ 7 dias); OU prazo vivo sem tarefa; OU há
 *    intimação ainda não analisada (sem prazo derivado dela).
 *  - BAIXO: nenhum dos acima.
 */
export function computeRisco({
  prazos,
  intimacoes,
  tasks,
}: RiscoInput): RiscoResult {
  const reasons: string[] = [];
  const live = livePrazosOrdered(prazos);

  const vencido = live.find((p) => p.days_left < 0);
  const proximoSemTarefa = live.find(
    (p) => p.days_left <= 3 && !prazoTemTarefa(p, tasks),
  );

  if (vencido) {
    reasons.push(
      `Prazo vencido há ${Math.abs(vencido.days_left)} dia(s) e ainda em aberto.`,
    );
  }
  if (proximoSemTarefa && proximoSemTarefa !== vencido) {
    reasons.push(
      proximoSemTarefa.days_left <= 0
        ? "Prazo vence hoje e não há tarefa atribuída."
        : `Prazo em ${proximoSemTarefa.days_left} dia(s) sem tarefa atribuída.`,
    );
  }
  if (vencido || proximoSemTarefa) {
    return { level: "critico", reasons };
  }

  const proximo = live.find((p) => p.days_left <= 7);
  if (proximo) {
    reasons.push(`Prazo próximo: vence em ${proximo.days_left} dia(s).`);
  }

  const prazoSemTarefa = live.find((p) => !prazoTemTarefa(p, tasks));
  if (prazoSemTarefa && prazoSemTarefa !== proximo) {
    reasons.push("Há prazo em aberto sem tarefa vinculada.");
  }

  // Intimação "não analisada": ativa e sem prazo derivado apontando pra ela.
  const idsComPrazo = new Set(prazos.map((p) => p.intimation_id));
  const naoAnalisada = intimacoes.find(
    (i) => i.status === "ACTIVE" && !idsComPrazo.has(i.id),
  );
  if (naoAnalisada) {
    reasons.push("Há intimação recebida ainda não analisada.");
  }

  if (proximo || prazoSemTarefa || naoAnalisada) {
    return { level: "atencao", reasons };
  }

  reasons.push("Sem prazos vencidos ou intimações pendentes.");
  return { level: "baixo", reasons };
}
