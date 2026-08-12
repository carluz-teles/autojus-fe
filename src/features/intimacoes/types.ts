// Espelha o read model do BE: GET /v1/intimacoes → { data: IntimacaoView[], page }.
// Publicações capturadas do DJEN pelas OABs monitoradas (intimation → read model).

export type IntimacaoDegree = "UNKNOWN" | "G1" | "G2" | "JE" | "SUPERIOR";
export type IntimacaoType = "INTIMACAO" | "CITACAO" | "COMUNICACAO";
export type IntimacaoStatus = "ACTIVE" | "CANCELLED";

export interface IntimacaoView {
  id: string;
  cnj_number: string;
  court: string;
  degree: IntimacaoDegree;
  type: IntimacaoType;
  status: IntimacaoStatus;
  source: string;
  source_url: string;
  made_available_at: string;
  published_at: string;
  deadline_start_at: string;
  content_preview: string;
}

/** Envelope paginado por cursor do BE: { data, page: { next_cursor, limit } }. */
export interface PageEnvelope<T> {
  data: T[];
  page: {
    next_cursor: string | null;
    limit: number;
    total_count: number;
    total: number;
  };
}
