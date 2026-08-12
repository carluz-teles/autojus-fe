// Espelha os read models de tarefa (task) do BE — a lista de "o que fazer"
// derivada dos prazos/intimações (source) e atribuída a um usuário.
//   GET  /v1/tasks                 → PageEnvelope<TaskView>   (agenda global)
//   GET  /v1/processos/:id/tasks   → PageEnvelope<TaskView>   (tarefas do processo)
//   POST /v1/tasks/:id/done        → conclui a tarefa
//   POST /v1/tasks/:id/dismiss     → dispensa a tarefa

export type TaskStatus = "OPEN" | "DONE" | "DISMISSED";

// Tarefa base — mesma forma na agenda global e na aba do processo.
export interface TaskView {
  id: string;
  title: string;
  description?: string;
  /** Tipo da tarefa (ex.: REVIEW_DEADLINE); humanizado na UI. */
  kind?: string;
  /** Vencimento (RFC3339) ou null quando a tarefa não tem prazo. */
  due_date: string | null;
  status: TaskStatus;
  /** Origem (ex.: DEADLINE, INTIMATION, MANUAL) — de onde a tarefa nasceu. */
  source: string;
  /** Id INTERNO do responsável (não o org_id/tenant_id). Base do filtro "meus". */
  assignee_user_id?: string;
  deadline_id?: string;
  intimation_id?: string;
  court_record_id?: string;
  /** Preenchido quando status vira DONE (RFC3339). */
  completed_at: string | null;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
