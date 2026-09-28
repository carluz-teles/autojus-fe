"use client";

// Hook de integração da Triagem-pipeline (Fase U-FE + revamp-mesa-trabalho-intimacoes:
// UMA dimensão de abas). É a ÚNICA cola entre o read model real (useIntimacoes —
// infinite query por cursor) e a UI. Não inventa fetch: reusa useIntimacoes/
// usePipelineCounts; não duplica mutação: reusa os hooks de use-intimacoes.ts.
//
// EIXOS (docs/navigation-architecture.md §4 — CONTRATO ROOT):
//   • Abas primárias (disposição, `?disposicao=`): Todas · Trabalho · Ciência ·
//     Exceções. Independentes do lifecycle — o BE filtra `disposicao` para
//     QUALQUER lifecycle (read.sql:296-310), não só a_triar.
//   • Status (secundário, `?status=`, NativeSelect): Abertas (DEFAULT, união
//     a_triar+em_andamento) · A decidir · Em andamento · Encerradas · Todas.
//   • Refinar (`?refine=`, só dentro de "Todas"): Analisando · Sem prazo — os
//     antigos segmentos transientes/residuais, agora um filtro secundário em vez
//     de 2ª barra de abas.
//
// CONTRATO BE (mesma entrega, a89a4e): `?lifecycle=abertas` é aceito pelo servidor
// como união a_triar+em_andamento numa query só — UMA lista, UM cursor, sort e
// paginação de servidor preservados (nunca concat client-side de duas páginas, que
// quebraria a paginação global). `TriagemBucketCounts.by_lifecycle` é a matriz
// disposição×lifecycle que alimenta os badges das 4 abas sob QUALQUER status.
// Enquanto a matriz não chegar (rollout em andamento), os badges de disposição
// ficam em loading/sem número — nunca inferidos dos 8 campos legados (que só
// cobrem a_triar) nem consultados via fan-out de queries dedicadas.

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useCaptures } from "@/features/captures/hooks/use-captures";
import { useMe } from "@/features/onboarding/hooks/use-me";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { useDebounce } from "@/lib/hooks/use-debounce";

import { useFiltrosDaFila } from "../../intimacoes/hooks/use-fila-navigation";
import {
  useAssignIntimacaoResponsavelBatch,
  useDarCienciaEmLote,
  useIgnorarIntimacao,
  useIntimacoes,
  usePipelineCounts,
  useResolverIntimacao,
} from "../../intimacoes/hooks/use-intimacoes";
import { usePainelDetalhe } from "../../intimacoes/hooks/use-painel-detalhe";
import { resumoLote } from "../../intimacoes/lib/batch-result";
import { rotuloIntervalo } from "../../intimacoes/lib/intervalo-vencimento";
import { vizinhosNaLista } from "../../intimacoes/lib/navegacao-sequencial";
import {
  construirUrgencyTabs,
  rotuloUrgencia,
} from "../../intimacoes/lib/urgencia-tabs";
import type { IntimacaoView } from "../../intimacoes/types";
import { resolverAssigneeScope } from "../lib/assignee-scope";
import { type PipelineRow, pipelineRow } from "../lib/pipeline";
import { useCapturaBoundedRefetch } from "./use-captura-bounded-refetch";

/** Status (eixo secundário, lifecycle) — NativeSelect. "abertas" é o DEFAULT (união
 *  a_triar+em_andamento); "todas" ignora lifecycle por completo. */
export type PipelineStatus =
  "abertas" | "a_decidir" | "em_andamento" | "encerradas" | "todas";

/** Aba primária (eixo disposição) — "" = Todas. */
export type PipelineDispTab = "" | "trabalho" | "ciencia" | "excecao";

/** Refinamento secundário, só ativo dentro de "Todas" (disposição=""). */
export type PipelineRefine = "" | "analisando" | "sem_prazo";

