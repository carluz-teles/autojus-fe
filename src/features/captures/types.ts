export type CaptureSource = "DJEN" | "DATAJUD";
export type CaptureKind =
  "DAILY_CAPTURE" | "ENRICHMENT" | "INITIAL_LOAD" | "CATCH_UP";
export type CaptureDisplayStatus =
  "Concluída" | "Concluída com avisos" | "Falha parcial" | "Em andamento";
export type CaptureTriggerReason = "OAB_ADDED" | "OAB_REENABLED";

export interface CaptureRunView {
  id: string;
  source: CaptureSource;
  kind: CaptureKind;
  window_from: string | null; // "YYYY-MM-DD"
  window_to: string | null;
  started_at: string; // RFC3339
  finished_at: string | null;
  status: string;
  display_status: CaptureDisplayStatus;
  court_records_new: number;
  intimations_new: number;
  court_records_updated: number;
  deadlines_created: number;
  tasks_created: number;
  errors: number;
  duration_sec: number | null;
  oab_count: number;
  // trigger_reason/trigger_oabs atribuem a captura à OAB que a disparou — presente
  // só em INITIAL_LOAD (OAB_ADDED) e CATCH_UP (OAB_REENABLED); ausente em
  // DAILY_CAPTURE/ENRICHMENT, que nunca são disparadas por uma OAB específica.
  trigger_reason: CaptureTriggerReason | null;
  trigger_oabs: string[] | null;
}

export interface CapturesSummary {
  last_capture_at: string | null; // RFC3339
  intimations_new_today: number;
  deadlines_derived_today: number;
  next_execution: string | null; // "HH:MM"
}

export interface CapturesView {
  summary: CapturesSummary;
  runs: CaptureRunView[];
}
