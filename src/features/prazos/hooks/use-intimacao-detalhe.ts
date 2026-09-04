"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  intimacoesKeys,
  useAnalisarIntimacao,
  useAssignIntimacaoResponsavel,
  useIgnorarIntimacao,
  useIntimacaoDetalhe as useIntimacaoDetalheQuery,
  useReabrirIntimacao,
  useResolverIntimacao,
} from "@/features/intimacoes/hooks/use-intimacoes";
import { TYPE_LABEL } from "@/features/intimacoes/lib/labels";
import type {
  IntimacaoDetalheView,
  IntimacaoUserStatus,
  IntimacaoWorkStage,
} from "@/features/intimacoes/types";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { formatarData } from "@/lib/utils";

import type {
  PrazoCrossValidationDecisao,
  PrazoDetalheView,
  PrazoOrigem,
  PrazoSelo,
} from "../types";
import { useApurarDivergenciaPrazo } from "./use-apurar-divergencia-prazo";
import { usePrazo } from "./use-prazo";

// ── helpers puros (rótulos/datas) ────────────────────────────────────────────

/** user_status → rótulo + cor (token). PENDING gold, RESOLVED green, IGNORED fg3. */
function userStatusInfo(s: IntimacaoUserStatus): {
  label: string;
  cor: string;
  fundo: string;
} {
  if (s === "RESOLVED")
    return {
      label: "Resolvida",
      cor: "var(--green)",
      fundo: "color-mix(in oklch, var(--green) 10%, transparent)",
    };
  if (s === "IGNORED")
    return {
      label: "Ignorada",
      cor: "var(--fg3)",
      fundo: "color-mix(in oklch, var(--fg3) 12%, transparent)",
    };
  return {
    label: "Pendente",
    cor: "var(--gold)",
    fundo: "color-mix(in oklch, var(--gold) 13%, transparent)",
  };
}

/** prazo (days_left) → número + frase + cor. null = "sem prazo"/fg3. */
function prazoInfo(daysLeft: number | null): {
  num: string;
  frase: string;
  cor: string;
} {
  if (daysLeft === null)
    return { num: "—", frase: "sem prazo", cor: "var(--fg3)" };
  if (daysLeft < 0)
    return { num: String(-daysLeft), frase: "d em atraso", cor: "var(--red)" };
  if (daysLeft === 0)
    return { num: "hoje", frase: "vence hoje", cor: "var(--gold)" };
  return { num: String(daysLeft), frase: "dias restantes", cor: "var(--fg2)" };
}

/** Data curta "DD/MM" a partir de um ISO date/timestamp (UTC). */
function dataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

// Etapas do ciclo de vida da UNIDADE DE TRABALHO (stepper do design), da captura
// ao protocolo. O passo atual é derivado do estado REAL (prazo confirmado + status
// da peça mais recente) — ver passoDoCiclo. "estado" pinta o marcador/rótulo.
const CICLO_STEPS = [
  "Intimação recebida",
  "A confirmar",
  "Confirmado",
  "Em elaboração",
  "Revisão do sócio",
  "Protocolado",
] as const;

type EstadoPasso = "done" | "current" | "todo";

// work_stage (fonte única do BE) → índice do passo no stepper. Ordem 1:1 com
// CICLO_STEPS. Fallback 0 (recebida) para um valor desconhecido.
const PASSO_POR_WORK_STAGE: Record<IntimacaoWorkStage, number> = {
  RECEIVED: 0,
  AWAITING_CONFIRMATION: 1,
  CONFIRMED: 2,
  DRAFTING: 3,
  PARTNER_REVIEW: 4,
  FILED: 5,
};

// Rótulo da peça (minuta) para o rodapé das Providências, derivado do work_stage:
// existe peça a partir de DRAFTING; antes disso, "Ainda não gerada".
const PECA_LABEL_POR_WORK_STAGE: Record<IntimacaoWorkStage, string> = {
  RECEIVED: "Ainda não gerada",
  AWAITING_CONFIRMATION: "Ainda não gerada",
  CONFIRMED: "Ainda não gerada",
  DRAFTING: "Em elaboração",
  PARTNER_REVIEW: "Revisão do sócio",
  FILED: "Protocolada",
};

/** Urgência da FAIXA (badge "Urgente"), derivada de days_left — dimensão separada
 *  da triagem (user_status). Atraso = vermelho; vence hoje/≤2d = latão; senão sem
 *  badge (não-urgente não polui a faixa). null = sem prazo. */
