"use client";

import { useSearchParams } from "next/navigation";

import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { useProcessos } from "@/features/processos/hooks/use-processos";
import {
  DEGREE_LABEL,
  lifecycleInfo,
  linhaProcesso,
} from "@/features/processos/lib/apresentacao";
import type { ProcessoDegree } from "@/features/processos/types";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";

export function useAcervoProcessos() {
  const url = useUrlFilters();
  const directory = useOrgMembersDirectory();
  const params = useSearchParams();
  const lifecycle = url.get("lifecycle") || "ALL";
  const query = useProcessos({
    search: url.get("q"),
    lifecycle,
    court: url.get("court"),
    degree: url.get("degree"),
    assignee: url.get("assignee"),
  });
  const situationKeys = ["ALL", "ACTIVE", "SUSPENDED", "ARCHIVED", "UNKNOWN"];
  // Preserve existing deep links into replaced records without presenting them as a normal queue.
  if (lifecycle === "SUPERSEDED") situationKeys.push("SUPERSEDED");
  const tabs = situationKeys.map((value) => ({
    key: value,
    label: lifecycleInfo(value).label,
    ativo: lifecycle === value,
    onClick: () => url.set({ lifecycle: value }),
  }));
  const filters = [
    {
      key: "lifecycle",
      label: "Situação",
      options: situationKeys
        .filter((key) => key !== "ALL")
        .map((value) => ({ value, label: lifecycleInfo(value).label })),
    },
    { key: "court", label: "Tribunal", options: query.filters.court ?? [] },
    {
      key: "degree",
      label: "Grau",
      options: (query.filters.degree ?? []).map((o) => ({
        ...o,
        label:
          DEGREE_LABEL[o.value as ProcessoDegree] === "—"
            ? "Não informado"
            : (DEGREE_LABEL[o.value as ProcessoDegree] ?? o.label),
      })),
    },
    {
      key: "assignee",
      label: "Responsável",
      options: [
        { value: "unassigned", label: "Sem responsável" },
        ...(query.filters.assignee ?? []),
      ],
    },
  ].map((f) => ({
    ...f,
    value: f.key === "lifecycle" && lifecycle === "ALL" ? "" : url.get(f.key),
    onChange: (v: string) => url.set({ [f.key]: v }),
  }));
  const active = filters
    .filter((f) => f.value)
    .map((f) => ({
      key: f.key,
      label: `${f.label}: ${f.options.find((o) => o.value === f.value)?.label ?? f.value}`,
      remove: () => f.onChange(""),
    }));
  const count = query.totalCount;
  const retorno = `/processos${params.size ? `?${params}` : ""}`;
  const updating =
    query.isSearchPending || (query.isFetching && !query.isLoadingMore);
  return {
    rows: query.processos.map((p) => ({
      ...linhaProcesso({
        ...p,
        assigned_user_name:
          p.assigned_user_name || directory.nameFor(p.assigned_user_id),
      }),
      href: `/processos/${p.id}?retorno=${encodeURIComponent(retorno)}`,
    })),
    search: url.get("q"),
    setSearch: (q: string) => url.set({ q }),
    tabs,
    filters,
    active,
    totalLabel: `${count.toLocaleString("pt-BR")} ${count === 1 ? "processo" : "processos"}`,
    statusLabel: `Exibindo ${query.processos.length} de ${count.toLocaleString("pt-BR")} ${count === 1 ? "processo" : "processos"} · ordenados pelo CNJ`,
    isLoading: query.isPending,
    updating,
    isError: !!query.error,
    loadMoreError: query.isFetchNextPageError,
    retry: () => query.refetch(),
    paginationKey: query.paginationKey,
    hasMore: query.hasMore,
    isLoadingMore: query.isLoadingMore,
    loadMore: query.loadMore,
    clear: () =>
      url.set({
        q: null,
        court: null,
        degree: null,
        assignee: null,
        lifecycle: null,
      }),
  };
}
