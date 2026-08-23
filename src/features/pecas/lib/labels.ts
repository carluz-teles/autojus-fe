// Rótulos pt-BR compartilhados pelo slice de peças — fonte única (Regra nº1).
// Consumidos pela tela de partida e pelo workspace; evita duas cópias divergentes.

export const TIPO_PECA_LABEL: Record<string, string> = {
  DEFENSE: "Defesa",
  APPEAL: "Recurso",
  PETITION: "Petição",
  MANIFESTATION: "Manifestação",
  COUNTERCLAIM: "Reconvenção",
  BLANK: "Peça",
};

export function rotuloTipoPeca(pieceType: string): string {
  return TIPO_PECA_LABEL[pieceType] ?? "Peça";
}