function urgenciaFaixa(
  daysLeft: number | null,
): { label: string; cor: string; fundo: string } | null {
  if (daysLeft === null) return null;
  if (daysLeft < 0)
    return {
      label: "Urgente",
      cor: "var(--red)",
      fundo: "color-mix(in oklch, var(--red) 12%, transparent)",
    };
  if (daysLeft <= 2)
    return {
      label: "Urgente",
      cor: "var(--gold)",
      fundo: "color-mix(in oklch, var(--gold) 14%, transparent)",
    };
  return null;
}

// ── memória de cálculo ("por que essa data?", V1 — migração 0084) ───────────

/** origem (proveniência da data) → rótulo + cor. Reaproveita a paleta existente
 *  (gold = atenção/pendente, primary = regra/IA, fg2 = neutro/declarado). */
function origemInfo(
  origem: PrazoOrigem | undefined,
): { label: string; cor: string; fundo: string } | null {
  if (origem === "declarado")
    return {
      label: "Prazo declarado no ato",
      cor: "var(--fg2)",
      fundo: "var(--hover)",
    };
  if (origem === "calculado")
    return {
      label: "Prazo calculado pela regra",
      cor: "var(--primary)",
      fundo: "color-mix(in oklch, var(--primary) 12%, transparent)",
    };
  if (origem === "ia")
    return {
      label: "Prazo inferido",
      cor: "var(--primary)",
      fundo: "color-mix(in oklch, var(--primary) 12%, transparent)",
    };
  if (origem === "divergente")
    return {
      label: "Prazo divergente",
      cor: "var(--gold)",
      fundo: "color-mix(in oklch, var(--gold) 12%, transparent)",
    };
  return null;
}

/** Explica o PORQUÊ daquele selo específico (de onde vem a confiança, ou a
 *  falta dela, pra esse prazo) — texto do tooltip do badge no header. Precisa
 *  do `origem` bruto + se há apuração pendente/resolvida (divergência de data
 *  ou tipo inferido por IA) pra escolher a frase certa. */
function seloDescricao(
  selo: PrazoSelo | undefined,
  origem: PrazoOrigem | undefined,
  divergenciaPendente: boolean,
  tipoIaPendente: boolean,
): string {
  if (selo === "confiavel") {
    if (origem === "declarado")
      return "A data declarada na intimação bateu com o cálculo da regra — o sistema assumiu sem precisar de revisão humana.";
    if (origem === "calculado")
      return "Calculado por regra determinística, sem prazo declarado pra divergir — o sistema assumiu.";
    if (origem === "ia" || origem === "divergente")
      return "A data foi revisada e confirmada por um humano.";
    return "Selo de confiança — dimensão separada do relógio.";
  }
  if (selo === "a_apurar") {
    if (tipoIaPendente)
      return "O tipo do ato foi inferido por classificação (intimação omissa, sem prazo declarado) — precisa de confirmação humana antes de assumir a data.";
    if (divergenciaPendente)
      return "A data declarada na intimação diverge da calculada pela regra — precisa de decisão humana sobre qual vale.";
    return "Selo de confiança — dimensão separada do relógio.";
  }
  return "Selo de confiança — dimensão separada do relógio.";
}

/** selo de confiança → rótulo + cor. Dimensão separada do relógio (days_left). */
function seloInfo(
  selo: PrazoSelo | undefined,
  origem: PrazoOrigem | undefined,
  divergenciaPendente: boolean,
  tipoIaPendente: boolean,
): { label: string; cor: string; fundo: string; descricao: string } | null {
  const descricao = seloDescricao(
    selo,
    origem,
    divergenciaPendente,
    tipoIaPendente,
  );
  if (selo === "confiavel")
    return {
      label: "Confiável",
      cor: "var(--green)",
      fundo: "color-mix(in oklch, var(--green) 10%, transparent)",
      descricao,
    };
  if (selo === "a_apurar")
    return {
      label: "A apurar",
      cor: "var(--gold)",
      fundo: "color-mix(in oklch, var(--gold) 12%, transparent)",
      descricao,
    };
  return null;
}

const DECISAO_LABEL: Partial<Record<PrazoCrossValidationDecisao, string>> = {
  aceita_declarado: "Aceito o valor declarado",
  aceita_calculado: "Aceito o valor calculado",
  ajuste_manual: "Ajustado manualmente",
};

export interface MemoriaCadeiaItem {
  kicker: string;
  valor: string;
  sub: string;
}

