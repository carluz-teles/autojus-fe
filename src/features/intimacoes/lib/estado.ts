import type { IntimacaoView } from "../types";

// ESTADO (desfecho) da intimação — a FONTE ÚNICA do chip de estado, na lista E no detalhe.
// A intimação é a unidade de trabalho; seu estado combina três sinais do read model:
//   • user_status  — PENDING | RESOLVED | IGNORED (a decisão de triagem)
//   • resolution   — CIENCIA | PROTOCOLADA | "" (COMO foi concluída, quando RESOLVED)
//   • work_stage   — RECEIVED…DRAFTING…PARTNER_REVIEW…FILED (a posição da peça)
//
// Uma intimação está CONCLUÍDA por um de dois desfechos — Ciência (deu-se ciência) ou
// Protocolada (a peça gerada dela foi protocolada) — ou está aberta (pendente / peça em
// andamento) ou foi ignorada. Precedência: o desfecho mais avançado vence.
export type IntimacaoEstadoTone =
  "pending" | "progress" | "done" | "muted" | "expired";

export interface IntimacaoEstado {
  label: string;
  tone: IntimacaoEstadoTone;
  cor: string;
  fundo: string;
  /** true quando a intimação tem desfecho (concluída ou ignorada) — nada a fazer. */
  encerrada: boolean;
}

const TOKEN: Record<IntimacaoEstadoTone, string> = {
  pending: "var(--gold)",
  progress: "var(--blue)",
  done: "var(--green)",
  muted: "var(--fg3)",
  expired: "var(--destructive)",
};

function make(
  label: string,
  tone: IntimacaoEstadoTone,
  encerrada: boolean,
): IntimacaoEstado {
  const cor = TOKEN[tone];
  return {
    label,
    tone,
    cor,
    fundo: `color-mix(in oklch, ${cor} 12%, transparent)`,
    encerrada,
  };
}

export function estadoIntimacao(i: {
  user_status: IntimacaoView["user_status"];
  resolution: IntimacaoView["resolution"];
  work_stage: IntimacaoView["work_stage"];
}): IntimacaoEstado {
  // Protocolada é o desfecho mais avançado e vence tudo: a peça no tribunal encerra a
  // intimação. work_stage=FILED cobre o caso em que o BE ainda não marcou resolution
  // (o consumidor de petition.filed é assíncrono) — a UI já reflete o fato.
  if (i.work_stage === "FILED" || i.resolution === "PROTOCOLADA")
    return make("Concluída · Protocolada", "done", true);
  if (i.user_status === "RESOLVED")
    return make("Concluída · Ciência", "done", true);
  if (i.user_status === "IGNORED") return make("Ignorada", "muted", true);
  // Prazo venceu sem tratamento e sem peça (BE: work_stage=VENCIDA) — desfecho encerrado,
  // mas NUNCA um sucesso: tom próprio (expired/destructive), nunca "done" (verde).
  if (i.work_stage === "VENCIDA") return make("Prazo vencido", "expired", true);
  // Aberta com trabalho andando — a peça foi gerada e está sendo produzida/revisada.
  if (i.work_stage === "PARTNER_REVIEW")
    return make("Em revisão", "progress", false);
  if (i.work_stage === "DRAFTING")
    return make("Peça em elaboração", "progress", false);
  return make("Pendente", "pending", false);
}
