// Transporte das "instructions" (prompt opcional do GerarPecaModal) entre a
// disposição → /pecas/nova → /pecas/:id, via sessionStorage (evita 2000 chars na
// URL/history). Leitura NÃO apaga: o 202 apenas enfileira o worker e uma falha
// posterior ainda precisa do prompt. A limpeza acontece quando a peça fica
// pronta. ConstructionEntry re-chaveia a orientação pelo draftId antes de
// navegar; a tela da peça lê por draftId, mesmo após refresh.

const INSTRUCTIONS_SESSION_KEY = "peca:instructions:";

export function peekInstructions(key: string): string {
  if (!key || typeof sessionStorage === "undefined") return "";
  try {
    return sessionStorage.getItem(`${INSTRUCTIONS_SESSION_KEY}${key}`) ?? "";
  } catch {
    return "";
  }
}

export function setInstructions(key: string, value: string): void {
  if (!key || typeof sessionStorage === "undefined" || !value) return;
  try {
    sessionStorage.setItem(`${INSTRUCTIONS_SESSION_KEY}${key}`, value);
  } catch {
    // no-op
  }
}

export function clearInstructions(key: string): void {
  if (!key || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(`${INSTRUCTIONS_SESSION_KEY}${key}`);
  } catch {
    // no-op
  }
}
