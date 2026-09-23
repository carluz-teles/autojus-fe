"use client";

// Hook de integração da Triagem-pipeline (Fase U-FE + U0 follow-up). É a ÚNICA cola
// entre o read model real (useIntimacoes — infinite query por cursor) e a UI. Não
// inventa fetch: reusa useIntimacoes/usePipelineCounts; não duplica mutação: reusa os
// hooks de use-intimacoes.ts. Agora o particionamento é SERVER-SIDE:
//   • a lista pede só a lane ativa (?lifecycle=) + o segmento de "A triar" (?segmento=/
//     ?is_excecao=), então os rows já vêm certos — sem .filter() client-side por lane;
//   • os badges de aba/segmento leem do GET /v1/intimacoes/pipeline-counts (full backlog),
//     não do comprimento da página. Os filtros COMPARTILHADOS (busca/urgência/responsável)
//     vão pros dois (lista e counts), pra concordarem.

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { FilterTab } from "@/features/intimacoes/components/shared/filter-tabs";
import { useMe } from "@/features/onboarding/hooks/use-me";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { useDebounce } from "@/lib/hooks/use-debounce";

import {
  useAssignIntimacaoResponsavelBatch,
  useConfirmarPrazosConfiaveisEmLote,
  useDarCienciaEmLote,
  useIgnorarIntimacao,
  useIntimacoes,
  usePipelineCounts,
  useResolverIntimacao,
} from "../../intimacoes/hooks/use-intimacoes";
import { rotuloIntervalo } from "../../intimacoes/lib/intervalo-vencimento";
import type { IntimacaoView } from "../../intimacoes/types";
import { type PipelineRow, pipelineRow } from "../lib/pipeline";

export type PipelineLifecycle = "a_triar" | "em_andamento" | "concluido";
/** Segmento interno de "A triar" — "all" (todos) + a PARTIÇÃO DISJUNTA (docs §4). */
export type PipelineSegTab =
  "all" | "trabalhar" | "excecoes" | "ciencia" | "sem-prazo" | "analisando";

/** Atalhos de urgência do UrgenciaFilter — valores de wire ?urgencia= do BE
 *  (closed set espelhado de URGENCIA_TABS). */
const URGENCIA_OPTIONS: { key: string; label: string }[] = [
  { key: "atraso", label: "Em atraso" },
  { key: "hoje", label: "Hoje" },
  { key: "proximos_dois_dias", label: "Próximos 2 dias" },
  { key: "semana", label: "Esta semana" },
  { key: "este_mes", label: "Este mês" },
  { key: "sem_data_definida", label: "Sem data" },
];

/** Mapa segmento (aba) → o filtro server-side ?disposicao (partição disjunta). */
function segmentoParaFiltro(segment: PipelineSegTab): { disposicao?: string } {
  switch (segment) {
    case "trabalhar":
      return { disposicao: "trabalho" };
    case "excecoes":
      return { disposicao: "excecao" };
    case "ciencia":
      return { disposicao: "ciencia" };
    case "sem-prazo":
      return { disposicao: "sem_prazo" };
    case "analisando":
      return { disposicao: "analisando" };
    case "all":
    default:
      return {};
  }
}

