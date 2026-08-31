"use client";

import { useMemo } from "react";

import { useAndamentosDoProcesso } from "@/features/andamentos/hooks/use-andamentos-do-processo";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import {
  useIntimacoesByProcesso,
  usePrazosByProcesso,
  useTasksByProcesso,
} from "@/features/processos/hooks/use-processo-tabs";
import {
  useAssignResponsavel,
  usePartes,
  useProcesso,
  useProcessoResumo,
} from "@/features/processos/hooks/use-processos";
import type {
  Party,
  ProcessoDegree,
  ResumoAction,
  ResumoKeyDate,
  ResumoMovement,
  ResumoRisk,
} from "@/features/processos/types";
import { formatDate } from "@/lib/format";

import { iniciais } from "../lib/derivar";

// PROCESSO · HUB — cockpit do caso, agora ligado ao BACKEND REAL. O hook público
// compõe os hooks de dados reais (detalhe, resumo IA, partes, andamentos e as abas
// de referência) e expõe uma VM limpa; o componente só faz JSX + binding.

// ── Rótulos / cores (labels PT-BR) ─────────────────────────────────────────────

const DEGREE_LABEL: Record<ProcessoDegree, string> = {
  G1: "1º grau",
  G2: "2º grau",
  JE: "Juizado",
  SUPERIOR: "Superior",
  UNKNOWN: "—",
};

interface LifecycleInfo {
  label: string;
  cor: string;
}

// Situação do processo → rótulo PT-BR + cor de token. ACTIVE→verde, SUSPENDED→gold,
// ARCHIVED→fg3; demais estados caem no neutro.
function lifecycleInfo(lifecycle: string): LifecycleInfo {
  switch (lifecycle) {
    case "ACTIVE":
      return { label: "Em andamento", cor: "var(--green)" };
    case "SUSPENDED":
      return { label: "Suspenso", cor: "var(--gold)" };
    case "ARCHIVED":
      return { label: "Arquivado", cor: "var(--fg3)" };
    default:
      return { label: lifecycle || "—", cor: "var(--fg2)" };
  }
}

// Urgência do resumo IA → cor de token. OVERDUE→red, DUE_SOON→gold, OK→fg2.
function urgencyCor(urgency: ResumoKeyDate["urgency"]): string {
  switch (urgency) {
    case "OVERDUE":
      return "var(--red)";
    case "DUE_SOON":
      return "var(--gold)";
    default:
      return "var(--fg2)";
  }
}

const mix = (cor: string, pct: number) =>
  `color-mix(in oklch, ${cor} ${pct}%, transparent)`;

// Contagem regressiva curta a partir de days_left (negativo = atraso).
function prazoCurto(dias: number): string {
  if (dias < 0) return `${Math.abs(dias)}d atraso`;
  if (dias === 0) return "hoje";
  return `${dias}d`;
}

// ── Tipos da VM ────────────────────────────────────────────────────────────────

export interface TagChip {
  label: string;
  cor: string;
  fundo: string;
}

export interface IdentityVM {
  cnj: string;
  /** Título grande — a classe processual (fallback assunto/CNJ). */
  titulo: string;
  /** Assunto do processo, quando houver. */
  subject: string;
  tags: TagChip[];
  degreeLabel: string;
  lifecycleLabel: string;
  lifecycleCor: string;
  court: string;
  judgingBody: string;
  distribuido: string;
  completeness: number;
}

export interface ResponsavelVM {
  nome: string;
  iniciais: string;
  assignedUserId: string | null;
}

export interface MemberOption {
  id: string;
  name: string;
}

export interface ResumoKeyDateVM {
  kind: string;
  end: string;
  daysLabel: string;
  cor: string;
}

export interface ResumoMovementVM {
  data: string;
  texto: string;
}

export interface ResumoRiskVM {
  descricao: string;
}

export interface ResumoActionVM {
  acao: string;
}

export interface ResumoVM {
  disponivel: boolean;
  summary: string;
  currentStatus: string;
  keyDates: ResumoKeyDateVM[];
  recentMovements: ResumoMovementVM[];
  risks: ResumoRiskVM[];
  recommendedActions: ResumoActionVM[];
  isPending: boolean;
}

export interface IntimacaoItemVM {
  id: string;
  titulo: string;
  meta: string;
  prazoCurto: string | null;
  urgCor: string;
}

export interface PrazoItemVM {
  id: string;
  kind: string;
  end: string;
  prazoCurto: string;
  urgCor: string;
}

export interface TaskItemVM {
  id: string;
  titulo: string;
  status: string;
  due: string;
}

export interface ParteItemVM {
  papel: string;
  nome: string;
  proc: string;
  documento: string;
}