const STATUSES: PipelineStatus[] = [
  "abertas",
  "a_decidir",
  "em_andamento",
  "encerradas",
  "todas",
];
// `url.get()` devolve "" tanto pra chave ausente quanto (hipoteticamente)
// presente-e-vazia — por isso os conjuntos abaixo NÃO incluem "": incluí-la
// faria uma chave AUSENTE passar no `.includes()` e nunca cair no fallback
// legado. O gate de precedência (resolveDispTabERefine) usa estes dois — só
// uma chave nova EXPLICITAMENTE preenchida (não-vazia) prevalece sobre o legado.
const NON_EMPTY_DISP_TABS: PipelineDispTab[] = [
  "trabalho",
  "ciencia",
  "excecao",
];
const NON_EMPTY_REFINES: PipelineRefine[] = ["analisando", "sem_prazo"];

/** Status (wire) → lifecycle enviado ao BE. "abertas" e "todas" são valores de
 *  wire que o SERVIDOR resolve (união/ausência de filtro) — nunca combinados
 *  client-side. */
export const STATUS_LIFECYCLE_WIRE: Record<PipelineStatus, string> = {
  abertas: "abertas",
  a_decidir: "a_triar",
  em_andamento: "em_andamento",
  encerradas: "concluido",
  todas: "",
};

type TriagemLane = "a_triar" | "em_andamento" | "concluido";
type TriagemLaneCell = {
  total: number;
  analisando: number;
  trabalho: number;
  excecao: number;
  ciencia: number;
  sem_prazo: number;
};
type TriagemMatrix = Record<TriagemLane, TriagemLaneCell>;

/** Status → quais lanes da matriz `by_lifecycle` somar para o badge daquele
 *  status ("abertas" soma a_triar+em_andamento; "todas" soma as 3). */
export const LANES_DO_STATUS: Record<PipelineStatus, TriagemLane[]> = {
  abertas: ["a_triar", "em_andamento"],
  a_decidir: ["a_triar"],
  em_andamento: ["em_andamento"],
  encerradas: ["concluido"],
  todas: ["a_triar", "em_andamento", "concluido"],
};

/** Soma a célula (disposição, ou "total" p/ a aba "Todas") da matriz sobre as
 *  lanes do status — fonte ÚNICA dos badges de disposição/refinar sob qualquer
 *  status. `matrix` ausente (rollout do BE ainda não chegou) → undefined
 *  (loading/sem número); NUNCA inferido dos campos legados nem da página. */
export function somaMatrizPorStatus(
  matrix: TriagemMatrix | undefined,
  status: PipelineStatus,
  campo: keyof TriagemLaneCell,
): number | undefined {
  if (!matrix) return undefined;
  return LANES_DO_STATUS[status].reduce(
    (acc, lane) => acc + matrix[lane][campo],
    0,
  );
}

/** Legado ?tab= (lifecycle-como-aba) → ?status= novo. Compat de deep-link. */
export function statusFromLegacyTab(tab: string): PipelineStatus | null {
  switch (tab) {
    case "a_triar":
      return "a_decidir";
    case "em_andamento":
      return "em_andamento";
    case "concluido":
      return "encerradas";
    default:
      return null;
  }
}

/** Legado ?segmento= (partição disjunta como filtro dentro de a_triar) →
 *  {dispTab, refine} novos. Só fazia sentido com tab=a_triar (status=a_decidir). */
export function dispRefineFromLegacySegmento(
  segmento: string,
): { dispTab: PipelineDispTab; refine: PipelineRefine } | null {
  switch (segmento) {
    case "all":
      return { dispTab: "", refine: "" };
    case "trabalhar":
      return { dispTab: "trabalho", refine: "" };
    case "excecoes":
      return { dispTab: "excecao", refine: "" };
    case "ciencia":
      return { dispTab: "ciencia", refine: "" };
    case "sem-prazo":
      return { dispTab: "", refine: "sem_prazo" };
    case "analisando":
      return { dispTab: "", refine: "analisando" };
    default:
      return null;
  }
}