export interface MemoriaCalculoVM {
  prazoId: string;
  origem: { label: string; cor: string; fundo: string } | null;
  selo: {
    label: string;
    cor: string;
    fundo: string;
    descricao: string;
  } | null;
  providerVersion: string;
  /** false = prazo pré-V1 (sem calc_memory) — degradar a cadeia/feriados. */
  temCalcMemory: boolean;
  cadeia: MemoriaCadeiaItem[];
  resultadoFatal: string;
  /** null quando prazo_interno === end_date (sub-rótulo redundante, omitir). */
  notaInterna: string | null;
  feriados: { data: string; nome: string; ambito: string }[];
  divergencia: {
    pendente: boolean;
    resolvida: boolean;
    declarada: string;
    calculada: string;
    difDias: number;
    causa: string;
    decisaoLabel: string;
  } | null;
}

/** Deriva a VM da memória de cálculo a partir do PrazoDetalheView (V1). Prazo
 *  pré-V1 (sem calc_memory) degrada: badges continuam, cadeia/feriados somem. */
function buildMemoria(p: PrazoDetalheView | null): MemoriaCalculoVM | null {
  if (!p) return null;

  const calc = p.calc_memory ?? null;
  const holidays = p.applied_holiday ?? [];

  const cadeia: MemoriaCadeiaItem[] = [];
  if (calc) {
    cadeia.push({
      kicker: "TERMO INICIAL",
      valor: formatarData(p.start_date),
      sub: calc.termo_inicial_regra,
    });
    cadeia.push({
      kicker: "PRAZO BASE",
      valor: calc.prazo_base,
      sub: calc.prazo_base_fonte,
    });
    cadeia.push({
      kicker: "CONTAGEM",
      valor: calc.dias_uteis ? "Dias úteis" : "Dias corridos",
      sub: `Descontados ${holidays.length} feriado(s)/suspensão(ões)`,
    });
    cadeia.push(
      calc.dobra_motivo
        ? { kicker: "DOBRA", valor: "2x", sub: calc.dobra_motivo }
        : {
            kicker: "SEM DOBRA",
            valor: "—",
            sub: "Nenhuma prerrogativa de prazo em dobro registrada na Pasta.",
          },
    );
  }

  const cv = p.cross_validation ?? null;
  const divergencia = cv
    ? {
        pendente: cv.resultado === "divergente" && !cv.decisao,
        resolvida: !!cv.decisao,
        declarada: formatarData(cv.data_declarada),
        calculada: formatarData(cv.data_calculada),
        difDias: cv.dif_dias,
        causa: cv.causa_provavel?.trim() || "Não informada.",
        decisaoLabel: cv.decisao
          ? (DECISAO_LABEL[cv.decisao] ?? cv.decisao)
          : "",
      }
    : null;

  const tipoIaPendente = p.origem === "ia" && p.selo === "a_apurar";

  return {
    prazoId: p.id,
    origem: origemInfo(p.origem),
    selo: seloInfo(
      p.selo,
      p.origem,
      divergencia?.pendente ?? false,
      tipoIaPendente,
    ),
    providerVersion: calc?.calendar_provider_version?.trim() || "—",
    temCalcMemory: !!calc,
    cadeia,
    resultadoFatal: formatarData(p.end_date),
    notaInterna:
      p.prazo_interno !== p.end_date
        ? `Prazo interno ${formatarData(p.prazo_interno)} — folga de segurança antes do fatal.`
        : null,
    feriados: holidays.map((h) => ({
      data: dataCurta(h.data),
      nome: h.nome?.trim() || "Feriado/suspensão",
      ambito: h.ambito?.trim() || "—",
    })),
    divergencia,
  };
}

// ── modelo derivado (VM que o componente consome) ────────────────────────────

