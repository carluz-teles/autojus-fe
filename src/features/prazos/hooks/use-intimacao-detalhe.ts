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
import { estadoIntimacao } from "@/features/intimacoes/lib/estado";
import {
  atoPublicacaoLabel,
  tituloIntimacao,
  TYPE_LABEL,
} from "@/features/intimacoes/lib/labels";
import type {
  IntimacaoDetalheView,
  IntimacaoUserStatus,
} from "@/features/intimacoes/types";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { FASE_STEPS } from "@/features/processos/lib/apresentacao";
import { ApiError } from "@/lib/api/errors";
import { formatarData } from "@/lib/utils";

import { prazoVisivel } from "../lib/confirmacao";
import {
  documentoOrigemUrl,
  feriadosVigentes,
  formatarCNJ,
  situacaoRevisao,
} from "../lib/detalhe-apresentacao";
import type {
  PrazoCrossValidationDecisao,
  PrazoDetalheView,
  PrazoOrigem,
} from "../types";
import { usePrazoTipos } from "./_private/use-prazo-tipos";
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
  // Rótulo NEUTRO: o countdown é o delta de calendário (wall-clock) até a data fatal — não é
  // "corridos" nem "úteis". A CONTAGEM real (dias úteis vs corridos) aparece no "Por que essa
  // data?", com o regime correto (counting). Dizer "dias corridos" aqui contradizia o prazo em
  // dias úteis e confundia (QA Fase 4).
  if (daysLeft < 0)
    return {
      num: String(-daysLeft),
      frase: "dias em atraso",
      cor: "var(--red)",
    };
  if (daysLeft === 0)
    return { num: "", frase: "Vence hoje", cor: "var(--gold)" };
  return {
    num: String(daysLeft),
    frase: "dias até o vencimento",
    cor: "var(--fg2)",
  };
}

/** Data curta "DD/MM" a partir de um ISO date/timestamp (UTC). */
function dataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
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

const DECISAO_LABEL: Partial<Record<PrazoCrossValidationDecisao, string>> = {
  aceita_declarado: "Aceito o valor declarado",
  aceita_calculado: "Aceito o valor calculado",
  ajuste_manual: "Ajustado manualmente",
};

interface MemoriaCadeiaItem {
  kicker: string;
  valor: string;
  sub: string;
}

export interface MemoriaCalculoVM {
  prazoId: string;
  origem: { label: string; cor: string; fundo: string } | null;
  /** false = prazo pré-V1 (sem calc_memory) — degradar a cadeia/feriados. */
  temCalcMemory: boolean;
  cadeia: MemoriaCadeiaItem[];
  /** null quando prazo_interno === end_date (sub-rótulo redundante, omitir). */
  notaInterna: string | null;
  feriados: { data: string; nome: string; ambito: string }[];
  divergencia: {
    pendente: boolean;
    declarada: string;
    calculada: string;
    difDias: number;
    decisaoLabel: string;
  } | null;
}

/** Deriva a VM da memória de cálculo a partir do PrazoDetalheView (V1). Prazo
 *  pré-V1 (sem calc_memory) degrada: badges continuam, cadeia/feriados somem. */
