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
 * Rótulo pt-BR do tipo de ato para exibição SEMPRE presente (título de card de prazo,
 * item de derivação, opção de picker): mapa conhecido, senão o fallback genérico "Prazo".
 * Diferente de tipoAtoChipLabel (que devolve "" para tipos que não viram chip próprio).
 */
export function tipoAtoLabel(tipoAto: string): string {
  if (!tipoAto) return "Prazo";
  return TIPO_ATO_LABEL[tipoAto] ?? "Prazo";
}
