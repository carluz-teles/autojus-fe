// Espelha o read model do BE (internal/acquisition handler.integrationView + Scope).
// Fonte ativável no v0: só DJEN (descoberta nacional por OAB). DATAJUD virou
// enrichment-only (enriquece por número, disparado internamente por evento) e
// NÃO é mais ativável pelo usuário — o BE rejeita "DATAJUD" com HTTP 400.
// UPLOAD também não passa pela ativação.

export const ACTIVATABLE_SOURCES = ["DJEN"] as const;
export type IntegrationSource = (typeof ACTIVATABLE_SOURCES)[number];

export const STATUS_ACTIVE = "ACTIVE";

export interface Scope {
  oab: string[];
  taxId?: string[];
}

export interface Integration {
  id: string;
  source: string;
  scope: Scope;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ActivateIntegrationInput {
  sources: IntegrationSource[];
  scope: Scope;
}

/** Envelope de lista do BE: { data: [...] } (conjunto pequeno, sem cursor). */
export interface ListEnvelope<T> {
  data: T[];
}

export const SOURCE_LABELS: Record<IntegrationSource, string> = {
  DJEN: "DJEN — Diário de Justiça Eletrônico Nacional",
};

// ——— Catálogo de fontes da tela de integrações ———
// Inclui as NÃO-ativáveis de propósito: DATAJUD comunica o pipeline (enriquece
// sozinho, disparado pela descoberta) e UPLOAD comunica o roadmap. Só as
// entradas kind="discovery" passam pela ativação (ACTIVATABLE_SOURCES acima).
export type SourceKind = "discovery" | "enrichment" | "upcoming";

export interface SourceCatalogEntry {
  id: string;
  name: string;
  fullName: string;
  kind: SourceKind;
  description: string;
}

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  {
    id: "DJEN",
    name: "DJEN",
    fullName: "Diário de Justiça Eletrônico Nacional",
    kind: "discovery",
    description:
      "Descobre processos e intimações em todo o país pelas OABs monitoradas. Captura diária, com importação do histórico de 1 ano na ativação.",
  },
  {
    id: "DATAJUD",
    name: "DATAJUD",
    fullName: "Base Nacional de Dados do Judiciário — CNJ",
    kind: "enrichment",
    description:
      "Enriquece cada processo descoberto — classe, órgão julgador e movimentos — pelo número CNJ. Automático, sem configuração.",
  },
  {
    id: "UPLOAD",
    name: "Upload",
    fullName: "Importação manual de processos e peças",
    kind: "upcoming",
    description:
      "Envie listas de processos ou documentos para incorporar ao acervo mesmo sem publicação em diário.",
  },
];

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
