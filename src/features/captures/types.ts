export type CaptureSource = "DJEN" | "DATAJUD";
export type CaptureKind = "DAILY_CAPTURE" | "ENRICHMENT" | "INITIAL_LOAD";
export type CaptureDisplayStatus =
  | "Concluída"
  | "Concluída com avisos"
  | "Falha parcial"
  | "Em andamento";

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
