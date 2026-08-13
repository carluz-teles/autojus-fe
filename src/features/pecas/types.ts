// Domínio de Peças (produção de minutas com IA: draft → review → petition). O
// BACKEND de Peças é FASE 4 e ainda NÃO existe — não há endpoint. Estes tipos
// descrevem a forma do read model que a Fase 4 vai entregar, para que a casca
// (lista + detalhe) seja fiel ao design sem inventar dado real.

/** Status de uma peça no ciclo de produção (Fase 4). */
export type PecaStatus =
  "RASCUNHO" | "EM_PRODUCAO" | "EM_REVISAO" | "PROTOCOLADA" | "ARQUIVADA";

/** Origem da peça — de onde a produção nasceu. */
export type PecaOrigem = "IA" | "MODELO" | "BRANCO" | "INTIMACAO";

/**
 * Linha da lista global de peças (read model da Fase 4). Presente aqui só para
 * tipar as linhas de PRÉVIA — a casca não renderiza dado real enquanto o BE não
 * existir.
 */
export interface PecaView {
  id: string;
  code: string;
  title: string;
  type: string;
  cnj_number: string;
  origem: PecaOrigem;
  responsavel: string | null;
  status: PecaStatus;
  version: number;
  updated_at: string;
}

/** Contadores da KpiRow (GET /v1/pecas/summary — Fase 4). */
export interface PecasSummary {
  total: number;
  em_producao: number;
  em_revisao: number;
  protocoladas: number;
  arquivadas: number;
}

/** Detalhe de uma peça (deep-link /pecas/[id] — Fase 4). */
export interface PecaDetalheView extends PecaView {
  prazo_relacionado: string | null;
}
