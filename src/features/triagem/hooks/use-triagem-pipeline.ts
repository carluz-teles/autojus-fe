"use client";

// Hook de integração da Triagem-pipeline (Fase U-FE). É a ÚNICA cola entre o read
// model real (useIntimacoes — infinite query por cursor) e a UI da pipeline. Não
// inventa fetch: reusa useIntimacoes; não duplica mutação: reusa os hooks já
// existentes em use-intimacoes.ts (resolver, confirmar em lote, ciência em lote,
// atribuir responsável). Faz o mapeamento IntimacaoView → PipelineRow (lib/pipeline)
// e o particionamento por lifecycle/segmento CLIENT-SIDE sobre as páginas carregadas.
//
// TODO U0-followup: quando o BE expuser `?lifecycle=`, trocar o particionamento
// client-side (partitionByLifecycle) por três queries server-side (uma por lane),
// pra paginação correta em backlogs de milhares — hoje só as páginas carregadas
// entram na contagem/segmentação.

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { FilterTab } from "@/features/intimacoes/components/shared/filter-tabs";
import { useMe } from "@/features/onboarding/hooks/use-me";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";

import {
  useAssignIntimacaoResponsavelBatch,
  useConfirmarPrazosConfiaveisEmLote,
  useDarCienciaEmLote,
  useIgnorarIntimacao,
  useIntimacoes,
  useResolverIntimacao,
} from "../../intimacoes/hooks/use-intimacoes";
import { rotuloIntervalo } from "../../intimacoes/lib/intervalo-vencimento";
import type {
  IntimacaoCategoriaCoarse,
  IntimacaoView,
} from "../../intimacoes/types";
import {
  CATEGORIA_COARSE_LABEL,
  type PipelineRow,
  pipelineRow,
} from "../lib/pipeline";

export type PipelineLifecycle = "a_triar" | "em_andamento" | "concluido";
/** Segmento interno de "A triar" — os cortes transversais (excecoes/all) + segmentos. */
export type PipelineSegTab =
  "excecoes" | "all" | "trabalhar" | "ciencia" | "sem-prazo";

/** Atalhos de urgência do UrgenciaFilter (mesma semântica das tabs de Intimações). */
const URGENCIA_OPTIONS: { key: string; label: string }[] = [
  { key: "vencidos", label: "Vencidos" },
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Esta semana" },
  { key: "mes", label: "Este mês" },
];

/** Categorias coarse na ordem canônica — o facet "Categoria" do popover Filtrar. */
const CATEGORIA_ORDER: IntimacaoCategoriaCoarse[] = [
  "recurso",
  "manifestacao",
  "ciencia",
  "despacho",
  "intimacao",
  "outros",
];

