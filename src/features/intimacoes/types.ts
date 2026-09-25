// Espelha o read model do BE: GET /v1/intimacoes → { data: IntimacaoView[], page }.
// Publicações capturadas do DJEN pelas OABs monitoradas (intimation → read model).

import type {
  ActionItemTipo,
  ActionItemTipoStatus,
  AnalysisSources,
  ProvidenciaFulfillment,
} from "@/features/action-items/types";
import type { PageEnvelope } from "@/lib/api/types";

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";

type IntimacaoDegree = "UNKNOWN" | "G1" | "G2" | "JE" | "SUPERIOR";
export type IntimacaoType = "INTIMACAO" | "CITACAO" | "COMUNICACAO";
type IntimacaoStatus = "ACTIVE" | "CANCELLED";
/** Situação de triagem do usuário sobre a intimação (inbox). */
export type IntimacaoUserStatus = "PENDING" | "RESOLVED" | "IGNORED";

/** Sub-desfecho de uma intimação RESOLVED; "" quando PENDING/IGNORED (sem desfecho). */
export type IntimacaoResolution = "CIENCIA" | "PROTOCOLADA" | "";

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
  /** PENDING|OPEN|MET|MISSED|CANCELLED|NO_DEADLINE (o read model usa NO_DEADLINE p/ mera
   *  ciência / sem prazo — ver pipeline.ts, que ramifica nele). */
  status: string;
  /** false = derivado mas ainda não confirmado por um humano. */
  confirmed: boolean;
  /**
   * De onde veio a data do prazo — closed set do BE
   * (declarado|validado|calculado|divergente|ia|manual|a_classificar|sem_prazo).
   * Alimenta a aba de origem da Triagem e o chip "Origem" do item. "" quando ausente.
   */
  origem: string;
  /**
   * Selo de confiança — dimensão ortogonal ao relógio: "confiavel" já pode
   * seguir, "a_apurar" espera apuração humana. "" quando ausente.
   */
  selo: string;
  /**
   * Tipo de ato jurídico que a intimação exige (deadline.tipo_ato do BE) — o "o
   * que fazer": apelacao|contestacao|manifestacao|cumprimento_sentenca|ciencia|
   * indeterminado|… "" quando não derivado. Rotulado via TIPO_ATO_LABEL.
   */
  tipo_ato: string;
  /**
   * Data INTERNA do prazo (deadline.prazo_interno do BE) — o fatal menos o buffer
   * de segurança. O dual date que a Triagem mostra ("interno: DD/MM") ao lado do
   * `end_date` (o fatal). null quando o motor ainda não materializou o piso interno.
   */
  prazo_interno: string | null;
}

/**
 * Categoria coarse determinística do document_type (pipeline U0 — categoria.go do
 * BE). Segmenta a Triagem ("Pra trabalhar" × "Ciências") de graça; o FE mapeia o
 * rótulo pt-BR (CATEGORIA_COARSE_LABEL). Closed set espelhado do BE.
 */
export type IntimacaoCategoriaCoarse =
  "recurso" | "manifestacao" | "ciencia" | "despacho" | "intimacao" | "outros";

/** Sinal A do motor v3 (deadline.acionabilidade) — o "o que a intimação exige".
 *  "" quando o motor ainda não populou. */
export type IntimacaoAcionabilidade = "ato" | "ciencia" | "a_classificar" | "";

/** Lane de ciclo de vida derivada no BE (aba de topo da Triagem-pipeline). */
export type IntimacaoLifecycle = "a_triar" | "em_andamento" | "concluido";

