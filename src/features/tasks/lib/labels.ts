// Humanizações da tarefa (task) num só lugar — a agenda consome daqui; nada de
// cálculo no JSX (Regra nº1). O rótulo de status vem DERIVADO do BE (display_status,
// já em pt-BR) e casa com o helper de tom do DS (tarefaTone).

import type { TaskStatus } from "../types";

// "kind" legível: mapa dos tipos conhecidos + humanização de fallback, para que
// qualquer valor do BE apareça apresentável.
const KIND_LABEL: Record<string, string> = {
  REVIEW_DEADLINE: "Revisar prazo",
  CONFIRM_DEADLINE: "Confirmar prazo",
  REVIEW_INTIMATION: "Revisar intimação",
  DRAFT_DOCUMENT: "Elaborar peça",
  FILE_DOCUMENT: "Protocolar peça",
  CONTACT_CLIENT: "Contatar cliente",
};

function humanize(raw: string): string {
  const spaced = raw.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Tipo da tarefa em pt-BR — mapa conhecido, senão humaniza; null quando ausente. */
export function taskKindLabel(kind: string | undefined): string | null {
  if (!kind) return null;
  return KIND_LABEL[kind] ?? humanize(kind);
}

/**
 * Rótulo de status da tarefa — usa o display_status DERIVADO pelo BE (já em pt-BR:
 * Aberta|Em execução|Concluída|Atrasada). Para DISMISSED (display_status vazio) cai
 * em "Dispensada". É a fonte da coluna STATUS/StatusBadge (tarefaTone lê o texto).
 */
export function taskStatusLabel(task: {
  display_status?: string;
  status: TaskStatus;
}): string {
  if (task.display_status) return task.display_status;
  return task.status === "DISMISSED" ? "Dispensada" : task.status;
}
