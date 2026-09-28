"use client";

import { useMemo } from "react";

import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { ORIGEM_LABEL } from "@/features/triagem/lib/origem";

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
import { construirUrgencyTabs } from "../lib/urgencia-tabs";
import { useFilaNavigation, useFiltrosDaFila } from "./use-fila-navigation";
import { useIntimacoes } from "./use-intimacoes";

/**
 * Histórico de intimações (`/intimacoes`) — consulta/auditoria READ-ONLY de
 * TODAS as intimações que passaram pelo sistema (todos os status, escritório
 * inteiro por default — nenhum `assignee`/escopo é injetado aqui; só o que o
 * usuário filtrar explicitamente). Busca, filtros, agrupamento por processo,
 * ordenação e paginação infinita são a fonte única (docs/history-design.md);
 * a EXECUÇÃO (seleção/lote/mutação) vive só na Mesa de Trabalho.
 *
 * Sem painel/prévia: título e linha navegam pro detalhe cheio (`/intimacoes/
 * [id]`, via `fila.href`/`fila.lembrar` — preserva anterior/próxima e
 * `?retorno=` pro voltar). Não há mais wiring de painel contextual aqui: um
 * `?painel=` legado que sobreviva num link salvo fica simplesmente inerte
 * (nenhum código lê essa chave nesta tela) — não reabre preview nem entra em
 * loop de URL.
 */
export function useListagemIntimacoes() {
  const url = useFiltrosDaFila();
  const fila = useFilaNavigation();
  const members = useOrgMembersDirectory();
  const grouped = (url.get("visao") || "intimacoes") === "processos";
  const search = url.get("q");
  const origem = url.get("origem");
  const dueFrom = url.get("due_from");
  const dueTo = url.get("due_to");
  const urgency =
    url.get("urgencia") === "esta_semana" ? "semana" : url.get("urgencia");
  const sort = (url.get("sort") || "recent") as "recent" | "deadline";
  const status = url.get("situacao");
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
    workStage: url.get("work_stage"),
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
  const urgencyTabs = construirUrgencyTabs({
    buckets: query.buckets,
    totalWithoutUrgency: query.totalWithoutUrgency,
    urgency: urgency || "",
    temIntervalo: !!(dueFrom || dueTo),
    onSelecionar: (value) =>
      value ? change(filtroDeUrgencia(value)) : change(limparUrgencia),
  });
  const filters = [
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
    grouped,
    search,
    sort,
    rows,
    groups,
    open,
    toggleGroup,
    filters,
    active,
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