/** Disposição — a PARTIÇÃO DISJUNTA da intimação (docs/erd-intimacao-triagem.md §4,
 *  docs/navigation-architecture.md §4), derivada no BE (deriveDisposicao). É TRANSVERSAL
 *  a qualquer `lifecycle`/status (a_triar/em_andamento/concluido) — não mais restrita a
 *  "A triar": dirige as abas Todas/Trabalho/Ciência/Exceções sob QUALQUER status ativo.
 *  Cada intimação cai em EXATAMENTE UM bucket: exceção é seu próprio segmento (disjunto
 *  de trabalho), então "Pra trabalhar" não mistura mais exceção/ciência. Substitui o
 *  antigo eixo acionabilidade-segment. */
export type IntimacaoDisposicao =
  "analisando" | "trabalho" | "excecao" | "ciencia" | "sem_prazo";

/** Motivo (de maior peso) de a intimação ser exceção; "" quando não é exceção.
 *  `divergente` = divergência de PRAZO (publicação × cálculo); `trabalho_divergente` =
 *  divergência de OBRIGAÇÃO (a classificação da intimação × o trabalho identificado —
 *  docs/navigation-architecture.md §2, conflito prazo×obrigação); `trabalho_nao_identificado`
 *  = AUSÊNCIA (não conflito): a análise atual já materializou mas não produziu obrigação
 *  nem ciência elegível — teor residuou (obrigacao-first-architecture.md §E). Três motivos
 *  distintos, não confundir; espelha `ExcecaoMotivoTrabalhoNaoIdentificado` (BE read.go). */
export type IntimacaoExcecaoMotivo =
  | "provisorio"
  | "ia_inferido"
  | "tipo_pendente"
  | "prazo_pendente"
  | "divergente"
  | "trabalho_divergente"
  | "trabalho_nao_identificado"
  | "";

