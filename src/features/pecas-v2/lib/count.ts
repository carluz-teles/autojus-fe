// Contadores usados no rodapé do editor. Palavras = sequências não-vazias
// separadas por whitespace; caracteres = tamanho total (incluindo espaços,
// pra bater com a intuição do usuário lendo o texto).

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countChars(text: string): number {
  return text.length;
}

/** "Rascunho salvo há 1 min" / "há 2 h" / "agora mesmo" a partir de um
 *  timestamp ISO. Retorna null se o timestamp for inválido. */
export function relativeSaveLabel(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Rascunho salvo";
  const seconds = Math.max(0, Math.floor((now - t) / 1000));
  if (seconds < 5) return "Rascunho salvo agora mesmo";
  if (seconds < 60) return `Rascunho salvo há ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Rascunho salvo há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Rascunho salvo há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Rascunho salvo há ${days} d`;
}