function useModel(i: IntimacaoDetalheView | undefined) {
  const { members } = useOrgMembersDirectory();

  return useMemo(() => {
    if (!i) return null;

    const status = userStatusInfo(i.user_status);
    const prazo = prazoInfo(i.prazo?.days_left ?? null);
    const urgencia = urgenciaFaixa(i.prazo?.days_left ?? null);

    // Stepper do ciclo de trabalho (6 passos): o passo atual é o work_stage do BE
    // (fonte única). done/current/todo pinta marcador+rótulo.
    const atual = PASSO_POR_WORK_STAGE[i.work_stage] ?? 0;
    const stepper = CICLO_STEPS.map((label, idx) => {
      const estado: EstadoPasso =
        idx < atual ? "done" : idx === atual ? "current" : "todo";
      return {
        key: label,
        label,
        estado,
        temLinha: idx < CICLO_STEPS.length - 1,
        linhaFeita: idx < atual,
        flex: idx < CICLO_STEPS.length - 1 ? 1 : 0,
      };
    });

    // Responsável: nome resolvido pelo join do BE ou pelo diretório (nunca id cru).
    const membro = i.assignee_user_id
      ? members.find((m) => m.id === i.assignee_user_id)
      : undefined;
    const responsavelNome =
      i.assignee_user_name?.trim() ||
      (membro ? nomeExibicao(membro.name, membro.email) : "");

    // Providências visíveis = tudo menos DISCARDED. Endereçadas por `id` — não mais
    // por índice (action_item é uma tabela real agora, ver types.ts).
    const providencias = i.ai_providencias.filter(
      (p) => p.status !== "DISCARDED",
    );

    const analisada = i.ai_analyzed_at !== null;
    const degradado = analisada && !i.ai_summary?.trim();

    return {
      id: i.id,
      cnj: i.cnj_number,
      courtRecordId: i.court_record_id,
      // Título = o ATO classificado pela IA (pós-análise); fallback ao título
      // calculado no BE (label manual > réu+CNJ > classe·assunto) pré-análise.
      // `ato` também alimenta o pill "Ato" da derivação.
      titulo: i.ai_act?.trim() || i.title,
      ato: i.ai_act?.trim() ?? "",
      tipoLabel: TYPE_LABEL[i.type],
      orgao: i.judging_body || i.court,
      publicadoEm: i.published_at ? formatarData(i.published_at) : "—",

      // Contexto do processo (usado no rail da Construção/partida da peça).
      classe: i.class,
      assunto: i.subject,
      tribunal: i.court,
      tribunalGrau: [i.court, i.degree].filter(Boolean).join(" · "),
      // Destinatários (advogados endereçados) — "Partes/Procuradores" no rail.
      destinatarios: i.recipients.map((r) => ({
        nome: r.name,
        oab: [r.oab_number, r.oab_uf].filter(Boolean).join("/"),
        matched: r.matched,
      })),

      // ciclo de vida (badge de situação + stepper)
      statusLabel: status.label,
      statusCor: status.cor,
      statusFundo: status.fundo,
      stepper,

      // faixa: badge de urgência (dimensão do relógio, ≠ triagem)
      urgencia,

      // prazo (contador grande). `fatalData` = data fatal real (end_date). O prazo
      // "interno" (folga de segurança) vem do motor de prazos — ainda 💀 (esqueleto).
      prazoNum: prazo.num,
      prazoFrase: prazo.frase,
      prazoCor: prazo.cor,
      prazoConfirmado: i.prazo?.confirmed ?? false,
      fatalData: i.prazo?.end_date ? formatarData(i.prazo.end_date) : "",

      // IA (pré vs pós-análise)
      analisada,
      degradado,
      resumo: i.ai_summary?.trim() ?? "",
      analisadaEm: i.ai_analyzed_at ? formatarData(i.ai_analyzed_at) : "",
      providencias,
      nProvidencias: providencias.length,

      // peça (minuta) — rótulo de status derivado do work_stage, p/ o rodapé das
      // Providências. pecaExiste = já há minuta (DRAFTING+).
      pecaLabel: PECA_LABEL_POR_WORK_STAGE[i.work_stage] ?? "Ainda não gerada",
      pecaExiste:
        i.work_stage === "DRAFTING" ||
        i.work_stage === "PARTNER_REVIEW" ||
        i.work_stage === "FILED",

      // teor completo + trilha
      teor: i.content?.trim() ?? "",
      trilha: i.history.map((h) => ({
        data: dataCurta(h.occurred_at),
        label: h.label,
      })),

      // responsável
      responsavelId: i.assignee_user_id,
      responsavelNome,

      // triagem
      userStatus: i.user_status,
      podeReabrir: i.user_status === "RESOLVED" || i.user_status === "IGNORED",
    };
  }, [i, members]);
}

