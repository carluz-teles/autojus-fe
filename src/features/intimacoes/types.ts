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

/** Ciclo de vida (bruto, do BE) de uma providência. Na prática, quem dirige a UI
 *  pós-migração pra action_item é `task_id` (tarefa nasceu ou não) + `tipo_status`
 *  (confiavel|a_confirmar) — ver `IntimacaoProvidencia` abaixo. */
export type IntimacaoProvidenciaStatus =
  "SUGGESTED" | "CONFIRMED" | "DISCARDED";

/** Tipo de ato/providência — closed set espelhado do BE (internal/deadline). */
export type ProvidenciaTipo =
  "contestar" | "recorrer" | "manifestar" | "cumprir" | "ciencia";

/** Proveniência da classificação: declarada no teor, inferida pela IA, ou
 *  corrigida manualmente (reclassificar muda pra "manual"). */
export type ProvidenciaTipoOrigem = "declarado" | "ia" | "manual";

/** "confiavel" nasce com tarefa automática (sem revisão); "a_confirmar" espera
 *  o usuário clicar Confirmar antes de qualquer tarefa nascer. */
export type ProvidenciaTipoStatus = "confiavel" | "a_confirmar";

/**
 * Uma providência PERSISTIDA (action_item) — GET /v1/intimacoes/:id e os 3
 * endpoints de ação (confirmar/descartar/reclassificar) devolvem este shape.
 * Não tem mais `title`/`description`/`suggested_assignee_*`/`due_date` (eram só
 * do fluxo antigo, jsonb `ai_providencias`); a UI deriva o rótulo de `tipo`.
 * Espelha o IntimacaoProvidenciaView do BE.
 */
export interface IntimacaoProvidencia {
  id: string;
  tipo: ProvidenciaTipo;
  /** true = essa providência dá origem a uma peça (ver `piece_profile_key`). */
  gera_peca: boolean;
  /** Perfil de peça (catálogo GET /v1/piece-profiles); null quando gera_peca=false. */
  piece_profile_key: string | null;
  tipo_origem: ProvidenciaTipoOrigem;
  tipo_status: ProvidenciaTipoStatus;
  /** Confiança da IA (0-1); só preenchido quando tipo_origem="ia". */
  confianca: number | null;
  status: IntimacaoProvidenciaStatus;
  /** Id da tarefa REAL — o BE a cria sozinho (declarada) ou após confirmar (IA),
   *  sempre de forma assíncrona (worker); null até ela nascer. */
  task_id: string | null;
  deadline_id: string | null;
}

/**
 * Candidato EFÊMERO devolvido por POST /v1/intimacoes/:id/analise — ainda não é
 * a linha persistida (sem id/status/task_id: a materialização em action_item
 * acontece depois, de forma assíncrona, via evento). Espelha o
 * AnaliseProvidenciaView do BE. `declarado` é o `tipo_origem === "declarado"`
 * já resolvido em bool pra facilitar a UI de prévia (se algum dia precisar).
 */
export interface IntimacaoAnaliseCandidate {
  title: string;
  description: string;
  suggested_assignee_user_id: string | null;
  suggested_assignee_name: string | null;
  due_date: string | null;
  tipo: ProvidenciaTipo;
  gera_peca: boolean;
  piece_profile_key: string | null;
  declarado: boolean;
  confianca: number | null;
}

/**
 * Resposta de POST /v1/intimacoes/:id/analise — a análise IA recém-gerada.
 * Espelha o IntimacaoAnaliseView do BE. summary vazio (com analyzed_at preenchido) = modo
 * degradado (IA indisponível). `providencias` são candidatos EFÊMEROS (ver
 * `IntimacaoAnaliseCandidate`) — NÃO confundir com `ai_providencias` do detalhe
 * (que é a view persistida, materializada assincronamente após esta resposta).
 */
export interface IntimacaoAnalise {
  summary: string;
  providencias: IntimacaoAnaliseCandidate[];
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
  /** Data de distribuição/ajuizamento (court_record.filed_at) — "YYYY-MM-DD".
   *  Vazio quando o processo ainda não foi enriquecido pelo DATAJUD (DJEN não
   *  carrega). A UI só renderiza a linha "Distribuição" quando não-vazio. */
  distribution_date?: string;
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
  /** Providências PERSISTIDAS (action_item) — sempre array (nunca null); vazio
   *  antes da análise ou enquanto a materialização assíncrona não rodou ainda
   *  (ver heurística de poll em useIntimacaoDetalhe). */
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
 * ativo. Os sete buckets são disjuntos e excluem intimações resolvidas/ignoradas. O FE
 * renderiza seis como tabs (atraso|hoje|proximos_dois_dias|semana|este_mes|
 * sem_data_definida); mais_adiante é calculado mas não vira tab neste redesign. O chip
 * "Não confirmadas" (nao_confirmado) é um filtro de lista à parte e NÃO aparece aqui.
 * Espelha o IntimacaoBucketsView do BE (internal/acquisition/read.go).
 */
export interface IntimacoesBuckets {
  /** days_left < 0 + status PENDING|OPEN + user_status != RESOLVED|IGNORED */
  atraso: number;
  /** days_left = 0 + status PENDING|OPEN + user_status != RESOLVED|IGNORED */
  hoje: number;
  /** vence em 1-2 dias + status PENDING|OPEN + user_status != RESOLVED|IGNORED */
  proximos_dois_dias: number;
  /** vence em 3-7 dias + status PENDING|OPEN (?urgencia=semana no BE) + user_status != RESOLVED|IGNORED */
  esta_semana: number;
  /** prazo no mês corrente (>7 dias e <= último dia do mês) + status PENDING|OPEN + user_status != RESOLVED|IGNORED */
  este_mes: number;
  /** prazo além do mês corrente (> último dia do mês) + status PENDING|OPEN + user_status != RESOLVED|IGNORED — não exibido como tab */
  mais_adiante: number;
  /** sem prazo derivado (deadline IS NULL) + user_status != RESOLVED|IGNORED */
  sem_data_definida: number;
}

/**
 * Envelope da lista de intimações — estende o PageEnvelope padrão com os buckets
 * de contagem por urgência (retornados pelo BE junto à página).
 */
export interface IntimacaoBucketsEnvelope extends PageEnvelope<IntimacaoView> {
  buckets: IntimacoesBuckets;
}
