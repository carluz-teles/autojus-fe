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
