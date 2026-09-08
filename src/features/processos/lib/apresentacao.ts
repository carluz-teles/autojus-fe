import { tipoAtoLabel } from "@/features/intimacoes/lib/tipo-ato";
import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";
import { formatDate } from "@/lib/format";

import type { ProcessoDegree, ProcessoPhase, ProcessoView } from "../types";
export const DEGREE_LABEL: Record<ProcessoDegree, string> = {
  G1: "1º grau",
  G2: "2º grau",
  JE: "Juizado",
  SUPERIOR: "Superior",
  UNKNOWN: "—",
};

// As 5 fases do stepper, em ordem, com rótulo pt-BR — fonte única do stepper e do label.
export const FASE_STEPS: { key: ProcessoPhase; label: string }[] = [
  { key: "CONHECIMENTO", label: "Conhecimento" },
  { key: "INSTRUCAO", label: "Instrução" },
  { key: "SENTENCA", label: "Sentença" },
  { key: "RECURSO", label: "Recurso" },
  { key: "EXECUCAO", label: "Execução" },
];

interface LifecycleInfo {
  label: string;
  cor: string;
}

// Situação do processo → rótulo PT-BR + cor de token. ACTIVE→verde, SUSPENDED→gold,
// ARCHIVED→fg3; demais estados caem no neutro.
export function lifecycleInfo(lifecycle: string): LifecycleInfo {
  switch (lifecycle) {
    case "ALL":
      return { label: "Todos", cor: "var(--fg2)" };
    case "UNKNOWN":
      return { label: "A verificar", cor: "var(--gold)" };
    case "ACTIVE":
      return { label: "Em andamento", cor: "var(--green)" };
    case "SUSPENDED":
      return { label: "Suspenso", cor: "var(--gold)" };
    case "SUPERSEDED":
      return { label: "Registro substituído", cor: "var(--fg3)" };
    case "ARCHIVED":
      return { label: "Arquivado", cor: "var(--fg3)" };
    default:
      return { label: lifecycle || "—", cor: "var(--fg2)" };
  }
}

export function retornoProcessos(value: string | null) {
  return value?.split("?")[0] === "/processos" ? value : "/processos";
}
export function situacaoProcesso(p: ProcessoView) {
  const evidence = p.lifecycle_evidence;
  const unknown = p.lifecycle === "UNKNOWN" || !evidence;
  const label = lifecycleInfo(unknown ? "UNKNOWN" : p.lifecycle).label;
  return {
    label,
    variant:
      unknown || p.lifecycle === "SUSPENDED"
        ? ("warning" as const)
        : p.lifecycle === "ACTIVE"
          ? ("success" as const)
          : ("secondary" as const),
    resumo: unknown ? "Situação não confirmada" : "Situação inferida",
    motivo:
      evidence?.reason ||
      "Aguardando dados para identificar a situação do processo.",
    fonte: evidence?.source || "Fonte ainda não disponível",
    movimento: evidence?.movement_text || null,
    dataMovimento: evidence?.movement_at
      ? formatDate(evidence.movement_at)
      : null,
    consulta: evidence?.observed_at
      ? formatDate(evidence.observed_at)
      : "Ainda não consultado",
  };
}

export function linhaProcesso(p: ProcessoView) {
  const deadline = p.next_deadline;
  const cnjSuffix = ` · ${p.cnj_number}`;
  const title =
    !p.label && p.title.endsWith(cnjSuffix)
      ? p.title.slice(0, -cnjSuffix.length)
      : p.title;
  const days = deadline?.days_left ?? 0;
  const situacao = lifecycleInfo(p.lifecycle);
  return {
    id: p.id,
    cnj: formatarCNJ(p.cnj_number),
    title: title.replace(/\s*·\s*$/, "") || "Processo sem título",
    partes: [p.autor && `Autor: ${p.autor}`, p.reu && `Réu: ${p.reu}`]
      .filter(Boolean)
      .join(" · "),
    tribunal: [
      p.court,
      DEGREE_LABEL[p.degree] === "—"
        ? "Grau não informado"
        : DEGREE_LABEL[p.degree],
    ]
      .filter(Boolean)
      .join(" · "),
    orgao: p.judging_body || "Órgão não informado",
    classeAssunto: [p.class, p.subject].filter(Boolean).join(" · "),
    fase: FASE_STEPS.find((s) => s.key === p.phase)?.label,
    situacao: situacao.label,
    situacaoDetalhe: situacaoProcesso(p),
    situacaoVariant:
      p.lifecycle === "ACTIVE"
        ? ("success" as const)
        : p.lifecycle === "SUSPENDED"
          ? ("warning" as const)
          : ("secondary" as const),
    responsavelId: p.assigned_user_id,
    responsavel:
      p.assigned_user_name?.trim() ||
      (p.assigned_user_id ? "Responsável atribuído" : "Sem responsável"),
    movimento: p.last_movement_text || "Movimentação não informada",
    movimentoData: formatDate(p.last_movement_at, "Data não informada"),
    prazo: deadline
      ? {
          data: formatDate(deadline.end_date),
          ato: tipoAtoLabel(deadline.tipo_ato),
          resumo:
            days < 0
              ? `${-days} dias corridos em atraso`
              : days === 0
                ? "Vence hoje"
                : `${days} dias corridos restantes`,
          variant:
            days <= 0
              ? ("destructive" as const)
              : days <= 2
                ? ("warning" as const)
                : ("success" as const),
        }
      : null,
  };
}
