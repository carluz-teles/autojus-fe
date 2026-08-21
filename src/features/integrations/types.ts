// Espelha o read model do BE (internal/acquisition) para o que a tela de
// reconciliações consome. Ativação/OAB-lookup saíram da UI (2026-08-19) — os
// tipos ficaram só com o que reconciliation-detail.tsx e use-reconciliations.ts
// ainda leem.

// ——— Reconciliações ———
// Contrato do read model de reconciliações (GET /v1/acquisition/reconciliations e
// derivados). O "reconciliação" é uma importação (backfill_job) agregando suas
// janelas (sync_run); o detalhe abre as janelas e o collapse lista os itens que
// cada janela trouxe (via sync_run_id).
export type ReconciliationStatus = "RUNNING" | "COMPLETED" | "PARTIAL";
export type SyncRunStatus = "OK" | "FAILED" | "RUNNING";

export interface Reconciliation {
  id: string;
  source: string;
  status: ReconciliationStatus;
  window_from: string;
  window_to: string;
  processos: number;
  intimacoes: number;
  total_slices: number;
  slices_ok: number;
  slices_error: number;
  started_at: string;
  finished_at?: string | null;
}

export interface ReconciliationWindow {
  id: string;
  source: string;
  window_from: string;
  window_to: string;
  status: SyncRunStatus;
  processos_new: number;
  intimacoes_new: number;
  error?: string | null;
  started_at: string;
  finished_at?: string | null;
}

export interface ReconciliationImport {
  status: "RUNNING" | "COMPLETED" | "PARTIAL" | "NONE";
  importing: boolean;
  total_slices: number;
  slices_ok: number;
  slices_error: number;
  window_from?: string;
  window_to?: string;
}

export interface ReconciliationsView {
  import: ReconciliationImport;
  totals: { court_records: number; intimations: number };
  reconciliations: Reconciliation[];
}

export interface ReconciliationDetailView {
  reconciliation: Reconciliation;
  windows: ReconciliationWindow[];
}

export interface ProcessoLine {
  id: string;
  cnj_number: string;
  court: string;
  degree: string;
  class: string;
}

export interface IntimacaoLine {
  id: string;
  cnj_number: string;
  court: string;
  degree: string;
  type: string;
  status: string;
  made_available_at: string;
}

export interface SyncRunItemsView {
  processos: ProcessoLine[];
  intimacoes: IntimacaoLine[];
}

// ——— OABs monitoradas com nome (GET /v1/acquisition/watched-oabs) ———
/** Uma OAB monitorada com o nome do advogado derivado de party_counsel. */
export interface WatchedOab {
  /** Chave canônica "UFNUMERO" (ex.: "SP347019"). */
  oab: string;
  /** Nome mais frequente em party_counsel; null quando ainda não há captura. */
  name: string | null;
}

export interface WatchedOabsResponse {
  data: WatchedOab[];
}

// ——— Integrações (OAB monitoring scope) ———
// Espelha integrationView do BE (internal/acquisition/handler.go). A fonte de
// verdade do monitoramento de OABs é o scope.oab da integração source==="DJEN".
export interface IntegrationScope {
  oab: string[];
  taxId?: string[];
}

export interface IntegrationView {
  id: string;
  source: "DJEN" | "DATAJUD" | string;
  scope: IntegrationScope;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationsListResponse {
  data: IntegrationView[];
}
