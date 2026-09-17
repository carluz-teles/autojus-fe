// Espelha o read model do BE (internal/acquisition) para o que a tela de
// reconciliações consome. Ativação/OAB-lookup saíram da UI (2026-08-19) — os
// tipos ficaram só com o que reconciliation-detail.tsx e use-reconciliations.ts
// ainda leem.

// ——— OABs monitoradas com nome (GET /v1/acquisition/watched-oabs) ———
/** Uma OAB monitorada com o nome do advogado derivado de party_counsel. */
type WatchedOabLastAction = "ADDED" | "DISABLED" | "REENABLED";

interface WatchedOab {
  /** Chave canônica "UFNUMERO" (ex.: "SP347019"). */
  oab: string;
  /** Nome mais frequente em party_counsel; null quando ainda não há captura. */
  name: string | null;
  /** Liga/desliga a captura para esta OAB sem removê-la do scope. */
  enabled: boolean;
  /** Ação mais recente (adicionar/desligar/religar); null numa linha anterior a essa coluna existir. */
  last_action: WatchedOabLastAction | null;
  last_action_at: string | null; // RFC3339
}

export interface WatchedOabsResponse {
  data: WatchedOab[];
}

/** Resposta de POST/PATCH em /v1/acquisition/watched-oabs — sem `name` (o BE só
 * deriva o nome depois que a captura roda ao menos uma vez). */
export interface WatchedOabToggle {
  oab: string;
  enabled: boolean;
}