function buildMemoria(p: PrazoDetalheView | null): MemoriaCalculoVM | null {
  if (!p || p.status === "NO_DEADLINE") return null;

  const calc =
    p.calculation_audit_status === "current" ? p.current_calculation : null;
  const holidays = feriadosVigentes(p);
  const cadeia: MemoriaCadeiaItem[] = calc
    ? [
        {
          kicker: "TERMO INICIAL",
          valor: calc.start_date
            ? formatarData(calc.start_date)
            : "Não informado",
          sub: calc.anchor_event || "Marco não registrado",
        },
        {
          kicker: "PRAZO BASE",
          valor: `${calc.days} dias`,
          sub:
            calc.source === "declared"
              ? "Duração informada na publicação"
              : calc.source === "manual"
                ? "Duração ajustada manualmente"
                : calc.fallback_used
                  ? "Base genérica provisória"
                  : "Regra registrada",
        },
        {
          kicker: "CONTAGEM",
          valor: calc.counting === "BUSINESS" ? "Dias úteis" : "Dias corridos",
          sub: `${holidays.length} feriado(s) ou suspensão(ões) nesta contagem.`,
        },
        {
          kicker: calc.doubled ? "DOBRA" : "SEM DOBRA",
          valor: calc.doubled ? "2x" : "—",
          sub: calc.doubled
            ? "Prazo em dobro registrado"
            : "Sem prazo em dobro",
        },
      ]
    : [];

  const cv = p.cross_validation ?? null;
  const divergencia = cv
    ? {
        pendente:
          p.origem !== "declarado" &&
          cv.resultado === "divergente" &&
          !cv.decisao,
        declarada: formatarData(cv.data_declarada),
        calculada: formatarData(cv.data_calculada),
        difDias: cv.dif_dias,
        decisaoLabel: cv.decisao
          ? (DECISAO_LABEL[cv.decisao] ?? cv.decisao)
          : "",
      }
    : null;

  return {
    prazoId: p.id,
    origem: calc
      ? calc.source === "generic_fallback"
        ? {
            label: "Prazo provisório pela regra genérica",
            cor: "var(--gold)",
            fundo: "var(--hover)",
          }
        : calc.source === "manual"
          ? {
              label: "Prazo ajustado manualmente",
              cor: "var(--fg2)",
              fundo: "var(--hover)",
            }
          : origemInfo(calc.source === "declared" ? "declarado" : "calculado")
      : null,
    temCalcMemory: !!calc,
    cadeia,
    notaInterna:
      p.prazo_interno && p.prazo_interno !== p.end_date
        ? `Prazo interno ${formatarData(p.prazo_interno)} registrado.`
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
    const visivel = prazoVisivel(i);
    const prazo = prazoInfo(visivel?.days_left ?? null);
    if (i.estado === "a_classificar") prazo.frase = "prazo a definir";

    // Responsável: nome resolvido pelo join do BE ou pelo diretório (nunca id cru).
    const membro = i.assignee_user_id
      ? members.find((m) => m.id === i.assignee_user_id)
      : undefined;
    const responsavelNome =
      i.assignee_user_name?.trim() ||
      (membro ? nomeExibicao(membro.name, membro.email) : "");

    // Providências (action_item) da intimação, endereçadas por `id`. O status é o
    // ciclo de trabalho (SUGGESTED→TODO→WORKING→DONE) — sem estado "descartado".
    const providencias = i.ai_providencias;

    const analisada = i.ai_analyzed_at !== null;

    return {
      id: i.id,
      cnj: formatarCNJ(i.cnj_number),
      courtRecordId: i.court_record_id,
      // Identidade estável antes e depois da análise.
      titulo: tituloIntimacao(i.title),
      autor: i.autor,
      reu: i.reu,
      fonte: i.source,
      documentoUrl: documentoOrigemUrl(i.source_url),
      disponibilizadoEm: i.made_available_at
        ? formatarData(i.made_available_at)
        : "—",
      inicioContagem: i.deadline_start_at
        ? formatarData(i.deadline_start_at)
        : "—",
      tipoLabel: TYPE_LABEL[i.type],
      // fase — rótulo pt-BR da fase do processo (contexto no breadcrumb). Reusa FASE_STEPS
      // (fonte única do stepper do cockpit, Regra nº1). "" quando não derivada.
      fase: FASE_STEPS.find((s) => s.key === i.phase)?.label ?? "",
      // ato — o TÍTULO do detalhe: o que ACONTECEU nesta publicação. Prioridade: ai_act (o
      // ato classificado, ex.: "Sentença") > rótulo do tipo_ato do prazo (ex.: "Apelação",
      // disponível já na ingestão determinística) > tipo genérico ("Intimação"). Substitui o
      // título do PROCESSO no header (a intimação é a unidade de trabalho, não o processo).
      ato: atoPublicacaoLabel(i.ai_act, i.prazo?.tipo_ato, i.type),
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

      statusLabel: status.label,
      // estado (desfecho) — chip ÚNICO derivado de user_status+resolution+work_stage.
      // Distingue Concluída·Ciência de Concluída·Protocolada; ver estadoIntimacao.
      estado: estadoIntimacao(i),

      // prazo (contador grande). `fatalData` = data fatal real (end_date). O prazo
      // "interno" (folga de segurança) vem do motor de prazos — ainda 💀 (esqueleto).
      prazoNum: prazo.num,
      prazoFrase: prazo.frase,
      prazoCor: prazo.cor,
      fatalData: visivel?.end_date ? formatarData(visivel.end_date) : "",

      // IA (pré vs pós-análise) — o resumo "O que aconteceu" foi descontinuado
      // no BE (2026-09); o pós-análise mostra só as providências.
      analisada,
      analisadaEm: i.ai_analyzed_at ? formatarData(i.ai_analyzed_at) : "",
      providencias,

      // teor completo + trilha
      teor: i.content?.trim() ?? "",
      trilha: i.history.map((h) => ({
        data: formatarData(h.occurred_at),
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
export function useIntimacaoDetalhe(
  id: string,
  opts?: {
    /** Chamado quando "Marcar como resolvida" ou "Ignorar" COMPLETA/remove a
     *  intimação da fila ativa — sinaliza ao painel contextual (Mesa) que pode
     *  avançar ao próximo item (docs/revamp-mesa-trabalho-intimacoes.md §4).
     *  Nunca em erro, nunca em "Reabrir" (desfaz um desfecho, não completa
     *  nada) nem em "Gerar peça" (navega para o editor). */
    onAcaoConcluida?: () => void;
  },
) {
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
  const tipoCatalogo = usePrazoTipos(id);
  const apurarDivergencia = useApurarDivergenciaPrazo();
  const revisao = situacaoRevisao(prazoDetalhe.prazo, i?.estado ?? "");
  const memoria = useMemo(
    () => buildMemoria(prazoDetalhe.prazo),
    [prazoDetalhe.prazo],
  );

  // A apuração (divergência) roda no slice "prazos" mas o BE mescla o
  // evento resultante na Trilha da intimação (i.history) e pode confirmar o
  // prazo — ambos lidos da query de detalhe da intimação, não da de
  // prazos. Invalida aqui (orquestrador, onde o `id` já está disponível) em vez
  // de dentro de use-apurar-divergencia-prazo, pra não acoplar esse hook
  // genérico ao query key do slice intimacoes.
  const invalidateIntimacaoDetalhe = () =>
    queryClient.invalidateQueries({ queryKey: intimacoesKeys.detail(id) });

  const apuracaoObsoleta =
    apurarDivergencia.error instanceof ApiError &&
    apurarDivergencia.error.status === 409 &&
    apurarDivergencia.lastExpectedRevision ===
      prazoDetalhe.prazo?.review_revision;
  const onErroApuracao = (error: Error, fallback: string) => {
    if (error instanceof ApiError && error.status === 409) {
      void Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: ["prazos", "detail", prazoId],
        }),
        invalidateIntimacaoDetalhe(),
      ]);
      toast.error(
        "O prazo mudou. Confira os dados atualizados antes de decidir.",
      );
      return;
    }
    toast.error(fallback);
  };

  const onAceitarDeclarado = () => {
    if (!prazoId || !prazoDetalhe.prazo || apuracaoObsoleta) return;
    apurarDivergencia.apurar(
      {
        prazoId,
        body: {
          decisao: "aceita_declarado",
          expected_revision: prazoDetalhe.prazo.review_revision,
        },
      },
      {
        onSuccess: () => {
          invalidateIntimacaoDetalhe();
          toast.success("Divergência apurada — declarado aceito.");
        },
        onError: (error) =>
          onErroApuracao(
            error,
            "Não foi possível apurar a divergência. Tente novamente.",
          ),
      },
    );
  };

  const onAceitarCalculado = () => {
    if (!prazoId || !prazoDetalhe.prazo || apuracaoObsoleta) return;
    apurarDivergencia.apurar(
      {
        prazoId,
        body: {
          decisao: "aceita_calculado",
          expected_revision: prazoDetalhe.prazo.review_revision,
        },
      },
      {
        onSuccess: () => {
          invalidateIntimacaoDetalhe();
          toast.success("Divergência apurada — calculado aceito.");
        },
        onError: (error) =>
          onErroApuracao(
            error,
            "Não foi possível apurar a divergência. Tente novamente.",
          ),
      },
    );
  };

  // Ajuste manual = escolher uma DATA FATAL específica (endDate, wire YYYY-MM-DD),
  // não mais uma quantidade de dias — o BE grava a data direto no prazo.
  const onAjusteManual = (endDate: string) => {
    if (!prazoId || !prazoDetalhe.prazo || apuracaoObsoleta) return;
    apurarDivergencia.apurar(
      {
        prazoId,
        body: {
          decisao: "ajuste_manual",
          end_date: endDate,
          expected_revision: prazoDetalhe.prazo.review_revision,
        },
      },
      {
        onSuccess: () => {
          invalidateIntimacaoDetalhe();
          toast.success("Ajuste manual registrado.");
        },
        onError: (error) =>
          onErroApuracao(
            error,
            "Não foi possível registrar o ajuste. Tente novamente.",
          ),
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
      onSuccess: () => {
        toast.success("Intimação resolvida.");
        opts?.onAcaoConcluida?.();
      },
      onError: () => toast.error("Não foi possível resolver. Tente novamente."),
    });

  const onIgnorar = () =>
    ignorar.mutate(id, {
      onSuccess: () => {
        toast.success("Intimação ignorada.");
        opts?.onAcaoConcluida?.();
      },
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
    // compartilhados do card Providências (ProvidenciasLinhaLegal/Banner, em
    // features/intimacoes) esperam o shape real do BE, não a VM derivada desta tela.
    intimacao: i,

    // IA
    analisando: analisar.isPending || query.materializandoAnalise,
    analiseErro: analisar.isError,
    analiseTimeout: query.analiseTimeout,
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
    prazoDetalhe: prazoDetalhe.prazo,
    prazoTipoLabel:
      tipoCatalogo.data?.items.find(
        (item) => item.key === prazoDetalhe.prazo?.tipo_ato,
      )?.label ?? null,
    revisao,
    recarregar: () => query.refetch(),
    recarregarPrazo: () =>
      queryClient.invalidateQueries({ queryKey: ["prazos"] }),
    onCopiarCNJ: async () => {
      try {
        await navigator.clipboard.writeText(model?.cnj ?? "");
        toast.success("Número do processo copiado.");
      } catch {
        toast.error("Não foi possível copiar o número do processo.");
      }
    },
    memoria,
    memoriaPending: !!prazoId && prazoDetalhe.isPending,
    memoriaErro: !!prazoId && prazoDetalhe.isError,
    memoriaEmVoo: apurarDivergencia.isPending,
    apuracaoErro:
      !!apurarDivergencia.error &&
      !(
        apurarDivergencia.error instanceof ApiError &&
        apurarDivergencia.error.status === 409
      ),
    apuracaoObsoleta,
    onAceitarDeclarado,
    onAceitarCalculado,
    onAjusteManual,
  };
}