/**
 * Resolve {dispTab, refine} com a precedência correta entre chaves novas
 * (`?disposicao=`/`?refine=`) e o legado (`?tab=`+`?segmento=`):
 *   1. `disposicao` EXPLICITAMENTE preenchida (não-vazia) prevalece sempre.
 *   2. senão, `refine` explicitamente preenchida prevalece.
 *   3. senão, cai no legado — MAS só se `segmento` fazia sentido na URL antiga:
 *      o dropdown "Fila" só existia dentro de `tab=a_triar` (old default = "" =
 *      a_triar); se `tab` antigo apontava pra `em_andamento`/`concluido`, o
 *      `segmento` era IGNORADO pela lista mesmo que persistisse na URL (old
 *      `useTriagemPipeline`: `disposicao: tab === "a_triar" ? ... : undefined`)
 *      — não ressuscitar esse filtro stale fora do escopo em que ele valia.
 *   4. senão, "Todas" sem refinamento (default).
 * Pura e testável sem harness de URLSearchParams/React.
 */
export function resolveDispTabERefine(params: {
  dispFromUrl: string;
  refineFromUrl: string;
  legacyTab: string;
  legacySegmento: string;
}): { dispTab: PipelineDispTab; refine: PipelineRefine } {
  const { dispFromUrl, refineFromUrl, legacyTab, legacySegmento } = params;
  if (NON_EMPTY_DISP_TABS.includes(dispFromUrl as PipelineDispTab)) {
    return { dispTab: dispFromUrl as PipelineDispTab, refine: "" };
  }
  if (NON_EMPTY_REFINES.includes(refineFromUrl as PipelineRefine)) {
    return { dispTab: "", refine: refineFromUrl as PipelineRefine };
  }
  const segmentoValiaNaUrlAntiga = legacyTab === "" || legacyTab === "a_triar";
  if (segmentoValiaNaUrlAntiga && legacySegmento) {
    const legacy = dispRefineFromLegacySegmento(legacySegmento);
    if (legacy) return legacy;
  }
  return { dispTab: "", refine: "" };
}

/**
 * S2 — sinal REAL de captura em andamento (mesmo campo que já dirige o poll
 * bounded de `useCaptures`, nunca um estado inventado). Pura e testável sem
 * harness de React Query: activation (alguma run "Em andamento") e terminal
 * (nenhuma) são o mesmo predicado, então ligar/desligar é sempre coerente —
 * não há um caminho de "ligado" sem nenhuma run ativa nem vice-versa.
 */
export function capturaEmAndamento(
  runs: { display_status: string }[] | undefined,
): boolean {
  return (runs ?? []).some((r) => r.display_status === "Em andamento");
}