// Hook público do detalhe da intimação (unidade de trabalho). Compõe os hooks
// reais da feature intimacoes e expõe uma VM limpa + handlers para a UI ligar.
export function useIntimacaoDetalhe(id: string) {
  const queryClient = useQueryClient();
  const query = useIntimacaoDetalheQuery(id);
  const i = query.data;

  const model = useModel(i);

  const analisar = useAnalisarIntimacao(id);
  const resolver = useResolverIntimacao();
  const ignorar = useIgnorarIntimacao();
  const reabrir = useReabrirIntimacao();
  const assign = useAssignIntimacaoResponsavel(id);
  const membros = useOrgMembersDirectory();

  // memória de cálculo ("por que essa data?") — mesmo payload do usePrazo, sem
  // fetch duplicado. Desligada enquanto não houver prazo derivado da intimação.
  const prazoId = i?.prazo?.deadline_id ?? null;
  const prazoDetalhe = usePrazo(prazoId);
  const apurarDivergencia = useApurarDivergenciaPrazo();
  const memoria = useMemo(
    () => buildMemoria(prazoDetalhe.prazo),
    [prazoDetalhe.prazo],
  );

  // A apuração (divergência) roda no slice "prazos" mas o BE mescla o
  // evento resultante na Trilha da intimação (i.history) e pode confirmar o
  // prazo (stepper) — ambos lidos da query de detalhe da intimação, não da de
  // prazos. Invalida aqui (orquestrador, onde o `id` já está disponível) em vez
  // de dentro de use-apurar-divergencia-prazo, pra não acoplar esse hook
  // genérico ao query key do slice intimacoes.
  const invalidateIntimacaoDetalhe = () =>
    queryClient.invalidateQueries({ queryKey: intimacoesKeys.detail(id) });

  const onAceitarDeclarado = () => {
    if (!prazoId) return;
    apurarDivergencia.apurar(
      { prazoId, body: { decisao: "aceita_declarado" } },
      {
        onSuccess: () => {
          invalidateIntimacaoDetalhe();
          toast.success("Divergência apurada — declarado aceito.");
        },
        onError: () =>
          toast.error(
            "Não foi possível apurar a divergência. Tente novamente.",
          ),
      },
    );
  };

  const onAceitarCalculado = () => {
    if (!prazoId) return;
    apurarDivergencia.apurar(
      { prazoId, body: { decisao: "aceita_calculado" } },
      {
        onSuccess: () => {
          invalidateIntimacaoDetalhe();
          toast.success("Divergência apurada — calculado aceito.");
        },
        onError: () =>
          toast.error(
            "Não foi possível apurar a divergência. Tente novamente.",
          ),
      },
    );
  };

  // Ajuste manual = escolher uma DATA FATAL específica (endDate, wire YYYY-MM-DD),
  // não mais uma quantidade de dias — o BE grava a data direto no prazo.
  const onAjusteManual = (endDate: string) => {
    if (!prazoId) return;
    apurarDivergencia.apurar(
      {
        prazoId,
        body: { decisao: "ajuste_manual", end_date: endDate },
      },
      {
        onSuccess: () => {
          invalidateIntimacaoDetalhe();
          toast.success("Ajuste manual registrado.");
        },
        onError: () =>
          toast.error("Não foi possível registrar o ajuste. Tente novamente."),
      },
    );
  };

  const onAnalisar = () =>
    analisar.mutate(undefined, {
      onError: () =>
        toast.error("Não foi possível gerar a análise. Tente novamente."),
    });

  const onResolver = () =>
    resolver.mutate(id, {
      onSuccess: () => toast.success("Intimação resolvida."),
      onError: () => toast.error("Não foi possível resolver. Tente novamente."),
    });

  const onIgnorar = () =>
    ignorar.mutate(id, {
      onSuccess: () => toast.success("Intimação ignorada."),
      onError: () => toast.error("Não foi possível ignorar. Tente novamente."),
    });

  const onReabrir = () =>
    reabrir.mutate(id, {
      onSuccess: () => toast.success("Intimação reaberta."),
      onError: () => toast.error("Não foi possível reabrir. Tente novamente."),
    });

  const onAssign = (assigneeUserId: string | null) =>
    assign.mutate(
      { assigneeUserId },
      {
        onError: () => toast.error("Não foi possível salvar o responsável."),
      },
    );

  return {
    isPending: query.isPending,
    isError: query.isError,
    model,
    // Intimação crua (IntimacaoDetalheView) — além do VM `model`, os blocos
    // compartilhados do card Providências (ProvidenciasLinhaLegal/Banner,
    // ComoIALeuCard, em features/intimacoes) esperam o shape real do BE, não a
    // VM derivada desta tela.
    intimacao: i,

    // IA
    analisando: analisar.isPending,
    analiseErro: analisar.isError,
    onAnalisar,

    // triagem
    onResolver,
    onIgnorar,
    onReabrir,
    triagemEmVoo: resolver.isPending || ignorar.isPending || reabrir.isPending,

    // responsável
    membros: membros.members,
    onAssign,
    assignEmVoo: assign.isPending,

    // memória de cálculo ("por que essa data?")
    memoria,
    memoriaPending: !!prazoId && prazoDetalhe.isPending,
    memoriaErro: !!prazoId && prazoDetalhe.isError,
    memoriaEmVoo: apurarDivergencia.isPending,
    onAceitarDeclarado,
    onAceitarCalculado,
    onAjusteManual,
  };
}
