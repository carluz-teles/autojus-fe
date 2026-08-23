// Espelha o read model do BE: GET /v1/intimacoes → { data: IntimacaoView[], page }.
// Publicações capturadas do DJEN pelas OABs monitoradas (intimation → read model).

import type { PageEnvelope } from "@/lib/api/types";

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";

export type IntimacaoDegree = "UNKNOWN" | "G1" | "G2" | "JE" | "SUPERIOR";
export type IntimacaoType = "INTIMACAO" | "CITACAO" | "COMUNICACAO";
export type IntimacaoStatus = "ACTIVE" | "CANCELLED";
/** Situação de triagem do usuário sobre a intimação (inbox). */
export type IntimacaoUserStatus = "PENDING" | "RESOLVED" | "IGNORED";

/**
 * Prazo derivado embutido na IntimacaoView — o "prazo.days_left" é a fonte de
 * urgência (negativo=vencido, 0=hoje, positivo=futuro). `null` quando ainda não
 * derivado. Espelha o IntimacaoPrazoView do BE.
 */
export interface IntimacaoPrazoView {
  deadline_id: string;
  end_date: string;
  /** Dias restantes (negativo = vencido, 0 = hoje). Inteiro calculado no BE. */
  days_left: number;
  /** PENDING|OPEN|MET|MISSED|CANCELLED */
  status: string;
  /** false = derivado mas ainda não confirmado por um humano. */
  confirmed: boolean;
}

export interface IntimacaoView {
  id: string;
  cnj_number: string;
  /** Classe processual (court_record.class); "" quando não informada. */
  class: string;
  /** Assunto (court_record.subject); "" quando não informado. */
  subject: string;
  /** ID do court_record — deep-link ao processo (/processos/:court_record_id). */
  court_record_id: string;
  court: string;
  degree: IntimacaoDegree;
  type: IntimacaoType;
  status: IntimacaoStatus;
  /** Situação de triagem (Pendente/Resolvida/Ignorada) — dirige o StatusBadge. */
  user_status: IntimacaoUserStatus;
  source: string;
  source_url: string;
  made_available_at: string;
  published_at: string;
  deadline_start_at: string;
  content_preview: string;
  /** Prazo derivado desta intimação; null quando ainda não calculado. */
  prazo: IntimacaoPrazoView | null;
  /**
   * Timestamp ISO da última análise; null = "não analisada" (badge da lista/painel).
   * Espelha IntimacaoView.ai_analyzed_at do BE.
   */
  ai_analyzed_at: string | null;
  /** Id interno do responsável pela intimação (0057, ex-conductor/reviewer);
   *  null = não atribuído. Espelha o BE. */
  assignee_user_id: string | null;
  /** Nome do responsável (joined no BE); null = não atribuído. */
  assignee_user_name: string | null;
}

/**
 * Destinatário da intimação (item do jsonb `recipients`) — o advogado endereçado
 * mais o flag `matched` (a OAB é uma das monitoradas pelo escritório). Espelha o
 * djenRecipient do BE.
 */
export interface IntimacaoRecipient {
  name: string;
  oab_number: string;
  oab_uf: string;
  matched: boolean;
}

/**
 * Um evento derivado do histórico da intimação (Histórico card).
 * Derivado no BE a partir de campos já fetchados — sem tabela de auditoria nova.
 * Espelha o IntimacaoHistoryEntry do BE.
 */
export interface IntimacaoHistoryEntry {
  /** ISO timestamp do evento (timestamptz ou date→UTC do BE). */
  occurred_at: string;
  /** Rótulo humano, ex: "Capturada do DJEN", "Prazo confirmado por Luan". */
  label: string;
}

/** Ciclo de vida de uma providência sugerida pela IA. */
export type IntimacaoProvidenciaStatus = "SUGGESTED" | "APPROVED" | "DISCARDED";

/**
 * Uma providência derivada da análise IA (card "Analisar esta intimação"): título curto
 * imperativo (a IA já embute a citação legal, ex.: "Redigir defesa (art. 919, CPC)") +
 * descrição acionável + responsável e vencimento sugeridos pela IA (ambos podem vir null →
 * a UI mostra "—") + status. Só as SUGGESTED trazem os botões de ação na UI. Espelha o
 * IntimacaoProvidenciaView do BE.
 */
export interface IntimacaoProvidencia {
  title: string;
  description: string;
  /** Id INTERNO do responsável sugerido pela IA (app_user); null quando não sugerido. */
  suggested_assignee_user_id: string | null;
  /** Nome do responsável sugerido (resolvido no BE); null quando não sugerido. */
  suggested_assignee_name: string | null;
  /** Vencimento sugerido "YYYY-MM-DD"; null quando não sugerido. */
  due_date: string | null;
  status: IntimacaoProvidenciaStatus;
  /** Id da tarefa REAL criada ao aprovar (link da referência no card); null até aprovar. */
  task_id: string | null;
}

