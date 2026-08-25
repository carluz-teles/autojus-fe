// Rótulos pt-BR compartilhados pelo slice de peças — fonte única (Regra nº1).
// Consumidos pela tela de partida e pelo workspace; evita duas cópias divergentes.

// Closed set alinhado ao BE (internal/draft/entity.go:
//   DEFENSE | COMPLAINT | APPEAL | MOTION | OTHER).
// Chaves legadas (PETITION/MANIFESTATION/COUNTERCLAIM/BLANK) permanecem só como
// fallback pra rows persistidas antes do alinhamento — o novo insert usa só
// os 5 valores acima.
export const TIPO_PECA_LABEL: Record<string, string> = {
  DEFENSE: "Defesa",
  COMPLAINT: "Petição inicial",
  APPEAL: "Recurso",
  MOTION: "Petição",
  OTHER: "Peça",
  // Legado (fallback pra peças criadas antes do fix):
  PETITION: "Petição",
  MANIFESTATION: "Manifestação",
  COUNTERCLAIM: "Reconvenção",
  BLANK: "Peça",
};

export function rotuloTipoPeca(pieceType: string): string {
  return TIPO_PECA_LABEL[pieceType] ?? "Peça";
}
