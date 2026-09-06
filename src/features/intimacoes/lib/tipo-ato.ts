// Rótulos pt-BR do tipo de ato jurídico (deadline.tipo_ato do BE) — o "o que fazer" que a
// intimação exige. Fonte única (Regra nº1): nada de rótulo hard-coded no JSX. O closed set
// espelha internal/deadline/entity.go (TipoAto*). Diretiva app-wide: nunca citar "IA" no texto.

/** Rótulo pt-BR de cada tipo de ato. Chaves = deadline.tipo_ato (snake_case). */
export const TIPO_ATO_LABEL: Record<string, string> = {
  contestacao: "Contestação",
  replica: "Réplica",
  manifestacao: "Manifestação",
  apelacao: "Apelação",
  contrarrazoes_apelacao: "Contrarrazões",
  agravo_instrumento: "Agravo de instrumento",
  embargos_declaracao: "Embargos de declaração",
  recurso_inominado: "Recurso inominado",
  cumprimento_sentenca: "Cumprimento de sentença",
  embargos_execucao: "Embargos à execução",
  generico: "Ato processual",
  ciencia: "Ciência",
  sem_ato: "Sem ato",
  indeterminado: "A classificar",
};

/**
 * Rótulo do tipo de ato para o CHIP do card/detalhe. Retorna "" quando o tipo não deve
 * virar chip próprio porque o chip de ESTADO já comunica o caso (indeterminado → "A
 * classificar"; ciencia/sem_ato → "Sem prazo"): nesses o tipo seria redundante. Só os atos
 * COM prazo (o "o que fazer") ganham chip de tipo.
 */
export function tipoAtoChipLabel(tipoAto: string): string {
  if (!tipoAto || tipoAto === "indeterminado" || tipoAto === "ciencia" || tipoAto === "sem_ato") {
    return "";
  }
  return TIPO_ATO_LABEL[tipoAto] ?? "";
}