export function useTriagemPipeline() {
  const me = useMe();
  const members = useOrgMembersDirectory();

  // Estado local da UI (client-side; sem URL params neste 1º incremento).
  const [tab, setTab] = useState<PipelineLifecycle>("a_triar");
  const [segment, setSegment] = useState<PipelineSegTab>("excecoes");
  const [venc, setVenc] = useState<string>(""); // "" = Todas
  const [dueFrom, setDueFrom] = useState<string>("");
  const [dueTo, setDueTo] = useState<string>("");
  // Facetas do popover "Filtrar" — mesma forma que o ListToolbar espera.
  const [respFilter, setRespFilter] = useState<string>(""); // ""|me|unassigned|<userId>
  const [categoria, setCategoria] = useState<string>(""); // ""|<IntimacaoCategoriaCoarse>
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<"confortavel" | "compacto">(
    "confortavel",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Lista real: SEM user_status/workStage/triageLane pra trazer TODAS as lanes de
  // ciclo de vida (a_triar/em_andamento/concluido) — o pipeline particiona client-
  // side. Busca server-side; ordena por prazo (o mais urgente primeiro).
  const list = useIntimacoes({
    search: query || undefined,
    sort: "deadline",
    limit: 50,
    prefetchNextPage: true,
  });

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

  const rows = useMemo(() => enriched.map(pipelineRow), [enriched]);

  // Partição por lifecycle (client-side sobre as páginas carregadas).
  const byLifecycle = useMemo(() => {
    const lanes: Record<PipelineLifecycle, PipelineRow[]> = {
      a_triar: [],
      em_andamento: [],
      concluido: [],
    };
    enriched.forEach((i, idx) => {
      const lane = (i.lifecycle as PipelineLifecycle) ?? "a_triar";
      (lanes[lane] ?? lanes.a_triar).push(rows[idx]);
    });
    return lanes;
  }, [enriched, rows]);

  const triarAll = byLifecycle.a_triar;

  const counts = {
    a_triar: triarAll.length,
    em_andamento: byLifecycle.em_andamento.length,
    concluido: byLifecycle.concluido.length,
  };

  const segCounts = useMemo(
    () => ({
      excecoes: triarAll.filter((r) => r.isExcecao).length,
      all: triarAll.length,
      trabalhar: triarAll.filter((r) => r.segment === "trabalhar").length,
      ciencia: triarAll.filter((r) => r.segment === "ciencia").length,
      "sem-prazo": triarAll.filter((r) => r.segment === "sem-prazo").length,
    }),
    [triarAll],
  );

  // Filtros client-side da fila "A triar".
  const meId = me.data?.user_id ?? null;
  const filtered = useMemo(() => {
    function passaSegmento(r: PipelineRow): boolean {
      if (segment === "all") return true;
      if (segment === "excecoes") return r.isExcecao;
      return r.segment === segment;
    }
    function passaVenc(r: PipelineRow): boolean {
      // Intervalo do calendário tem precedência sobre o atalho de urgência.
      if (dueFrom || dueTo) {
        if (!r.prazo.fatalISO) return false;
        if (dueFrom && r.prazo.fatalISO < dueFrom) return false;
        if (dueTo && r.prazo.fatalISO > dueTo) return false;
        return true;
      }
      if (!venc) return true;
      const t = r.prazo.tone;
      if (t === "sem-prazo") return false;
      if (venc === "vencidos") return t === "vencido";
      if (venc === "hoje") return r.prazo.relativo === "hoje";
      if (venc === "semana") return t === "urgente";
      if (venc === "mes") return t === "urgente" || t === "futuro";
      return true;
    }
    function passaResp(r: PipelineRow): boolean {
      if (!respFilter) return true;
      if (respFilter === "me") return r.responsavelId === meId;
      if (respFilter === "unassigned") return r.responsavelId === null;
      return r.responsavelId === respFilter;
    }
    function passaCategoria(r: PipelineRow): boolean {
      return !categoria || r.categoria === categoria;
    }
    return triarAll.filter(
      (r) =>
        passaSegmento(r) && passaVenc(r) && passaResp(r) && passaCategoria(r),
    );
  }, [triarAll, segment, venc, dueFrom, dueTo, respFilter, categoria, meId]);

  // Varredura em lote: os CONFIÁVEIS (não-exceção) do recorte atual.
  const sweepable = filtered.filter((r) => !r.isExcecao);
  const sweepKind: "ciencia" | "confirmar" | null =
    segment === "excecoes"
      ? null
      : segment === "ciencia"
        ? "ciencia"
        : "confirmar";

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
      toast.success(
        `${affected.toLocaleString("pt-BR")} ${affected === 1 ? "prazo confirmado" : "prazos confirmados"}.`,
      );
      deselecionar(ids);
    } catch {
      toast.error("Não foi possível confirmar os prazos.");
    }
  }

  async function confirmarTodosConfiaveis() {
    // sweep: sem ids = confirma TODOS os confiáveis do escritório (all: true).
    try {
      const { affected } = await confirmBatch.mutateAsync(undefined);
      toast.success(
        `${affected.toLocaleString("pt-BR")} ${affected === 1 ? "prazo confirmado" : "prazos confirmados"}.`,
      );
      setSelected(new Set());
    } catch {
      toast.error("Não foi possível confirmar os prazos em lote.");
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

  // ── Facetas do popover "Filtrar" (ListToolbar) ──────────────────────────────
  // Mesma forma que o useListagemIntimacoes monta m.filters/m.active/m.clear.
  const respOptions = [
    { value: "me", label: "Minhas" },
    { value: "unassigned", label: "Sem responsável" },
    ...memberOptions.map((m) => ({ value: m.id, label: m.nome })),
  ];
  const categoriaOptions = CATEGORIA_ORDER.map((c) => ({
    value: c,
    label: CATEGORIA_COARSE_LABEL[c],
  }));
  const filters = [
    {
      key: "assignee",
      label: "Responsável",
      value: respFilter,
      options: respOptions,
      onChange: setRespFilter,
    },
    {
      key: "categoria",
      label: "Categoria",
      value: categoria,
      options: categoriaOptions,
      onChange: setCategoria,
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
    setCategoria("");
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

  // Tabs de ciclo de vida (Tabs do DS) e de segmento (FilterTabs do DS).
  const segmentTabs: FilterTab[] = [
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
    // toolbar padrão
    filters,
    active,
    clear,
    urgencyTabs,
    urgency: venc,
    dueFrom,
    dueTo,
    setIntervalo,
    // dados por lane
    triarFiltered: filtered,
    emAndamento: byLifecycle.em_andamento,
    concluido: byLifecycle.concluido,
    // sweep
    sweepable,
    sweepKind,
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
    confirmarTodosConfiaveis,
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
