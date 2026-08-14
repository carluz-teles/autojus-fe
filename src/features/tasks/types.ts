// Espelha os read models de tarefa (task) do BE — a lista de "o que fazer"
// derivada dos prazos/intimações (source) e atribuída a um usuário.
//   GET  /v1/tasks                 → PageEnvelope<TaskView>   (agenda global)
//   GET  /v1/processos/:id/tasks   → PageEnvelope<TaskView>   (tarefas do processo)
//   POST /v1/tasks                 → cria uma tarefa manual (avulsa ou com contexto)
//   PATCH /v1/tasks/:id            → edita os campos da tarefa (ajuste parcial)
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
  /**
   * Status de apresentação DERIVADO pelo BE (Aberta|Em execução|Concluída|
   * Atrasada; "" para DISMISSED). É a fonte da coluna STATUS e do StatusBadge de
   * tarefa; o `status` cru segue para as ações. Aditivo — pode vir ausente.
   */
  display_status?: string;
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

/**
 * Item do checklist de uma tarefa (subtarefa marcável) — item do array `items` do
 * detalhe (GET /v1/tasks/:id). `done_at` só vem quando `done` é true. Espelha o
 * TaskItemView do BE.
 */
export interface TaskItemView {
  id: string;
  title: string;
  position: number;
  done: boolean;
  done_at: string | null;
  created_at: string;
}

/** Progresso do checklist — {done, total}. Espelha o TaskProgress do BE. */
export interface TaskProgress {
  done: number;
  total: number;
}

/**
 * Detalhe da tarefa — GET /v1/tasks/:id. Os campos da tarefa + o checklist ordenado
 * (`items`), o progresso (`progress`) e o `display_status` DERIVADO. `items` é sempre
 * um array (nunca null). Espelha o TaskDetailView do BE.
 */
export interface TaskDetailView {
  id: string;
  title: string;
  description?: string;
  kind?: string;
  due_date: string | null;
  status: TaskStatus;
  display_status?: string;
  source: string;
  assignee_user_id?: string;
  deadline_id?: string;
  intimation_id?: string;
  court_record_id?: string;
  completed_at: string | null;
  items: TaskItemView[];
  progress: TaskProgress;
}

/**
 * Corpo do POST /v1/tasks — cria uma tarefa manual (source MANUAL, status OPEN, ambos
 * server-set). Só `title` é obrigatório; os FKs de contexto (deadline/intimation/court_record)
 * e o assignee são opcionais — a tarefa pode ser avulsa. `due_date` no formato "YYYY-MM-DD"
 * (date input); campos vazios/omitidos = ausentes no BE. Sem tenant_id/org_id: o BE resolve
 * pelo JWT (created_by = principal). Espelha o CreateTaskRequest do BE.
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
  kind?: string;
  due_date?: string;
  /** Id INTERNO do responsável (Me.user_id) — nunca org_id/tenant_id. */
  assignee_user_id?: string;
  deadline_id?: string;
  intimation_id?: string;
  court_record_id?: string;
}

/**
 * Corpo do PATCH /v1/tasks/:id — ajuste PARCIAL. Só os campos presentes mudam; um ausente
 * mantém o valor no BE. `due_date: ""` limpa o vencimento; `assignee_user_id: ""` desatribui.
 * Status só muda por done/dismiss (não é editável aqui). Espelha o UpdateTaskRequest do BE.
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  kind?: string;
  due_date?: string;
  assignee_user_id?: string;
}

/**
 * Contadores agregados da agenda de tarefas — GET /v1/tasks/summary. Objeto único
 * (sem envelope de cursor), nos buckets do display_status. Alimenta a KpiRow.
 */
export interface TasksSummary {
  abertas: number;
  em_execucao: number;
  concluidas: number;
  atrasadas: number;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
