// Espelha o slice internal/acquisition do BE (contrato docs/import-manual-cnj.md).
// A importação manual é só outro gatilho do pipeline de aquisição: o progresso é um
// capture_run de kind MANUAL_IMPORT (mesmo read model da tela Capturas).
//   POST /v1/acquisition/imports        → ManualImportResult (202 novo | 200 já existe)
//   GET  /v1/acquisition/imports/:id     → CaptureRunView     (polling do estado)
//
// snake_case espelha o JSON do BE; o tenant_id sai do token (nunca do body).

/** Corpo do POST — CNJ mascarado ou 20 dígitos (validado no servidor). */
export interface CreateImportInput {
  cnj: string;
}

/** Status bruto do capture_run. RUNNING não é terminal; OK/PARTIAL/FAILED são. */
type CaptureRunStatus = "RUNNING" | "OK" | "PARTIAL" | "FAILED";

/** Resposta do POST /v1/acquisition/imports. */
export interface ManualImportResult {
  /** id do capture_run a consultar; ausente quando `already_imported`. */
  import_id?: string;
  /** o processo (court_record) no acervo — presente nos dois casos. */
  court_record_id: string;
  /** 20 dígitos, normalizado. */
  cnj_number: string;
  status: CaptureRunStatus;
  /** rótulo pronto para exibir. */
  display_status: string;
  already_imported: boolean;
}

/** Read model do capture_run (mesmo da tela Capturas) — campos relevantes ao polling. */
export interface CaptureRunView {
  id: string;
  kind: string;
  status: CaptureRunStatus;
  display_status: string;
  started_at: string;
  /** set quando terminal. */
  finished_at: string | null;
  court_records_new: number;
  intimations_new: number;
  errors: number;
  duration_sec: number | null;
}