export function useTriagemPipeline() {
  const me = useMe();
  const members = useOrgMembersDirectory();

  // Estado local da UI (client-side; sem URL params neste 1º incremento).
  const [tab, setTab] = useState<PipelineLifecycle>("a_triar");
  // Default "all": surface o VOLUME de trabalho (QA), não o subconjunto menor (Exceções).
  const [segment, setSegment] = useState<PipelineSegTab>("all");
  const [venc, setVenc] = useState<string>(""); // "" = Todas (valor de wire ?urgencia=)
  const [dueFrom, setDueFrom] = useState<string>("");
  const [dueTo, setDueTo] = useState<string>("");
  // Faceta do popover "Filtrar" — Responsável (única suportada server-side).
  const [respFilter, setRespFilter] = useState<string>(""); // ""|me|unassigned|<userId>
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<"confortavel" | "compacto">(
    "confortavel",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const meId = me.data?.user_id ?? null;
  const debouncedQuery = useDebounce(query, 400);

  // Filtros COMPARTILHADOS (busca/urgência/responsável) — vão pra lista E pros counts,
  // pra os badges concordarem com o que a lista mostra. "me" resolve pro id interno.
  const assignee =
    respFilter === "me" ? (meId ?? undefined) : respFilter || undefined;
  const sharedFilters = {
    search: debouncedQuery || undefined,
    urgencia: dueFrom || dueTo ? undefined : venc || undefined,
    dueFrom: dueFrom || undefined,
    dueTo: dueTo || undefined,
    assignee,
  };
  // "unassigned" não é um id — o BE não tem filtro nativo. Mantemos como client-side
  // (filtra a lista carregada); os counts então não o refletem (documentado abaixo).
  const assigneeUnassigned = respFilter === "unassigned";
  const sharedForServer = {
    ...sharedFilters,
    assignee: assigneeUnassigned ? undefined : sharedFilters.assignee,
  };

  const segFiltro = segmentoParaFiltro(segment);

  // Lista real da LANE ativa: ?lifecycle=<tab> + (dentro de a_triar) ?disposicao=<segmento>.
  // O BE já devolve o conjunto certo (partição disjunta) — sem partição client-side. Por prazo.
  const list = useIntimacoes({
    ...sharedForServer,
    lifecycle: tab,
    disposicao: tab === "a_triar" ? segFiltro.disposicao : undefined,
    sort: "deadline",
    limit: 50,
    prefetchNextPage: true,
  });

  // Counts full-backlog — só os filtros compartilhados (NÃO lifecycle/segmento).
  const pipeline = usePipelineCounts({
    search: sharedForServer.search,
    urgencia: sharedForServer.urgencia,
    due_from: sharedForServer.dueFrom,
    due_to: sharedForServer.dueTo,
    assignee: sharedForServer.assignee,
  });
  const counts = {
    a_triar: pipeline.counts.a_triar,
    em_andamento: pipeline.counts.em_andamento,
    concluido: pipeline.counts.concluido,
  };
  const segCounts = {
    all: pipeline.counts.a_triar,
    trabalhar: pipeline.counts.trabalho,
    excecoes: pipeline.counts.excecao,
    ciencia: pipeline.counts.ciencia,
    "sem-prazo": pipeline.counts.sem_prazo,
    analisando: pipeline.counts.analisando,
  };

  const memberOptions = useMemo(
    () =>
      members.members.map((m) => ({
        id: m.id,
        nome: nomeExibicao(m.name, m.email),
      })),
    [members.members],
  );

  // Enriquecemos o nome do responsável (o BE já joina, mas caímos no diretório
  // quando vier só o id) — mesmo padrão do useListagemIntimacoes.
  const enriched: IntimacaoView[] = useMemo(() => {
    const byId = new Map(memberOptions.map((m) => [m.id, m.nome]));
    return list.intimacoes.map((i) => ({
      ...i,
      assignee_user_name:
        i.assignee_user_name ||
        (i.assignee_user_id ? (byId.get(i.assignee_user_id) ?? null) : null),
    }));
  }, [list.intimacoes, memberOptions]);

  // "Sem responsável" (unassigned) fica como recorte client-side sobre a lane já
  // filtrada pelo servidor (o BE não tem esse filtro nativo).
  const rows = useMemo(() => {
    const mapped = enriched.map(pipelineRow);
    return assigneeUnassigned
      ? mapped.filter((r) => r.responsavelId === null)
      : mapped;
  }, [enriched, assigneeUnassigned]);

  // A lista JÁ vem filtrada pela lane/segmento no servidor — o que está carregado é
  // exatamente o recorte a exibir.
  const filtered = rows;

  // ── Mutações reais ──────────────────────────────────────────────────────────
  const resolver = useResolverIntimacao();
  const ignorar = useIgnorarIntimacao();
  const confirmBatch = useConfirmarPrazosConfiaveisEmLote();
  const cienciaBatch = useDarCienciaEmLote();
  const assignBatch = useAssignIntimacaoResponsavelBatch();

  async function darCiencia(ids: string[]) {
    if (ids.length === 0) return;
    try {
      const n = await cienciaBatch.mutateAsync(ids);
      toast.success(
        `Ciência registrada em ${n.toLocaleString("pt-BR")} ${n === 1 ? "item" : "itens"}.`,
      );
      deselecionar(ids);
    } catch {
      toast.error("Não foi possível registrar a ciência.");
    }
  }

  async function confirmar(ids: string[]) {
    if (ids.length === 0) return;
    try {
      const { affected } = await confirmBatch.mutateAsync(ids);
      // O BE só confirma a faixa confiável (exceções/vencidos ficam de fora): affected=0 NÃO
      // é sucesso — avisa em vez de um "0 prazos confirmados" verde enganoso (QA D3).
      if (affected === 0) {
        toast.info("Nenhum prazo confiável para confirmar neste recorte.");
      } else {
        toast.success(
          `${affected.toLocaleString("pt-BR")} ${affected === 1 ? "prazo confirmado" : "prazos confirmados"}.`,
        );
      }
      deselecionar(ids);
    } catch {
      toast.error("Não foi possível confirmar os prazos.");
    }
  }

  async function descartar(id: string) {
    try {
      await ignorar.mutateAsync(id);
      toast.success("Intimação descartada.");
      deselecionar([id]);
    } catch {
      toast.error("Não foi possível descartar a intimação.");
    }
  }

  async function darCienciaUnica(id: string) {
    try {
      await resolver.mutateAsync(id);
      toast.success("Ciência registrada.");
      deselecionar([id]);
    } catch {
      toast.error("Não foi possível registrar a ciência.");
    }
  }

  async function atribuir(ids: string[], memberId: string | null) {
    if (ids.length === 0) return;
    try {
      await assignBatch.mutateAsync({ ids, assigneeUserId: memberId });
      const nome = memberId
        ? (memberOptions.find((m) => m.id === memberId)?.nome ?? "responsável")
        : null;
      toast.success(nome ? `Responsável: ${nome}.` : "Responsável removido.");
    } catch {
      toast.error("Não foi possível definir o responsável.");
    }
  }

  // ── Seleção (Gmail-style) ────────────────────────────────────────────────────
  const visibleIds = filtered.map((r) => r.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const selectedIds = visibleIds.filter((id) => selected.has(id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleSelectAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const n = new Set(prev);
        visibleIds.forEach((id) => n.delete(id));
        return n;
      }
      return new Set([...prev, ...visibleIds]);
    });
  }
  function deselecionar(ids: string[]) {
    setSelected((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => n.delete(id));
      return n;
    });
  }

  const byId = useMemo(() => {
    const map = new Map<string, PipelineRow>();
    rows.forEach((r) => map.set(r.id, r));
    return map;
  }, [rows]);

  // ── Faceta do popover "Filtrar" (ListToolbar) ───────────────────────────────
  // Só "Responsável" — é o único filtro compartilhado que o BE (lista E counts)
  // suporta. Mesma forma que o useListagemIntimacoes monta m.filters/m.active/m.clear.
  const respOptions = [
    { value: "me", label: "Minhas" },
    { value: "unassigned", label: "Sem responsável" },
    ...memberOptions.map((m) => ({ value: m.id, label: m.nome })),
  ];
  const filters = [
    {
      key: "assignee",
      label: "Responsável",
      value: respFilter,
      options: respOptions,
      onChange: setRespFilter,
    },
  ];
  const active = filters
    .filter((f) => f.value)
    .map((f) => ({
      key: f.key,
      label: `${f.label}: ${f.options.find((o) => o.value === f.value)?.label ?? f.value}`,
      remove: () => f.onChange(""),
    }));
  if (venc || dueFrom || dueTo)
    active.push({
      key: "urgencia",
      label: `Vencimento: ${
        dueFrom || dueTo
          ? rotuloIntervalo(dueFrom, dueTo)
          : (URGENCIA_OPTIONS.find((o) => o.key === venc)?.label ?? venc)
      }`,
      remove: () => limparUrgencia(),
    });

  function limparUrgencia() {
    setVenc("");
    setDueFrom("");
    setDueTo("");
  }
  function clear() {
    setRespFilter("");
    limparUrgencia();
  }
  function setIntervalo(from: string, to: string) {
    setVenc("");
    setDueFrom(from);
    setDueTo(to);
  }

  // Tabs de urgência do UrgenciaFilter (FilterTab[], como as tabs de Intimações).
  const urgencyTabs: FilterTab[] = [
    {
      key: "",
      label: "Todas",
      ativo: !venc && !dueFrom && !dueTo,
      onClick: () => limparUrgencia(),
    },
    ...URGENCIA_OPTIONS.map((o) => ({
      key: o.key,
      label: o.label,
      ativo: venc === o.key,
      onClick: () => {
        setDueFrom("");
        setDueTo("");
        setVenc(o.key);
      },
    })),
  ];

  // Tabs de segmento (FilterTabs do DS) = a PARTIÇÃO DISJUNTA de "A triar". "Tudo" é o
  // landing (volume); "Pra trabalhar" EXCLUI exceções (o bug do overlap morreu). "Analisando"
  // só aparece quando há item transiente (motor ainda classificando), pra não poluir.
  const segmentTabs: FilterTab[] = [
    {
      key: "all",
      label: "Tudo",
      count: segCounts.all,
      ativo: segment === "all",
      onClick: () => setSegment("all"),
    },
    {
      key: "trabalhar",
      label: "Pra trabalhar",
      count: segCounts.trabalhar,
      ativo: segment === "trabalhar",
      onClick: () => setSegment("trabalhar"),
    },
    {
      key: "excecoes",
      label: "Exceções",
      count: segCounts.excecoes,
      ativo: segment === "excecoes",
      onClick: () => setSegment("excecoes"),
      icon: TriangleAlert,
      emphasis: true,
    },
    {
      key: "ciencia",
      label: "Ciências",
      count: segCounts.ciencia,
      ativo: segment === "ciencia",
      onClick: () => setSegment("ciencia"),
    },
    {
      key: "sem-prazo",
      label: "Sem prazo",
      count: segCounts["sem-prazo"],
      ativo: segment === "sem-prazo",
      onClick: () => setSegment("sem-prazo"),
    },
    ...(segCounts.analisando > 0 || segment === "analisando"
      ? [
          {
            key: "analisando",
            label: "Analisando",
            count: segCounts.analisando,
            ativo: segment === "analisando",
            onClick: () => setSegment("analisando"),
          },
        ]
      : []),
  ];

  return {
    // fetch state
    isPending: list.isPending,
    isFetching: list.isFetching,
    isError: !!list.error,
    retry: list.refetch,
    hasMore: list.hasMore,
    loadingMore: list.isLoadingMore,
    loadMore: list.loadMore,
    paginationKey: list.paginationKey,
    total: list.totalCount,
    processCount: list.processCount,
    // members
    members: memberOptions,
    meId,
    // tabs / filtros (padrão ListToolbar/FilterTabs)
    tab,
    setTab,
    segment,
    segmentTabs,
    query,
    setQuery,
    density,
    setDensity,
    counts,
    segCounts,
    countsPending: pipeline.isPending,
    // toolbar padrão
    filters,
    active,
    clear,
    urgencyTabs,
    urgency: venc,
    dueFrom,
    dueTo,
    setIntervalo,
    // dados da lane ATIVA (o BE já devolve só ela) — a_triar usa triarFiltered;
    // em_andamento/concluido usam laneRows (mesma fonte, tab diferente).
    triarFiltered: filtered,
    laneRows: filtered,
    // seleção
    selected,
    selectedIds,
    allVisibleSelected,
    visibleIds,
    toggleSelect,
    toggleSelectAllVisible,
    clearSelection: () => setSelected(new Set()),
    rowById: (id: string) => byId.get(id),
    // mutações
    darCiencia,
    darCienciaUnica,
    confirmar,
    descartar,
    atribuir,
    // flags "sem endpoint real" (ver TODO na view)
    adiarDisponivel: false,
    mutating:
      resolver.isPending ||
      ignorar.isPending ||
      confirmBatch.isPending ||
      cienciaBatch.isPending ||
      assignBatch.isPending,
  };
}
