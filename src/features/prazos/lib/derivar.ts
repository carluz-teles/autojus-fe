// Lógica pura da experiência Prazos (Inbox + Pipeline), portada do Claude Design.
// Sem JSX e sem React: só deriva rótulos/cores/regras a partir do PrazoMock. Os
// ícones (prioridade/status/origem) vivem em components/icons.tsx. As cores são
// strings de CSS var (tokens da casca nova) usadas em inline styles, fiéis ao
// mockup. Onde o mockup usava var(--accent) como COR DE MARCA, aqui é var(--primary).

export type UrgKey = "critico" | "atencao" | "tranquilo";

export interface Urg {
  k: UrgKey;
  label: string;
  cor: string;
  fundo: string;
}

// dias ≤ 0 → urgente (vermelho); ≤ 3 → alta (gold); senão no prazo (verde).
export function urg(dias: number): Urg {
  if (dias <= 0)
    return {
      k: "critico",
      label: "Urgente",
      cor: "var(--red)",
      fundo: "color-mix(in oklch, var(--red) 10%, transparent)",
    };
  if (dias <= 3)
    return {
      k: "atencao",
      label: "Alta",
      cor: "var(--gold)",
      fundo: "color-mix(in oklch, var(--gold) 13%, transparent)",
    };
  return {
    k: "tranquilo",
    label: "No prazo",
    cor: "var(--green)",
    fundo: "color-mix(in oklch, var(--green) 10%, transparent)",
  };
}

export function cnjCurto(cnj: string): string {
  return cnj.slice(0, 11) + ".";
}