export function useTriagemPipeline() {
  const me = useMe();
  const members = useOrgMembersDirectory();
  const painel = usePainelDetalhe();
  // URL-backed (mesmo helper do histórico de Intimações — useFiltrosDaFila):
  // sobrevive a reload/back/forward/reload e é compartilhável. "Abrir na Mesa"
  // (modo consulta do detalhe) já leva a ?tab=<lifecycle>&painel=<id>, e agora
  // o restante dos filtros (segmento/busca/urgência/responsável/densidade)
  // também persiste, em vez de reiniciar no default a cada navegação.
  const url = useFiltrosDaFila();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Qualquer mudança de FILTRO (não de exibição) reinicia cursor (automático —
  // o queryKey muda) e seleção (docs: "reset cursor/selection com mudança de
  // filtro"). `density` é display puro e não passa por aqui.
  function change(values: Record<string, string | null>) {
    url.set(values);
    setSelected(new Set());
  }

  // ── Status (lifecycle) — com compat do legado ?tab= ─────────────────────────
  const statusFromUrl = url.get("status");
  const legacyTab = url.get("tab");
  const status: PipelineStatus = STATUSES.includes(
    statusFromUrl as PipelineStatus,
  )
    ? (statusFromUrl as PipelineStatus)
    : (statusFromLegacyTab(legacyTab) ?? "abertas");
  function setStatus(next: PipelineStatus) {
    change({
      status: next === "abertas" ? null : next,
      tab: null, // grava só a chave nova; a leitura acima cobre o link antigo já salvo
      // Sai de Encerradas → o sub-recorte "Prazo vencido" não se aplica mais.
      ...(next !== "encerradas" ? { vencidas: null } : {}),
    });
  }

  // ── Disposição (tabs primárias) + Refinar — com compat do legado ?segmento= ──
  const dispFromUrl = url.get("disposicao");
  const refineFromUrl = url.get("refine");
  const legacySegmento = url.get("segmento");
  const { dispTab, refine } = resolveDispTabERefine({
    dispFromUrl,
    refineFromUrl,
    legacyTab,
    legacySegmento,
  });
  function setDispTab(next: PipelineDispTab) {
    change({
      disposicao: next === "" ? null : next,
      refine: null, // uma aba real (Trabalho/Ciência/Exceções) limpa o refinamento
      segmento: null,
    });
  }
  function setRefine(next: PipelineRefine) {
    change({ refine: next === "" ? null : next, segmento: null });
  }
  // Wire real enviado ao BE: a aba OU o refinamento (dentro de "Todas") — nunca os dois.
  const wireDisposicao = dispTab || refine || undefined;

  // Recorte "Prazo vencido" — escopo PRÓPRIO dentro de Encerradas (docs/revamp-mesa-
  // trabalho-intimacoes.md §4): nunca infla os contadores de outro status. O RECORTE
  // em si é sempre um filtro real do servidor (workStage), nunca um .filter() sobre a
  // página já carregada. Limpa a aba de disposição (o atalho não é restrito por ela).
  const soVencidas = url.get("vencidas") === "1";

  const venc = url.get("urgencia"); // "" = Todas (valor de wire ?urgencia=)
  const dueFrom = url.get("due_from");
  const dueTo = url.get("due_to");
  function limparUrgencia() {
    change({ urgencia: null, due_from: null, due_to: null });
  }
  function setIntervalo(from: string, to: string) {
    change({ urgencia: null, due_from: from || null, due_to: to || null });
  }

  // "Minha visão" — eixo de responsável (docs/revamp-mesa-trabalho-intimacoes.md §8).
  const respFilter = url.get("visao") || "minha_visao";
  function setVisao(next: string) {
    change({ visao: next === "minha_visao" ? null : next });
  }

  const query = url.get("q");
  function setQuery(next: string) {
    change({ q: next || null });
  }

  // Densidade é exibição pura — persiste na URL (reload/back preservam), mas
  // NÃO reinicia seleção/cursor (não filtra dados).
  const density: "confortavel" | "compacto" =
    url.get("densidade") === "compacto" ? "compacto" : "confortavel";
  function setDensity(next: "confortavel" | "compacto") {
    url.set({ densidade: next === "confortavel" ? null : next });
  }

  function consultarVencidas() {
    // Escopo próprio: nunca restrito pela aba de disposição ativa (§4 do contrato).
    change({
      status: "encerradas",
      vencidas: "1",
      disposicao: null,
      refine: null,
      segmento: null,
    });
  }
  function limparVencidas() {
    change({ vencidas: null });
  }

  const meId = me.data?.user_id ?? null;
  // Input segue a URL a cada tecla (sensação instantânea); só a REQUISIÇÃO
  // debounça — mesma fonte do histórico de Intimações (useDebounce).
  const debouncedQuery = useDebounce(query, 400);

  // Filtros COMPARTILHADOS (busca/urgência/responsável) — vão pra lista E pros counts,
  // pra os badges concordarem com o que a lista mostra.
  const { assignee, assigneeScope } = resolverAssigneeScope(respFilter);
  const sharedForServer = {
    search: debouncedQuery || undefined,
    urgencia: dueFrom || dueTo ? undefined : venc || undefined,
    dueFrom: dueFrom || undefined,
    dueTo: dueTo || undefined,
    assignee,
    assigneeScope,
  };

  // S2 (docs/qa-remediation-evidence/fe-operations-architecture.md): sinal REAL
  // de captura em andamento — reusa `useCaptures` (já existe, já poll bounded
  // sozinho enquanto alguma run está "Em andamento"; mesma queryKey/cache
  // compartilhada com a tela Capturas, sem 2ª rede). Enquanto uma captura real
  // está rodando, lista E badges da Mesa reabrem via refetch bounded; ao
  // concluir, `importActive` cai e o refetch desliga sozinho (auto-off real,
  // sem subsistema novo, sem polling permanente).
  const capturas = useCaptures();
  const importActive = capturaEmAndamento(capturas.data?.runs);
  const IMPORT_REFETCH_MS = 4_000;
  // Teto de duração do poll bounded (stall guard) — se uma captura ficar
  // "Em andamento" por mais que isto, o refetch desliga mesmo assim (nunca
  // um polling permanente por um run travado). 10min: alto o bastante pra
  // não cortar uma captura real em andamento, baixo o bastante pra nunca
  // ficar pra sempre.
  const IMPORT_MAX_POLL_MS = 10 * 60 * 1000;
  // Refetch FINAL único na transição running→terminal (ver
  // use-captura-bounded-refetch.ts) — indireção por ref porque `list`/
  // `pipeline` ainda não existem neste ponto do corpo da função; o ref é
  // atualizado logo abaixo, sempre ANTES do efeito que o consome disparar
  // (efeitos só rodam após o commit do render inteiro).
  const refetchNaTransicaoRef = useRef<() => void>(() => {});
  const { pollIntervalMs } = useCapturaBoundedRefetch(
    importActive,
    IMPORT_REFETCH_MS,
    IMPORT_MAX_POLL_MS,
    () => refetchNaTransicaoRef.current(),
  );

  // Lista real do STATUS ativo (uma lane só, sort e paginação de SERVIDOR
  // preservados) — "abertas" e "todas" são valores de wire que o BE resolve
  // (união/sem filtro), nunca uma composição client-side de duas páginas.
  const list = useIntimacoes({
    ...sharedForServer,
    lifecycle: STATUS_LIFECYCLE_WIRE[status],
    disposicao: wireDisposicao,
    workStage: status === "encerradas" && soVencidas ? "VENCIDA" : undefined,
    sort: "deadline",
    limit: 50,
    prefetchNextPage: true,
    refetchIntervalMs: pollIntervalMs,
  });

  // Counts full-backlog — só os filtros compartilhados (NÃO lifecycle/disposição).
  const pipeline = usePipelineCounts(
    {
      search: sharedForServer.search,
      urgencia: sharedForServer.urgencia,
      due_from: sharedForServer.dueFrom,
      due_to: sharedForServer.dueTo,
      assignee: sharedForServer.assignee,
      assignee_scope: sharedForServer.assigneeScope,
    },
    true,
    pollIntervalMs,
  );

  // Sempre a versão mais recente de list/pipeline — a transição running→terminal
  // pode disparar em QUALQUER render; nunca uma referência velha (stale closure).
  // Escrita de ref só é permitida FORA do render (react-hooks/refs) — daí o efeito.
  useEffect(() => {
    refetchNaTransicaoRef.current = () => {
      void list.refetch();
      void pipeline.refetch();
    };
  });

  // "Prazo vencido" — contagem de ESCOPO PRÓPRIO (não soma em counts.*), requisição
  // real dedicada (lifecycle=concluido + work_stage=VENCIDA), não .filter().length.
  const vencidaCount = useIntimacoes({
    ...sharedForServer,
    lifecycle: "concluido",
    workStage: "VENCIDA",
    limit: 1,
  });

  // ── Badges (Todas/Trabalho/Ciência/Exceções + Refinar) — SEMPRE da matriz
  // `by_lifecycle` (aditiva, mesma entrega BE). Ausente = loading/sem número em
  // TODOS os status: nunca inferido dos 8 campos legados nem consultado via
  // fan-out de queries dedicadas (o rollout da matriz é a fonte única aqui). ──
  const matrix = pipeline.counts.by_lifecycle;

  const tabCounts: Record<PipelineDispTab, number | undefined> = {
    "": somaMatrizPorStatus(matrix, status, "total"),
    trabalho: somaMatrizPorStatus(matrix, status, "trabalho"),
    ciencia: somaMatrizPorStatus(matrix, status, "ciencia"),
    excecao: somaMatrizPorStatus(matrix, status, "excecao"),
  };

  // "Refinar" (Analisando/Sem prazo) — mesma matriz, mesmas lanes do status ativo.
  const refineCounts = {
    analisando: somaMatrizPorStatus(matrix, status, "analisando") ?? 0,
    sem_prazo: somaMatrizPorStatus(matrix, status, "sem_prazo") ?? 0,
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

  const rows = useMemo(() => enriched.map(pipelineRow), [enriched]);

  // A lista JÁ vem filtrada pela lane/disposição no servidor — o que está carregado é
  // exatamente o recorte a exibir.
  const filtered = rows;
  // Elegibilidade de triagem (checkbox/bulk/RowTriar) é POR ITEM em views mistas
  // (Abertas/Todas combinam lifecycles): só a_triar é mutável/selecionável.
  const triagemEligibleIds = useMemo(
    () => filtered.filter((r) => r.lifecycle === "a_triar").map((r) => r.id),
    [filtered],
  );

  // Navegação sequencial do painel contextual — sobre a MESMA lane/recorte visível
  // (docs/revamp-mesa-trabalho-intimacoes.md §4), não uma fila separada.
  const { anterior: painelAnterior, proxima: painelProxima } = vizinhosNaLista(
    filtered,
    painel.id,
  );

  // ── Mutações reais ──────────────────────────────────────────────────────────
  const resolver = useResolverIntimacao();
  const ignorar = useIgnorarIntimacao();
  const cienciaBatch = useDarCienciaEmLote();
  const assignBatch = useAssignIntimacaoResponsavelBatch();
  const bulkInFlight = useRef(false);
  const mutating =
    resolver.isPending ||
    ignorar.isPending ||
    cienciaBatch.isPending ||
    assignBatch.isPending;

  // Fluxo sequencial (docs §4): após sucesso de uma ação elegível sobre o item
  // ABERTO no painel, segue ao próximo (ou fecha, se não houver) — sem retornar
  // ao início da lista nem perder o recorte/posição.
  function avancarSePainelAberto(ids: string[]) {
    if (!painel.id || !ids.includes(painel.id)) return;
    if (painelProxima) painel.abrir(painelProxima.id);
    else painel.fechar();
  }

  // Sinal do PRÓPRIO painel (Dar ciência/Resolver/Ignorar disparados de dentro
  // do detalhe, não da linha) — mesmo avanço, para o item atualmente aberto.
  // Nunca chamado por "Gerar peça" (preserva sua navegação para o editor).
  function avancarPainelAtual() {
    if (!painel.id) return;
    avancarSePainelAberto([painel.id]);
  }

  async function darCiencia(ids: string[]) {
    if (ids.length === 0 || bulkInFlight.current || mutating) return;
    bulkInFlight.current = true;
    try {
      const result = await cienciaBatch.mutateAsync(ids);
      // Fan-out por id (sem endpoint em lote no BE) — erro parcial é recuperável:
      // só o que teve sucesso sai da seleção; o que falhou PERMANECE selecionado
      // (nunca removido) para nova tentativa.
      const { mensagens } = resumoLote(result, {
        singular: "item",
        plural: "itens",
      });
      for (const m of mensagens) {
        if (m.tom === "success")
          toast.success(`Ciência registrada em ${m.texto}`);
        else toast.error(m.texto);
      }
      deselecionar(result.succeeded);
      avancarSePainelAberto(result.succeeded);
    } catch {
      toast.error("Não foi possível registrar a ciência.");
    } finally {
      bulkInFlight.current = false;
    }
  }

  async function descartar(id: string) {
    try {
      await ignorar.mutateAsync(id);
      toast.success("Intimação descartada.");
      deselecionar([id]);
      avancarSePainelAberto([id]);
    } catch {
      toast.error("Não foi possível descartar a intimação.");
    }
  }

  async function darCienciaUnica(id: string) {
    try {
      await resolver.mutateAsync(id);
      toast.success("Ciência registrada.");
      deselecionar([id]);
      avancarSePainelAberto([id]);
    } catch {
      toast.error("Não foi possível registrar a ciência.");
    }
  }

  async function atribuir(ids: string[], memberId: string | null) {
    if (ids.length === 0 || bulkInFlight.current || mutating) return;
    bulkInFlight.current = true;
    try {
      const result = await assignBatch.mutateAsync({
        ids,
        assigneeUserId: memberId,
      });
      const nome = memberId
        ? (memberOptions.find((m) => m.id === memberId)?.nome ?? "responsável")
        : null;
      const rotulo = nome ? `Responsável: ${nome}` : "Responsável removido";
      // Fan-out por id — erro parcial é recuperável: o item que falhou permanece
      // selecionado (nunca removido da seleção) para nova tentativa. Atribuir não
      // retira o item da vista, então a seleção em si não muda no sucesso —
      // preserva o encadeamento de ações (ex.: atribuir e então dar ciência).
      if (result.succeeded.length > 0) toast.success(`${rotulo}.`);
      if (result.failed.length > 0) {
        const n = result.failed.length;
        toast.error(
          `${n.toLocaleString("pt-BR")} ${n === 1 ? "item" : "itens"} — falha ao definir responsável; ${n === 1 ? "permanece selecionado" : "permanecem selecionados"} para nova tentativa.`,
        );
      }
    } catch {
      toast.error("Não foi possível definir o responsável.");
    } finally {
      bulkInFlight.current = false;
    }
  }

  // ── Seleção (Gmail-style) — restrita aos itens ELEGÍVEIS (a_triar) em views mistas ──
  const allVisibleSelected =
    triagemEligibleIds.length > 0 &&
    triagemEligibleIds.every((id) => selected.has(id));
  const selectedIds = triagemEligibleIds.filter((id) => selected.has(id));

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
        triagemEligibleIds.forEach((id) => n.delete(id));
        return n;
      }
      return new Set([...prev, ...triagemEligibleIds]);
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

  // ── "Minha visão" (docs §8) — controle DEDICADO no toolbar, fora do popover
  // "Filtrar" (que na Mesa não sobra nenhuma outra faceta). Default: minha_visao
  // (mine_or_unassigned). "todos" = Todo o escritório (conforme permissões) — um
  // sentinela NÃO-vazio (string vazia colidiria com "ausente" no useUrlFilters).
  const visaoOptions = [
    { value: "minha_visao", label: "Minha visão" },
    { value: "mine", label: "Minhas" },
    { value: "unassigned", label: "Sem responsável" },
    { value: "todos", label: "Todo o escritório" },
    ...memberOptions.map((m) => ({ value: m.id, label: m.nome })),
  ];
  // NativeSelect de status — Abertas (default) primeiro, depois o detalhamento.
  const statusOptions: { value: PipelineStatus; label: string }[] = [
    { value: "abertas", label: "Abertas" },
    { value: "a_decidir", label: "A decidir" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "encerradas", label: "Encerradas" },
    { value: "todas", label: "Todas" },
  ];
  // "Refinar" — só ofertado quando há volume (item transiente/residual existe) ou já
  // está ativo (não desaparece debaixo do usuário ao navegar).
  const refineOptions: {
    value: PipelineRefine;
    label: string;
    count: number;
  }[] = [
    { value: "", label: "Tudo", count: 0 },
    ...(refineCounts.analisando > 0 || refine === "analisando"
      ? [
          {
            value: "analisando" as PipelineRefine,
            label: "Analisando",
            count: refineCounts.analisando,
          },
        ]
      : []),
    ...(refineCounts.sem_prazo > 0 || refine === "sem_prazo"
      ? [
          {
            value: "sem_prazo" as PipelineRefine,
            label: "Sem prazo",
            count: refineCounts.sem_prazo,
          },
        ]
      : []),
  ];
  // Filtrar popover: nenhuma faceta própria na Mesa (responsável virou "Minha visão").
  const filters: {
    key: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }[] = [];
  const activeFilters: { key: string; label: string; remove: () => void }[] =
    [];
  if (venc || dueFrom || dueTo)
    activeFilters.push({
      key: "urgencia",
      label: `Vencimento: ${
        dueFrom || dueTo
          ? rotuloIntervalo(dueFrom, dueTo)
          : rotuloUrgencia(venc)
      }`,
      remove: () => limparUrgencia(),
    });
  if (refine)
    activeFilters.push({
      key: "refine",
      label: `Refinar: ${refine === "analisando" ? "Analisando" : "Sem prazo"}`,
      remove: () => setRefine(""),
    });

  // "Limpar todos os filtros" (ListToolbar.onClear) — zera os filtros da toolbar,
  // preserva a aba de disposição e o status ativos (não são "filtro" no popover, são
  // navegação). O recorte "Prazo vencido" NÃO entra aqui: escopo próprio (só em
  // Encerradas) com clear dedicado ("Ver todas as encerradas").
  function clear() {
    change({
      refine: null,
      visao: null,
      urgencia: null,
      due_from: null,
      due_to: null,
    });
  }

  // Tabs de urgência do UrgenciaFilter — MESMA fonte canônica do histórico de
  // Intimações (construirUrgencyTabs): rótulos honestos dos buckets disjuntos +
  // contagens REAIS do servidor (list.buckets / totalWithoutUrgency, não a página).
  const urgencyTabs = construirUrgencyTabs({
    buckets: list.buckets,
    totalWithoutUrgency: list.totalWithoutUrgency,
    urgency: venc || "",
    temIntervalo: !!(dueFrom || dueTo),
    incluirSemData: false,
    onSelecionar: (value) =>
      value
        ? change({ urgencia: value, due_from: null, due_to: null })
        : limparUrgencia(),
  });

  return {
    // painel contextual (docs/revamp-mesa-trabalho-intimacoes.md §4)
    painelId: painel.id,
    abrirPainel: painel.abrir,
    fecharPainel: painel.fechar,
    painelTemAnterior: !!painelAnterior,
    painelTemProxima: !!painelProxima,
    painelAnterior: () => painelAnterior && painel.abrir(painelAnterior.id),
    painelProxima: () => painelProxima && painel.abrir(painelProxima.id),
    painelOnAcaoConcluida: avancarPainelAtual,
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
    // status (lifecycle, NativeSelect) + abas de disposição + refinar
    status,
    setStatus,
    statusOptions,
    dispTab,
    setDispTab,
    refine,
    setRefine,
    refineOptions,
    tabCounts,
    countsPending: pipeline.isPending,
    query,
    setQuery,
    density,
    setDensity,
    // "Prazo vencido" — escopo próprio (fora de counts/tabCounts), com consulta dedicada.
    vencidaCount: vencidaCount.totalCount,
    vencidaCountPending: vencidaCount.isPending,
    soVencidas,
    consultarVencidas,
    limparVencidas,
    // toolbar padrão
    filters,
    active: activeFilters,
    clear,
    // "Minha visão" — controle dedicado (docs §8)
    visao: respFilter,
    setVisao,
    visaoOptions,
    urgencyTabs,
    urgency: venc,
    dueFrom,
    dueTo,
    setIntervalo,
    // linhas do recorte ativo — MISTAS quando status=abertas/todas (RowTriar/RowReadonly
    // escolhidos por item, ver triagem-view.tsx: PipelineRow.lifecycle).
    laneRows: filtered,
    triagemEligibleIds,
    // seleção (só sobre itens elegíveis — a_triar)
    selected,
    selectedIds,
    allVisibleSelected,
    toggleSelect,
    toggleSelectAllVisible,
    clearSelection: () => setSelected(new Set()),
    rowById: (id: string) => byId.get(id),
    // mutações
    darCiencia,
    darCienciaUnica,
    descartar,
    atribuir,
    mutating,
  };
}