export interface AndamentoItemVM {
  id: string;
  data: string;
  texto: string;
}

// ── Sub-hooks privados (um por responsabilidade) ────────────────────────────────

// Detalhe + identidade do processo. Deriva os fatos-chave e as tags do ProcessoView.
function useIdentidade_private(id: string) {
  const q = useProcesso(id);
  const p = q.data;

  const identity: IdentityVM | null = useMemo(() => {
    if (!p) return null;
    const life = lifecycleInfo(p.lifecycle);
    const tags: TagChip[] = [];
    if (p.class)
      tags.push({ label: p.class, cor: "var(--fg2)", fundo: "var(--hover)" });
    if (p.court)
      tags.push({ label: p.court, cor: "var(--fg2)", fundo: "var(--hover)" });
    tags.push({
      label: life.label,
      cor: life.cor,
      fundo: mix(life.cor, 12),
    });
    return {
      cnj: p.cnj_number,
      titulo: p.class || p.subject || p.cnj_number,
      subject: p.subject,
      tags,
      degreeLabel: DEGREE_LABEL[p.degree] ?? "—",
      lifecycleLabel: life.label,
      lifecycleCor: life.cor,
      court: p.court,
      judgingBody: p.judging_body,
      distribuido: formatDate(p.filed_at),
      completeness: p.completeness,
    };
  }, [p]);

  return {
    processo: p ?? null,
    identity,
    isLoading: q.isLoading,
    isError: q.isError,
    naoEncontrado: !q.isLoading && !q.isError && !p,
  };
}

// Responsável: nome (resolvido pelo diretório quando o BE não anexou) + controle de
// atribuição (menu simples ligado à mutation e ao diretório de membros).
function useResponsavel_private(
  id: string,
  assignedUserId: string | null | undefined,
) {
  const dir = useOrgMembersDirectory();
  const assign = useAssignResponsavel(id);

  const nome =
    (assignedUserId && dir.nameFor(assignedUserId)) || "Não atribuído";

  const responsavel: ResponsavelVM = {
    nome,
    iniciais: assignedUserId ? iniciais(nome) : "—",
    assignedUserId: assignedUserId ?? null,
  };

  const members: MemberOption[] = dir.members.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  return {
    responsavel,
    members,
    assign: (userId: string | null) => assign.mutate(userId),
    isAssigning: assign.isPending,
  };
}

// Resumo IA (write-once no primeiro GET). Deriva as slices já com cor/urgência.
function useResumo_private(id: string): ResumoVM {
  const q = useProcessoResumo(id);
  const r = q.data;

  return useMemo(() => {
    const keyDates: ResumoKeyDateVM[] = (r?.key_dates_and_deadlines ?? []).map(
      (k: ResumoKeyDate) => ({
        kind: k.kind,
        end: formatDate(k.end_date),
        daysLabel: prazoCurto(k.days_remaining),
        cor: urgencyCor(k.urgency),
      }),
    );
    const recentMovements: ResumoMovementVM[] = (r?.recent_movements ?? []).map(
      (m: ResumoMovement) => ({
        data: formatDate(m.occurred_at),
        texto: m.text,
      }),
    );
    const risks: ResumoRiskVM[] = (r?.risks ?? []).map((x: ResumoRisk) => ({
      descricao: x.description,
    }));
    const recommendedActions: ResumoActionVM[] = (
      r?.recommended_actions ?? []
    ).map((a: ResumoAction) => ({ acao: a.action }));

    const disponivel = !!(
      r &&
      (r.summary ||
        keyDates.length ||
        recentMovements.length ||
        risks.length ||
        recommendedActions.length)
    );

    return {
      disponivel,
      summary: r?.summary ?? "",
      currentStatus: r?.current_status ?? "",
      keyDates,
      recentMovements,
      risks,
      recommendedActions,
      isPending: q.isPending,
    };
  }, [r, q.isPending]);
}

// Partes agrupadas por polo → lista plana pronta pra bindar (Autor/Réu/Terceiro).
function usePartes_private(id: string) {
  const q = usePartes(id);
  const data = q.data;

  const partes: ParteItemVM[] = useMemo(() => {
    if (!data) return [];
    const toItem = (papel: string) => (pt: Party) => ({
      papel,
      nome: pt.name,
      documento: pt.document ?? "",
      proc:
        pt.counsels.length > 0
          ? pt.counsels
              .map((c) => (c.oab ? `${c.name} (OAB/${c.uf} ${c.oab})` : c.name))
              .join(" · ")
          : "",
    });
    return [
      ...data.autor.map(toItem("Autor")),
      ...data.reu.map(toItem("Réu")),
      ...data.terceiros.map(toItem("Terceiro")),
    ];
  }, [data]);

  return { partes, isPending: q.isPending };
}