export interface IntimacaoView {
  id: string;
  cnj_number: string;
  /** Classe processual (court_record.class); "" quando não informada. */
  class: string;
  /** Assunto (court_record.subject); "" quando não informado. */
  subject: string;
  /** Nome do 1º autor do processo (joined no BE); "" quando ausente. */
  autor: string;
  /** Nome do 1º réu do processo (joined no BE); "" quando ausente. */
  reu: string;
  /**
   * Título de exibição — calculado no BE, sempre presente. Prioridade: label
   * manual do processo > réu+CNJ > classe·assunto. Substitui a derivação
   * client-side que existia em lib/titulo.ts (Regra nº1 — fonte única).
   */
  title: string;
  /** ID do court_record — deep-link ao processo (/processos/:court_record_id). */
  court_record_id: string;
  court: string;
  degree: IntimacaoDegree;
  type: IntimacaoType;
  status: IntimacaoStatus;
  /** Situação de triagem (Pendente/Resolvida/Ignorada) — dirige o StatusBadge. */
  user_status: IntimacaoUserStatus;
  /**
   * Sub-desfecho quando RESOLVED — COMO a intimação foi concluída: "CIENCIA" (deu-se
   * ciência) | "PROTOCOLADA" (a peça gerada foi protocolada) | "" (PENDING/IGNORED).
   * Junto de user_status + work_stage, dirige o chip único de desfecho (ver estadoIntimacao).
   */
  resolution: IntimacaoResolution;
  /** Instante ISO da conclusão; null antes do desfecho (ou histórico sem instante). */
  resolved_at: string | null;
  source: string;
  source_url: string;
  made_available_at: string;
  published_at: string;
  deadline_start_at: string;
  content_preview: string;
  /**
   * ESTADO DO PRAZO exibido (chip/aba da Triagem) — fonte ÚNICA do rótulo de estado:
   * declarado|validado|calculado|divergente|ia|manual quando há prazo real, e
   * a_classificar|sem_prazo para NO_DEADLINE (a origem crua é placeholder 'calculado'
   * ali). O chip usa `estado`, NUNCA `prazo.origem` (que vaza 'calculado' no NO_DEADLINE).
   */
  estado: IntimacaoOrigem;
  /** Prazo derivado desta intimação; null quando ainda não calculado. */
  prazo: IntimacaoPrazoView | null;
  /**
   * Timestamp ISO da última análise; null = "não analisada" (badge da lista/painel).
   * Espelha IntimacaoView.ai_analyzed_at do BE.
   */
  ai_analyzed_at: string | null;
  /** Ato da publicação classificado pela IA; opcional durante a atualização da API. */
  ai_act?: string;
  /** Id interno do responsável pela intimação (0057, ex-conductor/reviewer);
   *  null = não atribuído. Espelha o BE. */
  assignee_user_id: string | null;
  /** Nome do responsável (joined no BE); null = não atribuído. */
  assignee_user_name: string | null;
  /** Estágio do ciclo de trabalho (Status) — derivado no BE (prazo + peça).
   *  Alimenta o filtro/pill de Status da inbox e o stepper do detalhe. */
  work_stage: IntimacaoWorkStage;
  ai_analysis_id?: string | null;
  ai_analysis_materialized_id?: string | null;
  ai_analysis_sources?: AnalysisSources | null;
  /**
   * Snapshot da 1ª providência SUGGESTED materializada da última análise — a "Ação
   * recomendada" que o card da Triagem mostra inline (payoff do lifecycle async). null
   * quando a análise ainda não materializou providência (a linha renderiza "Analisando…",
   * desde que haja prazo real e não esteja pendente de confirmação). Espelha o BE.
   */
  recommended_providencia: RecommendedProvidencia | null;
  /** Total de providências SUGGESTED da intimação (o snapshot mostra só a 1ª). */
  suggested_count: number;
  // ── Sinais da pipeline de Triagem (docs/erd-triagem-pipeline.md §9 U0) ──
  /** Categoria coarse determinística do document_type; sempre presente ("outros"
   *  no fallback). Alimenta o chip de categoria da linha densa. */
  categoria_coarse: IntimacaoCategoriaCoarse;
  /** Sinal A do motor v3 — ato|ciencia|a_classificar; "" quando não populado.
   *  Segmenta a fila "A triar" (Pra trabalhar × Ciências × Sem prazo). */
  acionabilidade: IntimacaoAcionabilidade;
  /** true = a data veio do piso supletivo 218§3 (não confiar) — hint "provisório". */
  provisorio: boolean;
  /** Lane de ciclo de vida derivada — dirige as abas de topo (A triar/Em
   *  andamento/Concluído). Fonte única do pipeline. */
  lifecycle: IntimacaoLifecycle;
  /** Disposição disjunta — dirige os segmentos de "A triar" (analisando|trabalho|
   *  excecao|ciencia|sem_prazo). Fonte única do segmento; exceção é bucket próprio. */
  disposicao: IntimacaoDisposicao;
  /** true = a intimação exige olhar humano (é exceção). Equivalente a disposicao==="excecao";
   *  mantido para o marcador ⚠ + motivo na linha. */
  is_excecao: boolean;
  /** Motivo (de maior peso) da exceção; "" quando is_excecao=false. */
  excecao_motivo: IntimacaoExcecaoMotivo;
  /**
   * Estado de concordância prazo×obrigação (action_item), derivado no BE a partir dos
   * mesmos flags de `disposicao`/exceção (docs/navigation-architecture.md §5 — contadores
   * auditáveis): concordante (prazo e obrigação concordam) | divergente (os 2 conflitos que
   * caem em disposicao='excecao') | mera_ciencia (subconjunto de concordante: ciencia+só
   * ciência) | sem_analise (ainda não materializou action_item — indeterminado, NUNCA conta
   * como concordância) | indeterminado (fallback). Aditivo/opcional enquanto o contrato do
   * BE não estiver 100% do rollout; ausente = não renderizar o estado (não inventar).
   */
  agreement_state?:
    | "concordante"
    | "divergente"
    | "mera_ciencia"
    | "sem_analise"
    | "indeterminado";
}