/**
 * Resposta de POST /v1/intimacoes/:id/analise — a análise IA recém-gerada.
 * Espelha o IntimacaoAnaliseView do BE. summary vazio (com analyzed_at preenchido) = modo
 * degradado (IA indisponível).
 */
export interface IntimacaoAnalise {
  summary: string;
  providencias: IntimacaoProvidencia[];
  /** ISO timestamp de quando a análise foi (re)gerada. */
  analyzed_at: string;
}

/**
 * Detalhe (deep-link) — GET /v1/intimacoes/:id. Embute a IntimacaoView da lista e
 * acrescenta os extras da tela de detalhe: o teor COMPLETO (não a prévia truncada),
 * o órgão julgador, a lista de destinatários, os responsáveis e o histórico derivado.
 * Espelha o IntimacaoDetailView do BE.
 */
export interface IntimacaoDetalheView extends IntimacaoView {
  /** Teor COMPLETO da publicação (não truncado como content_preview). */
  content: string;
  /** Órgão julgador (court_record.judging_body). */
  judging_body: string;
  /** Destinatários (jsonb) — sempre um array (nunca null); pode vir vazio. */
  recipients: IntimacaoRecipient[];
  /** Timeline derivada (ASC) — sempre array (nunca null); pode vir vazio.
   *  O responsável único (assignee_*) já vem do IntimacaoView embedado (0057). */
  history: IntimacaoHistoryEntry[];

  // ── Análise IA (card "Analisar esta intimação") ──
  /**
   * Resumo "O que aconteceu" (ai_summary, omitempty no BE). undefined/"" com
   * ai_analyzed_at preenchido = modo degradado (IA indisponível).
   */
  ai_summary?: string;
  /** Providências derivadas — sempre array (nunca null); vazio antes da análise. */
  ai_providencias: IntimacaoProvidencia[];
  /**
   * ISO timestamp da última análise IA; null = pré-análise (o card mostra o CTA);
   * preenchido = pós-análise (o card mostra resumo + providências).
   */
  ai_analyzed_at: string | null;
}

/**
 * Contadores agregados de intimações — GET /v1/intimacoes/summary. Objeto único
 * (sem envelope de cursor). Espelha o IntimacoesSummary do BE.
 */
export interface IntimacoesSummary {
  total: number;
  pendentes: number;
  resolvidas: number;
  ignoradas: number;
  /** Prazo vencido (days_left < 0). */
  em_atraso: number;
  /** Prazo vence hoje (days_left = 0). */
  vencem_hoje: number;
  /** Prazo derivado mas ainda não confirmado. */
  nao_confirmado: number;
}

/**
 * Contagens por bucket de urgência — incluídas no envelope da lista de intimações.
 * Respeitam os filtros ativos (type/user_status/court/search) mas ignoram `urgencia` E
 * `assignee` (limitação conhecida do BE — ver IntimacaoBucketsView), permitindo que os
 * headers de cada seção mostrem a contagem real mesmo quando um filtro de urgência está
 * ativo. Atraso/Hoje/ProximosDoisDias/EstaSemana/SemProvidencia são as cinco tabs que o
 * master-detail renderiza; MaisAdiante/NaoConfirmado ficam no objeto por compat mas não
 * viram tab. Espelha o IntimacaoBucketsView do BE (internal/acquisition/read.go).
 */
export interface IntimacoesBuckets {
  /** days_left < 0 + status PENDING|OPEN */
  atraso: number;
  /** days_left = 0 + status PENDING|OPEN */
  hoje: number;
  /** vence em 1-2 dias + status PENDING|OPEN */
  proximos_dois_dias: number;
  /** vence em 3-7 dias + status PENDING|OPEN (?urgencia=semana no BE) */
  esta_semana: number;
  /** ai_analyzed_at IS NULL e não resolvida/ignorada */
  sem_providencia: number;
  /** days_left > 7 + status PENDING|OPEN — não exibido como tab */
  mais_adiante: number;
  /** sugerido, ainda não confirmado — não exibido como tab */
  nao_confirmado: number;
}

/**
 * Envelope da lista de intimações — estende o PageEnvelope padrão com os buckets
 * de contagem por urgência (retornados pelo BE junto à página).
 */
export interface IntimacaoBucketsEnvelope extends PageEnvelope<IntimacaoView> {
  buckets: IntimacoesBuckets;
}
