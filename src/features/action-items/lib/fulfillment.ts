import type { ProvidenciaFulfillment } from "../types";

/**
 * Só há decisão de "já concluída" quando o servidor trouxe evidência concreta
 * e ainda atual. Dados negativos, stale, invalidados ou incompletos não criam
 * CTA nem aviso na UI.
 */
export function hasActionableFulfillment(
  fulfillment?: ProvidenciaFulfillment | null,
): fulfillment is ProvidenciaFulfillment {
  if (!fulfillment) return false;
  if (fulfillment.status !== "possible_fulfillment") return false;
  if (
    !fulfillment.sources ||
    fulfillment.invalidated ||
    fulfillment.sources.stale
  )
    return false;
  return fulfillment.evidence.some(isValidFulfillmentEvidence);
}

export function isValidFulfillmentEvidence(
  evidence: ProvidenciaFulfillment["evidence"][number],
): boolean {
  return (
    evidence.document_id.trim().length > 0 && evidence.quote.trim().length > 0
  );
}
