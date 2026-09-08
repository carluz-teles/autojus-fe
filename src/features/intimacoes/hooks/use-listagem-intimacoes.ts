"use client";

import { useMemo } from "react";

import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { abasVisiveis, ORIGEM_LABEL } from "@/features/triagem/lib/origem";

import {
  filtroDeIntervalo,
  filtroDeUrgencia,
  limparUrgencia,
  rotuloIntervalo,
} from "../lib/intervalo-vencimento";
import {
  ETAPA_LABEL,
  gruposIntimacoes,
  linhaIntimacao,
  SITUACAO_LABEL,
} from "../lib/listagem";
import { URGENCIA_TABS } from "../lib/urgencia-tabs";
import { useFilaNavigation, useFiltrosDaFila } from "./use-fila-navigation";
import { useIntimacoes } from "./use-intimacoes";

export const TRIAGEM_STAGES = [
  "RECEIVED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
];

export function useListagemIntimacoes(triagem: boolean) {
  const url = useFiltrosDaFila();
  const fila = useFilaNavigation();
  const members = useOrgMembersDirectory();
  const grouped =
    (url.get("visao") || (triagem ? "processos" : "intimacoes")) ===
    "processos";
  const search = url.get("q");
  const origem = url.get("origem");
  const dueFrom = url.get("due_from");
  const dueTo = url.get("due_to");
  const urgency =
    url.get("urgencia") === "esta_semana" ? "semana" : url.get("urgencia");
  const sort = (url.get("sort") || (triagem ? "deadline" : "recent")) as
    "recent" | "deadline";
  const status = triagem ? "PENDING" : url.get("situacao");
  const query = useIntimacoes({
    search,
    groupBy: grouped ? "cnj" : undefined,
    sort,
    cnj: url.get("cnj") || undefined,
    origem: origem || undefined,
    urgencia: urgency || undefined,
    dueFrom,
    dueTo,
    court: url.get("court"),
    assignee: url.get("assignee"),
    user_status: status,
    workStage: triagem ? TRIAGEM_STAGES : url.get("work_stage"),
    limit: 20,
    prefetchNextPage: true,
  });
  const change = (values: Record<string, string | null>) =>
    url.set({ ...values, abertos: null });
  const intimacoes = useMemo(() => {
    const nomes = new Map(
      members.members.map((m) => [m.id, nomeExibicao(m.name, m.email)]),
    );
    return query.intimacoes.map((i) => ({
      ...i,
      assignee_user_name:
        i.assignee_user_name ||
        (i.assignee_user_id ? nomes.get(i.assignee_user_id) : null) ||
        null,
    }));
  }, [query.intimacoes, members.members]);
  const rows = useMemo(() => intimacoes.map(linhaIntimacao), [intimacoes]);
  const groups = useMemo(
    () => gruposIntimacoes(intimacoes, query.groups),
    [intimacoes, query.groups],
  );
  const origemTabs = abasVisiveis(query.origemFacets).map((tab) => ({
    key: tab.value ?? "",
    label: tab.label,
    count: tab.count,
    ativo: (tab.value ?? "") === origem,
    onClick: () => change({ origem: tab.value, ...limparUrgencia }),
  }));
  const urgencyTabs = [
    {
      key: "",
      label: "Todas",
      count: query.totalWithoutUrgency,
      ativo: !urgency && !dueFrom && !dueTo,
      onClick: () => change(limparUrgencia),
    },
    ...URGENCIA_TABS.map((tab) => ({
      key: tab.value,
      label:
        tab.value === "semana"
          ? "Em 3–7 dias"
          : tab.value === "este_mes"
            ? "Após 7 dias, neste mês"
            : tab.label,
      count: query.buckets[tab.bucketKey],
      ativo: urgency === tab.value,
      onClick: () => change(filtroDeUrgencia(tab.value)),
    })),
    {
      key: "mais_adiante",
      label: "Após este mês",
      count: query.buckets.mais_adiante,
      ativo: urgency === "mais_adiante",
      onClick: () => change(filtroDeUrgencia("mais_adiante")),
    },
  ];
  const filters = [
    ...(!triagem
      ? [
          {
            key: "situacao",
            label: "Situação da intimação",
            options: Object.entries(SITUACAO_LABEL).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "work_stage",
            label: "Etapa do trabalho",
            options: Object.entries(ETAPA_LABEL).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]
      : []),
    {
      key: "origem",
      label: "Origem do prazo",
      options: Object.entries(ORIGEM_LABEL).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: "assignee",
      label: "Responsável",
      options: [
        { value: "me", label: "Minhas" },
        { value: "unassigned", label: "Sem responsável" },
        ...members.members.map((m) => ({
          value: m.id,
          label: nomeExibicao(m.name, m.email),
        })),
      ],
    },
    { key: "court", label: "Tribunal", options: query.filters.court ?? [] },
  ].map((f) => ({
    ...f,
    value: url.get(f.key),
    onChange: (value: string) =>
      change({
        [f.key]: value,
        ...(f.key === "origem" ? limparUrgencia : {}),
      }),
  }));
  const active = filters
    .filter((f) => f.value)
    .map((f) => ({
      key: f.key,
      label: `${f.label}: ${f.options.find((o) => o.value === f.value)?.label ?? f.value}`,
      remove: () => f.onChange(""),
    }));
  if (urgency || dueFrom || dueTo)
    active.push({
      key: "urgencia",
      label: `Vencimento: ${dueFrom || dueTo ? rotuloIntervalo(dueFrom, dueTo) : urgencyTabs.find((t) => t.key === urgency)?.label || urgency}`,
      remove: () => change(limparUrgencia),
    });
  if (url.get("cnj"))
    active.push({
      key: "cnj",
      label: `Processo: ${url.get("cnj")}`,
      remove: () => change({ cnj: null }),
    });
  const open = new Set(url.get("abertos").split(",").filter(Boolean));
  const toggleGroup = (cnj: string, expanded: boolean) => {
    if (open.has(cnj) === expanded) return;
    const next = new Set(open);
    if (expanded) next.add(cnj);
    else next.delete(cnj);
    url.set({ abertos: [...next].join(",") });
  };
  return {
    triagem,
    grouped,
    search,
    sort,
    rows,
    groups,
    open,
    toggleGroup,
    filters,
    active,
    origemTabs,
    urgencyTabs,
    urgency,
    dueFrom,
    dueTo,
    setIntervalo: (from: string, to: string) =>
      change(filtroDeIntervalo(from, to)),
    total: query.totalCount,
    processCount: query.processCount,
    isPending: query.isPending,
    updating:
      query.isSearchPending || (query.isFetching && !query.isLoadingMore),
    isError: !!query.error,
    loadMoreError: query.isFetchNextPageError,
    retry: () => query.refetch(),
    paginationKey: query.paginationKey,
    hasMore: query.hasMore,
    loadingMore: query.isLoadingMore,
    loadMore: query.loadMore,
    setSearch: (q: string) => change({ q }),
    setMode: (visao: string) => change({ visao }),
    setSort: (sort: string) => change({ sort }),
    clear: () =>
      change({
        q: null,
        origem: null,
        ...limparUrgencia,
        court: null,
        assignee: null,
        situacao: null,
        work_stage: null,
        cnj: null,
      }),
    href: fila.href,
    remember: () => fila.lembrar(query.intimacoes),
    contextoHref: (cnj: string) =>
      `/intimacoes?cnj=${encodeURIComponent(cnj)}&visao=intimacoes`,
  };
}