// Andamentos (linha do tempo DATAJUD) → itens data/texto + paginação incremental.
function useAndamentos_private(id: string) {
  const q = useAndamentosDoProcesso(id);

  const andamentos: AndamentoItemVM[] = useMemo(
    () =>
      q.andamentos.map((a) => ({
        id: a.id,
        data: formatDate(a.occurred_at),
        texto: a.text,
      })),
    [q.andamentos],
  );

  return {
    andamentos,
    total: q.totalCount,
    isPending: q.isPending,
    hasMore: q.hasNextPage,
    isLoadingMore: q.isFetchingNextPage,
    loadMore: () => q.fetchNextPage(),
  };
}

// Abas de referência: intimações, prazos e tarefas do processo.
function useReferencias_private(id: string) {
  const intimacoesQ = useIntimacoesByProcesso(id);
  const prazosQ = usePrazosByProcesso(id);
  const tasksQ = useTasksByProcesso(id);

  const intimacoes: IntimacaoItemVM[] = useMemo(
    () =>
      (intimacoesQ.data ?? []).map((i) => ({
        id: i.id,
        titulo: i.class || i.subject || i.type,
        meta: `${formatDate(i.published_at)} · ${i.court}`,
        prazoCurto: i.prazo ? prazoCurto(i.prazo.days_left) : null,
        urgCor: i.prazo
          ? i.prazo.days_left < 0
            ? "var(--red)"
            : i.prazo.days_left <= 3
              ? "var(--gold)"
              : "var(--green)"
          : "var(--fg3)",
      })),
    [intimacoesQ.data],
  );

  const prazos: PrazoItemVM[] = useMemo(
    () =>
      prazosQ.prazos.map((p) => ({
        id: p.id,
        kind: p.kind,
        end: formatDate(p.end_date),
        prazoCurto: prazoCurto(p.days_left),
        urgCor:
          p.days_left < 0
            ? "var(--red)"
            : p.days_left <= 3
              ? "var(--gold)"
              : "var(--green)",
      })),
    [prazosQ.prazos],
  );

  const tasks: TaskItemVM[] = useMemo(
    () =>
      (tasksQ.data ?? []).map((t) => ({
        id: t.id,
        titulo: t.title,
        status: t.display_status || "",
        due: formatDate(t.due_date),
      })),
    [tasksQ.data],
  );

  return {
    intimacoes,
    prazos,
    tasks,
    isPending: intimacoesQ.isPending || prazosQ.isPending || tasksQ.isPending,
  };
}

// ── Hook público — compõe os sub-hooks e monta a VM ─────────────────────────────

export function useProcessoHub(id: string) {
  const identidade = useIdentidade_private(id);
  const responsavel = useResponsavel_private(
    id,
    identidade.processo?.assigned_user_id ?? null,
  );
  const resumo = useResumo_private(id);
  const partes = usePartes_private(id);
  const andamentos = useAndamentos_private(id);
  const referencias = useReferencias_private(id);

  // O nome do responsável pode vir já anexado pelo BE (assigned_user_name); nesse
  // caso preferimos ele ao resolvido pelo diretório.
  const responsavelVM: ResponsavelVM = useMemo(() => {
    const anexado = identidade.processo?.assigned_user_name;
    if (anexado) {
      return {
        nome: anexado,
        iniciais: iniciais(anexado),
        assignedUserId: identidade.processo?.assigned_user_id ?? null,
      };
    }
    return responsavel.responsavel;
  }, [
    identidade.processo?.assigned_user_name,
    identidade.processo?.assigned_user_id,
    responsavel.responsavel,
  ]);

  return {
    isLoading: identidade.isLoading,
    isError: identidade.isError,
    naoEncontrado: identidade.naoEncontrado,

    identity: identidade.identity,

    responsavel: responsavelVM,
    members: responsavel.members,
    assign: responsavel.assign,
    isAssigning: responsavel.isAssigning,

    resumo,
    partes: partes.partes,
    partesPending: partes.isPending,

    andamentos: andamentos.andamentos,
    andamentosTotal: andamentos.total,
    andamentosPending: andamentos.isPending,
    andamentosHasMore: andamentos.hasMore,
    andamentosLoadingMore: andamentos.isLoadingMore,
    andamentosLoadMore: andamentos.loadMore,

    intimacoes: referencias.intimacoes,
    prazos: referencias.prazos,
    tasks: referencias.tasks,
    referenciasPending: referencias.isPending,

    voltarLabel: "Processos",
    voltarHref: "/processos",
  };
}
