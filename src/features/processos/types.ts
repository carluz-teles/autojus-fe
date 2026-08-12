// Espelha o read model do BE: GET /v1/processos → { data: ProcessoView[], page }.
// Processo consolidado a partir da captura (DJEN) + enriquecimento (DATAJUD).

export type ProcessoDegree = "UNKNOWN" | "G1" | "G2" | "JE" | "SUPERIOR";
export type ProcessoSecrecy = "PUBLIC" | "RESTRICTED" | "SECRET";

export interface ProcessoView {
  id: string;
  case_id: string;
  cnj_number: string;
  court: string;
  degree: ProcessoDegree;
  class: string;
  subject: string;
  judging_body: string;
  filed_at: string | null;
  secrecy: ProcessoSecrecy;
  lifecycle: string;
  completeness: number;
  last_movement_text: string;
  last_movement_at: string | null;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
