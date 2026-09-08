// Espelha os read models de providência (action_item) do BE — a única unidade
// atômica de trabalho (a entidade "Tarefa" foi eliminada). A Providência nasce
// SUGGESTED (só diagnóstico, nunca no board/fila), entra no trabalho com
// "Iniciar" (→ TODO) e segue TODO → WORKING → DONE.
//   GET   /v1/action-items                → PageEnvelope<ActionItemView>  (board/fila; só TODO/WORKING/DONE)
//   GET   /v1/action-items/summary        → buckets a_fazer/em_elaboracao/concluida
//   GET   /v1/action-items/:id            → { data: ActionItemView }  (detalhe)
//   GET   /v1/processos/:id/action-items  → PageEnvelope<ActionItemView>  (aba do processo)
//   POST  /v1/action-items/:id/iniciar    → SUGGESTED→TODO ("Iniciar providência")
//   POST  /v1/action-items/:id/comecar    → TODO→WORKING (dar ciência)
//   POST  /v1/action-items/:id/concluir   → WORKING→DONE
//   PATCH /v1/action-items/:id            → edita title/description/priority/due_date/assignee

// Status do TRABALHO — ciclo linear sem saída. SUGGESTED é só diagnóstico
// (nunca vem no board/fila/summary); a UI de trabalho lida com TODO/WORKING/DONE.
export type ActionItemStatus =
  "SUGGESTED" | "TODO" | "WORKING" | "DONE" | "CANCELLED" | "DISMISSED";

// Prioridade — flag de triagem HIGH|MEDIUM|LOW, ou ausente ("sem prioridade").
// Espelha o priority do BE (text nullable). Os rótulos em PT vivem na UI; o wire
// é sempre o enum em inglês.
export type ActionItemPriority = "HIGH" | "MEDIUM" | "LOW";

// Proveniência da classificação do TIPO: declarada no teor, inferida pela IA, ou
// corrigida manualmente (reclassificar muda pra "manual").
export type ActionItemTipoOrigem = "declarado" | "ia" | "manual";

// Gate de tipo: "confiavel" já pode virar trabalho; "a_confirmar" espera o
// usuário confirmar o tipo antes (POST /confirmar).
export type ActionItemTipoStatus = "confiavel" | "a_confirmar";

// Tipo de ato/providência — closed set espelhado do BE (internal/actionitem).
export type ActionItemTipo =
  "contestar" | "recorrer" | "manifestar" | "cumprir" | "ciencia";

// Providência base — mesma forma no board/fila e na aba do processo (ActionItemView do BE).
export interface ActionItemView {
  id: string;
  intimation_id: string;
  court_record_id?: string;
  /** Texto da providência (o "que fazer"). */
  title: string;
  description?: string;
  /** Tipo do ato (contestar/recorrer/manifestar/cumprir/ciencia). */
  tipo: ActionItemTipo;
  /** true = esta providência dá origem a uma peça (ver `piece_profile_key`). */
  gera_peca: boolean;
  /** Perfil de peça (catálogo GET /v1/piece-profiles); ausente quando gera_peca=false. */
  piece_profile_key?: string;
  tipo_origem: ActionItemTipoOrigem;
  tipo_status: ActionItemTipoStatus;
  deadline_id?: string;
  /** Confiança da IA (0-1); só presente quando tipo_origem="ia". */
  confianca?: number;
  status: ActionItemStatus;
  /** Prioridade HIGH|MEDIUM|LOW; ausente = sem prioridade. */
  priority?: ActionItemPriority;
  /** Vencimento (RFC3339) ou null quando não tem prazo. */
  due_date: string | null;
  /** Id INTERNO do responsável (não o org_id/tenant_id). Base do filtro "meus". */
  assignee_user_id?: string;
  created_by?: string;
  /** Preenchido quando status vira DONE (RFC3339). */
  completed_at: string | null;
  /** CNJ do processo de origem (join do court_record); ausente sem processo. */
  cnj_number?: string;
  /** Órgão/tribunal do processo de origem; ausente sem processo. */
  court?: string;
  created_at: string;
  updated_at: string;
  source_kind?: "manual" | "analysis";
  process_title?: string;
  judicial_due_date?: string | null;
  judicial_status?: string | null;
  judicial_review_status?: string | null;
  effective_due_date?: string | null;
  draft_id?: string | null;
  draft_state?: string | null;
  draft_title?: string | null;
  intimation_text?: string | null;
  activity?: WorkActivity[];
}

/**
 * Corpo do PATCH /v1/action-items/:id — ajuste PARCIAL. Só os campos presentes
 * mudam; um ausente mantém o valor no BE. `due_date: ""` limpa o vencimento;
 * `assignee_user_id: ""` desatribui. Status muda por iniciar/comecar/concluir
 * (não é editável aqui). Espelha o PatchActionItemRequest do BE.
 */
export interface UpdateActionItemInput {
  title?: string;
  description?: string;
  /** Prioridade HIGH|MEDIUM|LOW; "" limpa (sem prioridade). */
  priority?: ActionItemPriority | "";
  /** "YYYY-MM-DD" (date input); "" limpa o vencimento. */
  due_date?: string;
  assignee_user_id?: string;
}

/**
 * Contadores agregados do board de providências — GET /v1/action-items/summary.
 * Objeto único (sem envelope de cursor), nos 3 buckets de status de trabalho.
 * SUGGESTED nunca entra nas contagens. Espelha o ActionItemsSummary do BE.
 */
export interface ActionItemsSummary {
  /** TODO — "A Fazer". */
  a_fazer: number;
  /** WORKING — "Em elaboração". */
  em_elaboracao: number;
  /** DONE — "Concluída". */
  concluida: number;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";

export interface WorkActivity {
  id: string;
  actor_user_id: string | null;
  kind: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  created_at: string;
}
export interface CreateWorkInput {
  court_record_id: string;
  intimation_id?: string;
  title: string;
  description: string;
  tipo: ActionItemTipo;
  piece_profile_key: string;
  assignee_user_id: string;
  priority: string;
  due_date: string;
}
