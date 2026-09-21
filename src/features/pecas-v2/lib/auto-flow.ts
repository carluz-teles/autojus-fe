// Decisão pura do fluxo AUTO na tela de construção (construction-page).
//
// Contexto: no atalho "Gerar peça", a sequência conferência→generate roda em
// construction-entry ANTES de navegar para /pecas/:id?auto=1. Quando a tela de
// construção monta, o rascunho está em UM de dois estados:
//   • EXTRACTING  → geração começou (SUCESSO) → o caminho normal "gerando"
//                   renderiza o loader/stream de 4 fases.
//   • CREATED     → a sequência AUTO FALHOU (timeout do poll ~2min, conferência
//                   failed/superseded, ou erro de request/validate/generate) e
//                   nenhuma geração está em curso.
//
// A regra: só forçar o loader (pulando o pregen) enquanto a geração está de fato
// em andamento — a mutação rodando OU o saga já em EXTRACTING. Um rascunho ainda
// CREATED, sem conteúdo e sem geração em curso, é o caso de FALHA: NÃO forçar o
// loader (que ficaria preso pra sempre, sem stream que o avance). Em vez disso o
// chamador cai no PreparationCanvas (pregen), cujo "Gerar minuta" manual re-roda
// o ciclo (gerarMinuta), reusando as instructions preservadas no sessionStorage.

/** true = renderizar o loader de geração para um rascunho auto ainda em pregen.
 *  Só quando a geração está genuinamente em curso (mutação pendente ou saga
 *  EXTRACTING). Falso no caso de falha (CREATED, sem conteúdo, sem geração) —
 *  aí o chamador deve cair no pregen (recuperável). */
export function shouldForceAutoLoader(params: {
  /** Estágio derivado (deriveStage). O loader forçado só interessa em "pregen". */
  stage: string;
  /** searchParams auto === "1". */
  isAutoFlow: boolean;
  /** O rascunho já tem conteúdo? (Se sim, não é fresh.) */
  hasContent: boolean;
  /** A mutação de geração está pendente? */
  isGenerating: boolean;
  /** saga_state do rascunho. */
  sagaState: string;
}): boolean {
  if (params.stage !== "pregen" || !params.isAutoFlow || params.hasContent) {
    return false;
  }
  // Só força o loader se a geração está realmente em curso.
  return params.isGenerating || params.sagaState === "EXTRACTING";
}
