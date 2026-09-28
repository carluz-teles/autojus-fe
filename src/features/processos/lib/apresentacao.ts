import { tipoAtoLabel } from "@/features/intimacoes/lib/tipo-ato";
import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";
import { formatDate } from "@/lib/format";

import type {
  ClaimValueSource,
  ClientRole,
  ProcessoDegree,
  ProcessoPhase,
  ProcessoSubject,
  ProcessoView,
} from "../types";
export const DEGREE_LABEL: Record<ProcessoDegree, string> = {
  G1: "1º grau",
  G2: "2º grau",
  JE: "Juizado",
  SUPERIOR: "Superior",
  UNKNOWN: "—",
};

/** Rótulo pt-BR de `client_role` (court_case.client_role — migration 0180) — de
 *  que lado o escritório está na causa. Só os 3 valores DETERMINADOS têm
 *  rótulo — "UNKNOWN" (ainda não identificado) nunca chega aqui: o único
 *  consumidor (processo-hub.tsx) desvia pra "Não informado" antes de indexar
 *  o mapa (mesmo padrão de "ausente" que o resto do card usa), então uma
 *  entrada UNKNOWN aqui seria morta/duplicada com o mesmo significado. */
export const CLIENT_ROLE_LABEL: Record<
  Exclude<ClientRole, "UNKNOWN">,
  string
> = {
  PLAINTIFF: "Autor(a)",
  DEFENDANT: "Réu(é)",
  BOTH: "Autor(a) e réu(é)",
};

/** Rótulo pt-BR de `claim_value_source` (court_record.claim_value_source —
 *  migration 0180, CHECK ('capa','manual')). */
export const CLAIM_VALUE_SOURCE_LABEL: Record<ClaimValueSource, string> = {
  capa: "Capa do processo",
  manual: "Informado manualmente",
};

export function grauProcessoLabel(degree: string): string {
  const label = DEGREE_LABEL[degree as ProcessoDegree];
  return label && label !== "—" ? label : "Grau não informado";
}

// As 5 fases do stepper, em ordem, com rótulo pt-BR — fonte única do stepper e do label.
export const FASE_STEPS: { key: ProcessoPhase; label: string }[] = [
  { key: "CONHECIMENTO", label: "Início" },
  { key: "INSTRUCAO", label: "Instrução" },
  { key: "SENTENCA", label: "Sentença" },
  { key: "RECURSO", label: "Recurso" },
  { key: "EXECUCAO", label: "Cumprimento/Execução" },
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
    tribunal: [p.court, grauProcessoLabel(p.degree)]
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

/** Os assuntos do processo prontos para a Ficha, em UMA decisão só (o JSX não
 *  reimplementa a cadeia de fallback):
 *   - `subjects` (jsonb completo, migration 0180) → lista de CHIPS, um por
 *     assunto, porque são itens discretos de um conjunto;
 *   - sem `subjects` → `subject`, a coluna legada de string única (processo
 *     ainda sem enriquecimento), como TEXTO;
 *   - nenhum dos dois → ausência explícita.
 *  `label` acompanha a cardinalidade ("Assunto"/"Assuntos") — um processo com
 *  seis assuntos sob o rótulo singular lê como se fosse um só. */
export function assuntosDoProcesso(p: {
  subject: string;
  subjects: ProcessoSubject[] | null;
}): { label: string; chips: ProcessoSubject[]; texto: string } {
  const chips = p.subjects ?? [];
  if (chips.length > 0) {
    return {
      label: chips.length > 1 ? "Assuntos" : "Assunto",
      chips,
      texto: "",
    };
  }
  return { label: "Assunto", chips: [], texto: p.subject || "Não informado" };
}
