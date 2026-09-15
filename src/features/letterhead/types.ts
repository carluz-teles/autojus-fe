// Espelha o slice internal/letterhead do BE (contrato docs/papel-timbrado-contrato-fe.md).
//   POST   /v1/letterheads/uploads   → StartUploadResult      (passo 1: pede URL presigned)
//   POST   /v1/letterheads           → LetterheadView (201)    (passo 3: confirma + cria)
//   GET    /v1/letterheads           → { data: LetterheadView[] }
//   GET    /v1/letterheads/:id        → LetterheadView          (com asset_url p/ preview)
//   PATCH  /v1/letterheads/:id        → LetterheadView          (renomear / ajustar margens)
//   PATCH  /v1/letterheads/:id/default → LetterheadView         (marca como padrão)
//   DELETE /v1/letterheads/:id        → 204
//
// snake_case espelha o JSON do BE; nunca enviamos tenant_id/org_id (o BE resolve pelo JWT).

/** Tipos de imagem aceitos na v1 (PDF ainda não). */
export type LetterheadContentType = "image/png" | "image/jpeg";

/** Área segura em milímetros onde o corpo da peça é impresso (não colide com o timbre). */
export interface LetterheadMargins {
  top_mm: number;
  right_mm: number;
  bottom_mm: number;
  left_mm: number;
}

/** Read model do papel timbrado. `asset_url` só vem no GET :id (presigned GET, 5 min). */
export interface LetterheadView {
  id: string;
  name: string;
  asset_content_type: LetterheadContentType;
  margins: LetterheadMargins;
  is_default: boolean;
  /** RFC3339. */
  created_at: string;
  updated_at: string;
  /** Presigned GET de TTL curto — presente apenas na resposta do GET :id. */
  asset_url?: string;
}

/** Envelope do GET /v1/letterheads (default primeiro, depois mais recentes). */
export interface LetterheadListEnvelope {
  data: LetterheadView[];
}

// ── Upload presigned (3 passos) ──
/** Passo 1 — corpo do POST /v1/letterheads/uploads. */
export interface StartLetterheadUploadInput {
  content_type: LetterheadContentType;
  file_name: string;
}

/** Passo 1 — resposta: URL presigned de PUT + a chave do objeto no storage. */
export interface StartLetterheadUploadResult {
  upload_url: string;
  asset_key: string;
  /** validade da URL em segundos. */
  expires_in: number;
}

/** Passo 3 — corpo do POST /v1/letterheads (confirma bytes + cria registro). */
export interface CreateLetterheadInput {
  name: string;
  asset_key: string;
  content_type: LetterheadContentType;
  /** Opcional — default ABNT forense (3/2/2/3 cm) se ausente. */
  margins?: LetterheadMargins;
  /** Opcional — marca como padrão do escritório. */
  is_default?: boolean;
}

/** Corpo do PATCH /v1/letterheads/:id (renomear e/ou ajustar margens). */
export interface UpdateLetterheadInput {
  name?: string;
  margins?: LetterheadMargins;
}

/** Margens padrão ABNT forense (3 · 2 · 2 · 3 cm) — usadas ao criar um timbrado. */
export const DEFAULT_MARGINS: LetterheadMargins = {
  top_mm: 30,
  right_mm: 20,
  bottom_mm: 20,
  left_mm: 30,
};