// RecommendedProvidencia é o subset enxuto da 1ª providência que a LISTA carrega (o conjunto
// completo vive no detalhe, IntimacaoProvidencia). Espelha IntimacaoView.recommended_providencia
// do BE (read.go IntimacaoRecommendedProvidencia).
export interface RecommendedProvidencia {
  /** id do action_item — o card da Triagem age (Gerar peça/Concluir/Descartar). */
  id: string;
  tipo: ActionItemTipo;
  title: string | null;
  gera_peca: boolean;
  piece_profile_key?: string | null;
  confianca?: number | null;
  tipo_status: ActionItemTipoStatus;
  /** SUGGESTED|TODO|WORKING|DONE — dirige a ação primária da barra. */
  status: string;
  fulfillment?: ProvidenciaFulfillment | null;
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
interface IntimacaoHistoryEntry {
  /** ISO timestamp do evento (timestamptz ou date→UTC do BE). */
  occurred_at: string;
  /** Rótulo humano, ex: "Capturada do DJEN", "Prazo confirmado por Luan". */
  label: string;
}

/** Status de TRABALHO da providência (action_item) — ciclo linear sem saída.
 *  SUGGESTED = só sugerida (ainda não iniciada); a partir de TODO ela está no
 *  trabalho (board/fila). A "Tarefa" foi eliminada: a Providência é a única
 *  unidade atômica de trabalho. */
export type IntimacaoProvidenciaStatus =
  "SUGGESTED" | "TODO" | "WORKING" | "DONE";

/** Tipo de ato/providência — closed set espelhado do BE (internal/actionitem). */
export type ProvidenciaTipo =
  "contestar" | "recorrer" | "manifestar" | "cumprir" | "ciencia";

/** Proveniência da classificação: declarada no teor, inferida pela IA, ou
 *  corrigida manualmente (reclassificar muda pra "manual"). */
type ProvidenciaTipoOrigem = "declarado" | "ia" | "manual";

/** Gate de TIPO: "confiavel" já pode ser iniciada direto; "a_confirmar" espera
 *  o usuário confirmar o tipo antes (POST /confirmar). É ortogonal ao `status`
 *  de trabalho. */
type ProvidenciaTipoStatus = "confiavel" | "a_confirmar";

/**
 * Uma providência PERSISTIDA (action_item) — GET /v1/intimacoes/:id devolve este
 * shape em `ai_providencias`. A "Tarefa" foi eliminada: não há mais `task_id`; o
 * ciclo de trabalho é o `status` (SUGGESTED→TODO→WORKING→DONE). O `id` É o id do
 * action_item — usado para o link `/providencias/:id`, os endpoints de transição
 * (iniciar/comecar/concluir) e o gate de tipo (confirmar/reclassificar), e como
 * `action_item_id` ao criar a peça. Espelha o IntimacaoProvidenciaView do BE.
 */
export interface IntimacaoProvidencia {
  /** Id do action_item — base de /providencias/:id, das transições e do action_item_id da peça. */
  id: string;
  /** Título rico da providência, persistido no action_item (pode ser null em itens
   *  antigos ou análise degradada) — o FE cai em `rotuloTipo(tipo)` quando ausente. */
  title: string | null;
  /** Descrição/fundamento da providência; null quando ausente. */
  description: string | null;
  tipo: ProvidenciaTipo;
  /** true = essa providência dá origem a uma peça (ver `piece_profile_key`). */
  gera_peca: boolean;
  /** Perfil de peça (catálogo GET /v1/piece-profiles); null quando gera_peca=false. */
  piece_profile_key: string | null;
  tipo_origem: ProvidenciaTipoOrigem;
  tipo_status: ProvidenciaTipoStatus;
  /** Confiança da IA (0-1); só preenchido quando tipo_origem="ia". */
  confianca: number | null;
  /** Status de trabalho: SUGGESTED (não iniciada) → TODO → WORKING → DONE. */
  status: IntimacaoProvidenciaStatus;
  deadline_id: string | null;
  fulfillment?: ProvidenciaFulfillment | null;
}

/**
 * Candidato EFÊMERO devolvido por POST /v1/intimacoes/:id/analise — ainda não é
 * a linha persistida (sem id/status/task_id: a materialização em action_item
 * acontece depois, de forma assíncrona, via evento). Espelha o
 * AnaliseProvidenciaView do BE. `declarado` é o `tipo_origem === "declarado"`
 * já resolvido em bool pra facilitar a UI de prévia (se algum dia precisar).
 */
interface IntimacaoAnaliseCandidate {
  title: string;
  description: string;
  /** Id INTERNO do responsável sugerido pela IA (app_user); null quando não sugerido. */
  suggested_assignee_user_id: string | null;
  suggested_assignee_name: string | null;
  due_date: string | null;
  tipo: ProvidenciaTipo;
  gera_peca: boolean;
  piece_profile_key: string | null;
  declarado: boolean;
  confianca: number | null;
  fulfillment?: ProvidenciaFulfillment | null;
}

/**
 * Resposta de POST /v1/intimacoes/:id/analise — a análise IA recém-gerada.
 * Espelha o IntimacaoAnaliseView do BE. O `summary` foi descontinuado no BE
 * (2026-09) e não vem mais nesta resposta. `providencias` são candidatos EFÊMEROS
 * (ver `IntimacaoAnaliseCandidate`) — NÃO confundir com `ai_providencias` do detalhe
 * (que é a view persistida, materializada assincronamente após esta resposta).
 */
export interface IntimacaoAnalise {
  providencias: IntimacaoAnaliseCandidate[];
  /** ISO timestamp de quando a análise foi (re)gerada. */
  analyzed_at: string;
  analysis_id?: string;
  sources?: AnalysisSources;
}

/**
 * Detalhe (deep-link) — GET /v1/intimacoes/:id. Embute a IntimacaoView da lista e
 * acrescenta os extras da tela de detalhe: o teor COMPLETO (não a prévia truncada),
 * o órgão julgador, a lista de destinatários, os responsáveis e o histórico derivado.
 * Espelha o IntimacaoDetailView do BE.
 */
/**
 * Estágio da intimação no ciclo da unidade de trabalho (recebida → protocolada) —
 * fonte ÚNICA que o stepper do detalhe consome. Projeção derivada no BE (prazo +
 * peça); espelha os WorkStage* de internal/acquisition/read.go.
 */
type IntimacaoWorkStage =
  | "RECEIVED"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "DRAFTING"
  | "PARTNER_REVIEW"
  | "FILED"
  | "VENCIDA";

export interface IntimacaoDetalheView extends IntimacaoView {
  /** Teor COMPLETO da publicação (não truncado como content_preview). */
  content: string;
  /** Estágio do ciclo de trabalho (stepper) — derivado no BE. */
  work_stage: IntimacaoWorkStage;
  /** Ato principal classificado pela IA (ex.: "Contestação") — título do detalhe
   *  (fallback classe+assunto) e pill "Ato". "" pré-análise. */
  ai_act: string;
  /** Órgão julgador (court_record.judging_body). */
  judging_body: string;
  /** Fase efetiva do processo (phase_override ?? phase); "" quando não derivada.
   *  Contexto mínimo no breadcrumb da intimação (chip); ficha completa no cockpit. */
  phase: string;
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
  // deprecated: BE always returns ""; no longer rendered (2026-09). O campo segue
  // no shape porque o BE ainda o devolve (vazio), mas o FE não o consome.
  ai_summary?: string;
  /** Providências PERSISTIDAS (action_item) — sempre array (nunca null); vazio
   *  antes da análise ou enquanto a materialização assíncrona não rodou ainda
   *  (ver heurística de poll em useIntimacaoDetalhe). */
  ai_providencias: IntimacaoProvidencia[];
  /**
   * ISO timestamp da última análise IA; null = pré-análise (o card mostra o CTA);
   * preenchido = pós-análise (o card mostra as providências).
   */
  ai_analyzed_at: string | null;
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
 * Contagens da pipeline de Triagem (full-backlog) — GET /v1/intimacoes/pipeline-counts.
 * Espelha o TriagemBucketCounts do BE (docs/erd-intimacao-triagem.md §7): as três lanes de
 * ciclo de vida (a_triar/em_andamento/concluido) + a PARTIÇÃO DISJUNTA de "A triar"
 * (analisando/trabalho/excecao/ciencia/sem_prazo). INVARIANTE do BE: analisando+trabalho+
 * excecao+ciencia+sem_prazo == a_triar (disjunção). Cada número é computado sobre o conjunto
 * INTEIRO do filtro atual (não a página), respeitando os filtros compartilhados (search/
 * urgência/responsável/…) mas NÃO a dimensão lifecycle/disposição que ele particiona. As
 * abas/segmentos leem daqui — nunca de `.filter().length` sobre a página.
 */
export interface TriagemBucketCounts {
  a_triar: number;
  em_andamento: number;
  concluido: number;
  /** Analisando — motor ainda não classificou (transiente); dentro de a_triar. */
  analisando: number;
  /** Pra trabalhar — acionável, confiável, classificado (EXCLUI exceção); dentro de a_triar. */
  trabalho: number;
  /** Exceções — acionável mas o motor está incerto; dentro de a_triar. */
  excecao: number;
  /** Ciências — mera ciência; dentro de a_triar. */
  ciencia: number;
  /** Sem prazo — não datável (motor não soube); dentro de a_triar. */
  sem_prazo: number;
  /**
   * Matriz disposição × lifecycle (docs/navigation-architecture.md §4) — ADITIVA ao
   * lado dos 8 campos legados acima (que só cobrem disposição dentro de a_triar).
   * Cada lane expõe as MESMAS 6 células (total + as 5 disposições). Opcional: o BE
   * está introduzindo este campo em paralelo (rollout a89a4e); ausente enquanto o
   * rollout não completa — o FE NUNCA infere estas células a partir dos campos
   * legados/página quando ausente (mostra loading/sem contagem, ver
   * use-triagem-pipeline.ts).
   */
  by_lifecycle?: Record<
    "a_triar" | "em_andamento" | "concluido",
    {
      total: number;
      analisando: number;
      trabalho: number;
      excecao: number;
      ciencia: number;
      sem_prazo: number;
    }
  >;
}

/** Origem do prazo — closed set espelhado do BE (?origem=<v>). */
export type IntimacaoOrigem =
  | "declarado"
  | "validado"
  | "calculado"
  | "divergente"
  | "ia"
  | "manual"
  | "a_classificar"
  | "sem_prazo";

/**
 * Contagens por origem do prazo — incluídas no envelope da lista. Cada número é
 * quantas intimações a aba daquela origem mostraria, computado sobre o conjunto
 * INTEIRO do filtro atual EXCETO o próprio `origem` (o BE ignora o filtro de
 * origem ao contar, então o total continua correto ao trocar de aba). Espelha o
 * IntimacaoOrigemFacetsView do BE.
 */
export type OrigemFacets = Record<IntimacaoOrigem, number>;

/**
 * Envelope da lista de intimações — estende o PageEnvelope padrão com os buckets
 * de contagem por urgência e as facets de origem do prazo (retornados pelo BE
 * junto à página).
 */
export interface IntimacaoGroup {
  cnj_number: string;
  matching_count: number;
  total_count: number;
}

export interface IntimacaoBucketsEnvelope extends PageEnvelope<IntimacaoView> {
  groups: IntimacaoGroup[] | null;
  process_count: number;
  total_without_urgency: number;
  buckets: IntimacoesBuckets;
  origem_facets: OrigemFacets;
}
