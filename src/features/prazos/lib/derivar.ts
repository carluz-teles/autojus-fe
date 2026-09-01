// Lógica pura da experiência Prazos (Inbox + Pipeline), portada do Claude Design.
// Sem JSX e sem React: só deriva rótulos/cores/regras a partir do PrazoMock. Os
// ícones (prioridade/status/origem) vivem em components/icons.tsx. As cores são
// strings de CSS var (tokens da casca nova) usadas em inline styles, fiéis ao
// mockup. Onde o mockup usava var(--accent) como COR DE MARCA, aqui é var(--primary).

import type { PrazoMock, PrazoOrigem, PrazoStage } from "../mocks/prazos.mock";

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

export interface OrigemInfo {
  label: string;
  cor: string;
  fundo: string;
}

const ORIGEM: Record<PrazoOrigem, OrigemInfo> = {
  declarado: {
    label: "Declarado",
    cor: "var(--green)",
    fundo: "color-mix(in oklch, var(--green) 10%, transparent)",
  },
  calculado: {
    label: "Calculado",
    cor: "var(--blue)",
    fundo: "color-mix(in oklch, var(--blue) 10%, transparent)",
  },
  validado: {
    label: "Validado",
    cor: "var(--green)",
    fundo: "color-mix(in oklch, var(--green) 12%, transparent)",
  },
  semprazo: {
    label: "Sem prazo",
    cor: "var(--fg3)",
    fundo: "color-mix(in oklch, var(--fg3) 12%, transparent)",
  },
  divergente: {
    label: "Divergente",
    cor: "var(--gold)",
    fundo: "color-mix(in oklch, var(--gold) 14%, transparent)",
  },
  ia: {
    label: "IA",
    cor: "var(--primary)",
    fundo: "color-mix(in oklch, var(--primary) 11%, transparent)",
  },
};

export function origem(o: PrazoOrigem): OrigemInfo {
  return ORIGEM[o] ?? ORIGEM.calculado;
}

export function prazoCurto(dias: number): string {
  if (dias < 0) return Math.abs(dias) + "d atraso";
  if (dias === 0) return "hoje";
  return dias + "d";
}

export function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function cnjCurto(cnj: string): string {
  return cnj.slice(0, 11) + ".";
}

const STAGE_LABELS: Record<PrazoStage, string> = {
  intimacao: "Intimação recebida",
  confirmar: "A confirmar",
  confirmado: "Confirmado",
  elaboracao: "Em elaboração",
  revisao: "Revisão do sócio",
  protocolado: "Protocolado",
};

export function stageLabel(k: PrazoStage): string {
  return STAGE_LABELS[k];
}

// Ordem canônica do pipeline — base da governança de movimento no Board.
export const ORDEM: readonly PrazoStage[] = [
  "intimacao",
  "confirmar",
  "confirmado",
  "elaboracao",
  "revisao",
  "protocolado",
];

// PrazoMock + campos derivados prontos pra bindar na UI (cores, rótulos, iniciais).
export interface PrazoDec extends PrazoMock {
  urgCor: string;
  urgFundo: string;
  urgLabel: string;
  urgK: UrgKey;
  origemLabel: string;
  origemCor: string;
  origemFundo: string;
  cnjCurto: string;
  respIniciais: string;
  prazoCurto: string;
  faltamNum: number;
  faltamFrase: string;
}

export function dec(p: PrazoMock): PrazoDec {
  const u = urg(p.dias);
  const o = origem(p.origem);
  return {
    ...p,
    urgCor: u.cor,
    urgFundo: u.fundo,
    urgLabel: u.label,
    urgK: u.k,
    origemLabel: o.label,
    origemCor: o.cor,
    origemFundo: o.fundo,
    cnjCurto: cnjCurto(p.cnj),
    respIniciais: iniciais(p.resp),
    prazoCurto: prazoCurto(p.dias),
    faltamNum: Math.abs(p.dias),
    faltamFrase:
      p.dias < 0
        ? "dias úteis em atraso"
        : p.dias === 0
          ? "vence hoje (interno)"
          : "dias úteis até o interno",
  };
}

// ── Governança do Board (port de _canMove) ────────────────────────────────────
export interface MoveVerdict {
  ok: boolean;
  silent?: boolean;
  msg?: string;
  reason?: string;
  /** Id do item cuja divergência/IA precisa ser resolvida antes de avançar. */
  resolve?: string;
}

// Regras: não pula etapas; volta atrás reabre; confirmar exige resolver
// divergência/IA; só sócio protocola (o usuário atual é sócia → sempre pode).
export function canMove(
  item: PrazoMock | undefined,
  to: PrazoStage,
  ehSocio = true,
): MoveVerdict {
  if (!item) return { ok: false, silent: true };
  const fi = ORDEM.indexOf(item.stage);
  const ti = ORDEM.indexOf(to);
  if (ti === fi) return { ok: false, silent: true };
  if (ti < fi)
    return { ok: true, msg: `Reaberto — voltou para "${stageLabel(to)}"` };
  if (ti > fi + 1)
    return {
      ok: false,
      reason: "Não pode pular etapas. Avance uma de cada vez.",
    };
  if (item.stage === "confirmar" && to === "confirmado") {
    if (item.origem === "divergente")
      return {
        ok: false,
        reason: "Resolva a divergência antes de confirmar.",
        resolve: item.id,
      };
    if (item.origem === "ia")
      return {
        ok: false,
        reason: "Confirme o tipo inferido por IA antes de confirmar.",
        resolve: item.id,
      };
    return { ok: true, msg: "Prazo confirmado" };
  }
  if (to === "protocolado" && !ehSocio)
    return { ok: false, reason: "Só um sócio pode protocolar." };
  return { ok: true, msg: `Movido para "${stageLabel(to)}"` };
}

// ── Faixas de lote da Inbox (bucket por origem) ───────────────────────────────
export interface LaneDef {
  key: string;
  label: string;
  cor: string;
  /** Rótulo do botão de ação em lote. */
  bulkLabel: string;
  test: (p: PrazoMock) => boolean;
}

// Agrupa a triagem por natureza do que precisa de decisão. A ordem reflete
// prioridade de atenção: divergência → IA → declarados/calculados → sem prazo.
export const LANES: readonly LaneDef[] = [
  {
    key: "divergencia",
    label: "Divergências — decidir a fonte",
    cor: "var(--gold)",
    bulkLabel: "Revisar uma a uma",
    test: (p) => p.origem === "divergente",
  },
  {
    key: "ia",
    label: "Inferidos por IA — confirmar o tipo",
    cor: "var(--primary)",
    bulkLabel: "Revisar uma a uma",
    test: (p) => p.origem === "ia",
  },
  {
    key: "prontos",
    label: "Declarados e calculados — prontos p/ aprovar",
    cor: "var(--green)",
    bulkLabel: "Aprovar em lote",
    test: (p) =>
      p.origem === "declarado" ||
      p.origem === "calculado" ||
      p.origem === "validado",
  },
  {
    key: "semprazo",
    label: "Sem prazo — dar ciência",
    cor: "var(--fg3)",
    bulkLabel: "Dar ciência em lote",
    test: (p) => p.origem === "semprazo",
  },
];
