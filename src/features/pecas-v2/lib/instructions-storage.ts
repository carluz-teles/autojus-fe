// Transporte das "instructions" (prompt opcional do GerarPecaModal) entre a
// disposição → /pecas/nova → /pecas/:id, via sessionStorage (evita 2000 chars na
// URL/history). BLOCKER-3: leitura NÃO apaga — sobrevive a retry; a limpeza só
// acontece após o generate 202. Navegar-primeiro: a ConstructionEntry re-chaveia
// o prompt sob o draftId antes de navegar, e a tela da peça (use-construction)
// lê por draftId — sem precisar carregar o actionItemId na URL.

export const INSTRUCTIONS_SESSION_KEY = "peca:instructions:";

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
