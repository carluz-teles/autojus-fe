// "O que aconteceu" numa intimação — fonte ÚNICA da regra, porque três telas a
// precisam (lista de Intimações, cards do cockpit do processo e a Triagem) e cada
// uma a tinha resolvido de um jeito diferente (ou não a tinha).

/**
 * Limiar a partir do qual tratamos o teor como TRUNCADO pelo BE.
 * `content_preview` é a publicação cortada em ~500 chars; abaixo disso o texto
 * chegou inteiro e não deve perder a última palavra.
 */
const LIMIAR_TRUNCADO = 400;

/**
 * Apara a palavra partida de um teor truncado pelo BE.
 *
 * O corte em ~500 chars cai no meio da palavra e a UI exibia o caco
 * ("…PAULO SERGIO DE OLIVEI"). Texto curto (inteiro) volta intacto; texto que já
 * termina em pontuação de fim de frase também — ali o corte não partiu nada.
 */
export function apararTeorTruncado(teor: string): string {
  const texto = teor?.trimEnd() ?? "";
  if (texto.length < LIMIAR_TRUNCADO) return texto;
  if (/[.!?…]$/.test(texto)) return texto;
  const ultimoEspaco = texto.lastIndexOf(" ");
  if (ultimoEspaco <= 0) return texto;
  return `${texto.slice(0, ultimoEspaco).trimEnd()}…`;
}

/**
 * Texto de "o que aconteceu" para um card/linha de intimação.
 *
 * `brief_summary` (o resumo de 1 linha que o brief produz) é o que o advogado
 * precisa ler; o teor cru é só o fallback de quem ainda não tem brief — e nesse
 * caso vai aparado, nunca partido no meio da palavra.
 */
export function resumoOuTeor(
  briefSummary: string | undefined,
  contentPreview: string | undefined,
): string {
  return briefSummary?.trim() || apararTeorTruncado(contentPreview ?? "");
}
