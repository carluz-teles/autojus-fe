"use client";

// Triagem (Fase U-FE) — a tela REAL da pipeline, sobre o read model real e as
// mutações reais, montada com o CHROME PADRÃO do app (mesmos componentes que
// Intimações usa): PageFrame + ListToolbar (busca + popover Filtrar + UrgenciaFilter
// + controles) e Tabs do DS. A lista em si é a UI densa bulk-first do mockup
// aprovado (dev/triagem-v2), ligada ao BE.
//
// Navegação (docs/navigation-architecture.md — CONTRATO ROOT, revamp UMA dimensão):
//   • Abas primárias = DISPOSIÇÃO (Todas · Trabalho · Ciência · Exceções), não mais
//     lifecycle — `?disposicao=`.
//   • Status (lifecycle) virou um NativeSelect secundário na toolbar: Abertas
//     (default) · A decidir · Em andamento · Encerradas · Todas — `?status=`.
//   • "Refinar" (Analisando/Sem prazo) — NativeSelect que só aparece dentro de
//     "Todas" quando há volume; substitui o antigo dropdown "Fila".
//   • Linhas são MISTAS sob Abertas/Todas (combinam lifecycles): a escolha
//     RowTriar × RowReadonly é POR ITEM (row.lifecycle), não por aba — só a_triar é
//     mutável/selecionável (ver PipelineList abaixo).
//   • Ações reais: Dar ciência (resolve/resolve-batch), Gerar peça (GerarPecaModal →
//     /pecas/nova), Definir responsável (PUT responsavel em lote). Descartar = ignore.

import { CheckCheck, Inbox, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { MasterDetailLayout } from "@/components/shell/master-detail";
import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePecaGeracao } from "@/features/pecas-v2/components/pregen/gerar-peca-button";
import { IntimacaoDetalhe } from "@/features/prazos/components/intimacao-detalhe/intimacao-detalhe";

import { UrgenciaFilter } from "../../intimacoes/components/shared/urgencia-filter";
import { detalheNaFila } from "../../intimacoes/lib/fila-navigation";
import {
  type PipelineDispTab,
  useTriagemPipeline,
} from "../hooks/use-triagem-pipeline";
import type { PipelineRow } from "../lib/pipeline";
import { BulkBar, type BulkKind } from "./pipeline/bulk-bar";
import {
  type Density,
  type RowAction,
  RowReadonly,
  RowTriar,
} from "./pipeline/row-triar";

const RETORNO = "/triagem";

function quantidade(n: number, singular: string, plural: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : plural}`;
}

const DISP_TAB_LABEL: Record<PipelineDispTab, string> = {
  "": "Todas",
  trabalho: "Trabalho",
  ciencia: "Ciência",
  excecao: "Exceções",
};

export function TriagemView() {
  const m = useTriagemPipeline();
  const router = useRouter();
  // Geração de peça: FLUXO CANÔNICO ÚNICO (mesmo da intimação) — pre-flight de autos
  // + orientação opcional + navegação. `iniciar` abre o fluxo; `modais` renderiza uma
  // vez. Tanto o botão inline quanto o item de menu da linha chamam o MESMO fluxo.
  const pecaGen = usePecaGeracao();

  const href = (id: string) => detalheNaFila(id, RETORNO);

  // Gerar peça a partir de uma linha da triagem → o fluxo único (gate + modal).
  function abrirPeca(row: PipelineRow) {
    pecaGen.iniciar({
      intimacaoId: row.id,
      processoId: row.courtRecordId,
      actionItemId: row.rec?.gera_peca ? row.rec.id : undefined,
      existingActionItemId: !row.rec?.gera_peca ? row.rec?.id : undefined,
      retorno: RETORNO,
      pecaLabel: row.rec?.title ?? row.ato,
    });
  }

  // Roteamento das ações de UMA linha para a mutação real.
  function onRowAction(kind: RowAction, row: PipelineRow) {
    switch (kind) {
      case "abrir":
        m.abrirPainel(row.id);
        break;
      case "ciencia":
        void m.darCienciaUnica(row.id);
        break;
      case "definir":
        // Sem endpoint de "definir prazo" em lote — o fluxo real é revisar no detalhe.
        router.push(href(row.id));
        break;
      case "peca":
        abrirPeca(row);
        break;
      case "descartar":
        void m.descartar(row.id);
        break;
    }
  }

  function onBulk(kind: BulkKind) {
    const ids = m.selectedIds;
    switch (kind) {
      case "ciencia":
        void m.darCiencia(ids);
        break;
      case "responsavel":
        if (m.meId) void m.atribuir(ids, m.meId);
        break;
    }
  }

  const activeCount = m.tabCounts[m.dispTab];
  const headerLabel =
    m.countsPending || activeCount === undefined
      ? "Carregando…"
      : quantidade(activeCount, "intimação", "intimações");

  const vazio =
    m.dispTab === "excecao"
      ? "Nenhuma exceção neste recorte."
      : m.dispTab === "trabalho"
        ? "Nenhuma intimação pra trabalhar neste recorte."
        : m.dispTab === "ciencia"
          ? "Nenhuma ciência pendente neste recorte."
          : m.status === "em_andamento"
            ? "Nada em andamento no momento."
            : m.soVencidas
              ? "Nenhuma intimação com prazo vencido neste recorte."
              : m.status === "encerradas"
                ? "Nenhuma intimação encerrada ainda."
                : "Nenhuma intimação neste recorte.";

  return (
    <PageFrame
      fill
      header={
        <>
          <h1 className="shrink-0 text-[13px] font-medium">Mesa de Trabalho</h1>
          <span
            className="text-fg3 min-w-0 truncate font-mono text-[11px]"
            aria-live="polite"
          >
            {headerLabel}
          </span>
        </>
      }
      toolbar={
        <>
          <ListToolbar
            search={m.query}
            onSearch={m.setQuery}
            searchLabel="Buscar intimações"
            placeholder="Buscar por CNJ, partes ou assunto…"
            filters={m.filters}
            active={m.active}
            onClear={m.clear}
            controls={
              <UrgenciaFilter
                tabs={m.urgencyTabs}
                urgency={m.urgency}
                from={m.dueFrom}
                to={m.dueTo}
                onRange={m.setIntervalo}
              />
            }
          >
            {/* Status (lifecycle) — eixo SECUNDÁRIO, agora um filtro (não mais aba de
                topo). "Abertas" é o default (união a_triar+em_andamento). */}
            <NativeSelect
              aria-label="Status"
              value={m.status}
              onChange={(e) => m.setStatus(e.target.value as typeof m.status)}
            >
              {m.statusOptions.map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {/* "Refinar" — só dentro de "Todas" e só quando há Analisando/Sem prazo
                (volume real ou já selecionado); substitui o antigo dropdown "Fila". */}
            {m.dispTab === "" && m.refineOptions.length > 1 ? (
              <NativeSelect
                aria-label="Refinar"
                value={m.refine}
                onChange={(e) => m.setRefine(e.target.value as typeof m.refine)}
              >
                {m.refineOptions.map((o) => (
                  <NativeSelectOption key={o.value || "tudo"} value={o.value}>
                    {o.count > 0
                      ? `${o.label} · ${o.count.toLocaleString("pt-BR")}`
                      : o.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : null}
            <NativeSelect
              aria-label="Minha visão"
              value={m.visao}
              onChange={(e) => m.setVisao(e.target.value)}
            >
              {m.visaoOptions.map((o) => (
                <NativeSelectOption key={o.value || "todos"} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Densidade da lista"
              value={m.density}
              onChange={(e) =>
                m.setDensity(e.target.value as "confortavel" | "compacto")
              }
            >
              <NativeSelectOption value="confortavel">
                Confortável
              </NativeSelectOption>
              <NativeSelectOption value="compacto">Compacto</NativeSelectOption>
            </NativeSelect>
          </ListToolbar>
          {/* Disposição — a ÚNICA dimensão de abas (indicador deslizante + navegação
              por teclado). O atalho "Prazo vencido" acompanha as abas na MESMA linha
              (ml-auto), sem faixa própria. */}
          <div className="border-line flex flex-wrap items-center gap-2 border-b">
            <Tabs
              defaultValue="todas"
              value={m.dispTab || "todas"}
              onValueChange={(v) =>
                m.setDispTab(v === "todas" ? "" : (v as PipelineDispTab))
              }
            >
              <TabsList aria-label="Disposição">
                {(["", "trabalho", "ciencia", "excecao"] as const).map(
                  (tab) => (
                    <TabsTrigger key={tab || "todas"} value={tab || "todas"}>
                      {DISP_TAB_LABEL[tab]}
                      <TabCount value={m.tabCounts[tab]} />
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
            </Tabs>
            {/* "Prazo vencido" — escopo PRÓPRIO, nunca infla os badges de disposição;
                consultável mesmo o BE classificando como Encerradas. */}
            {!m.vencidaCountPending && m.vencidaCount > 0 ? (
              <button
                type="button"
                onClick={m.consultarVencidas}
                className="border-destructive/25 bg-destructive/8 text-destructive hover:bg-destructive/12 focus-visible:ring-ring mr-3 ml-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 sm:mr-4"
              >
                Prazo vencido: {m.vencidaCount.toLocaleString("pt-BR")}
                <span className="underline underline-offset-2">consultar</span>
              </button>
            ) : null}
          </div>
        </>
      }
    >
      <MasterDetailLayout
        painel={
          m.painelId ? (
            <IntimacaoDetalhe
              key={m.painelId}
              id={m.painelId}
              painel={{
                onFechar: m.fecharPainel,
                onAnterior: m.painelTemAnterior ? m.painelAnterior : undefined,
                onProxima: m.painelTemProxima ? m.painelProxima : undefined,
                temAnterior: m.painelTemAnterior,
                temProxima: m.painelTemProxima,
                modo: "execucao",
                onAcaoConcluida: m.painelOnAcaoConcluida,
              }}
            />
          ) : null
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-5">
          {pecaGen.modais}

          {m.isPending ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : m.isError ? (
            <div
              role="alert"
              className="border-border bg-card flex flex-col items-start gap-3 rounded-xl border p-5 shadow-sm"
            >
              <p>Não foi possível carregar a triagem.</p>
              <Button variant="outline" onClick={() => void m.retry()}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              {m.dispTab === "excecao" && (m.tabCounts.excecao ?? 0) > 0 && (
                <div className="border-gold/25 bg-gold/8 text-gold-foreground flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                  <TriangleAlert className="size-4 shrink-0" aria-hidden />
                  <span className="font-medium">
                    {(m.tabCounts.excecao ?? 0).toLocaleString("pt-BR")}{" "}
                    {m.tabCounts.excecao === 1 ? "exceção" : "exceções"} —
                    revise cada uma.
                  </span>
                  <span className="text-gold-foreground/80 text-xs">
                    Prazo provisório, tipo inferido ou divergência.
                  </span>
                </div>
              )}

              {m.status === "encerradas" && m.soVencidas ? (
                <div className="border-destructive/25 bg-destructive/8 text-destructive flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs">
                  <span>Mostrando apenas prazo vencido.</span>
                  <button
                    type="button"
                    onClick={m.limparVencidas}
                    className="underline underline-offset-2"
                  >
                    Ver todas as encerradas
                  </button>
                </div>
              ) : null}

              <PipelineList
                m={m}
                href={href}
                onRowAction={onRowAction}
                onBulk={onBulk}
                vazio={vazio}
                excecoesEmpty={m.dispTab === "excecao"}
              />
            </>
          )}

          {!m.isPending && !m.isError ? (
            <InfiniteListFooter
              paginationKey={m.paginationKey}
              hasMore={m.hasMore}
              loading={m.loadingMore}
              paused={m.isFetching && !m.loadingMore}
              error={false}
              onLoadMore={m.loadMore}
            />
          ) : null}
        </div>
      </MasterDetailLayout>
    </PageFrame>
  );
}

function TabCount({ value }: { value: number | undefined }) {
  if (value === undefined)
    return (
      <span className="text-fg3/60 ml-1 font-mono text-[10.5px]" aria-hidden>
        …
      </span>
    );
  if (!value) return null;
  return (
    <span className="text-fg3 ml-1 font-mono text-[10.5px] tabular-nums">
      {value.toLocaleString("pt-BR")}
    </span>
  );
}

/* ───────────────────── lista MISTA (RowTriar × RowReadonly por item) ──────── */

type Pipeline = ReturnType<typeof useTriagemPipeline>;

/** Renderiza `m.laneRows` — sob Abertas/Todas, os itens combinam lifecycles
 *  (a_triar/em_andamento/concluido) numa lista só; a escolha de linha (mutável ×
 *  read-only) é POR ITEM (row.lifecycle), nunca pela aba/status como um todo.
 *  Bulk/seleção só operam sobre os itens elegíveis (a_triar — `m.triagemEligibleIds`). */
function PipelineList({
  m,
  href,
  onRowAction,
  onBulk,
  vazio,
  excecoesEmpty,
}: {
  m: Pipeline;
  href: (id: string) => string;
  onRowAction: (kind: RowAction, row: PipelineRow) => void;
  onBulk: (kind: BulkKind) => void;
  vazio: string;
  excecoesEmpty: boolean;
}) {
  if (m.laneRows.length === 0) {
    return (
      <EmptyState
        icon={excecoesEmpty ? CheckCheck : Inbox}
        title={
          excecoesEmpty ? "Nenhuma exceção neste recorte" : "Nada por aqui"
        }
        description={
          excecoesEmpty ? "Tudo confiável — nada exige revisão humana." : vazio
        }
      />
    );
  }

  const density: Density = m.density;

  return (
    <div className="flex flex-col gap-3">
      {m.selectedIds.length > 0 && (
        <BulkBar
          count={m.selectedIds.length}
          onBulk={onBulk}
          onClear={m.clearSelection}
        />
      )}

      {m.triagemEligibleIds.length > 0 && (
        <div className="text-muted-foreground flex items-center gap-2 pl-1 text-xs">
          <Checkbox
            checked={m.allVisibleSelected}
            onCheckedChange={m.toggleSelectAllVisible}
            aria-label="Selecionar todas visíveis"
          />
          <span>
            Exibindo {quantidade(m.laneRows.length, "intimação", "intimações")}{" "}
            deste recorte.
          </span>
        </div>
      )}

      <div className="border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
        <ul className="divide-border divide-y">
          {m.laneRows.map((row) =>
            row.lifecycle === "a_triar" ? (
              <li key={row.id}>
                <RowTriar
                  row={row}
                  previewAtivo={m.painelId === row.id}
                  selected={m.selected.has(row.id)}
                  density={density}
                  members={m.members}
                  href={href(row.id)}
                  onToggleSelect={() => m.toggleSelect(row.id)}
                  onAction={onRowAction}
                  onAssign={(r, memberId) => void m.atribuir([r.id], memberId)}
                  onAbrir={() => m.abrirPainel(row.id)}
                />
              </li>
            ) : (
              <li key={row.id}>
                <RowReadonly
                  row={row}
                  previewAtivo={m.painelId === row.id}
                  density={density}
                  href={href(row.id)}
                  onAbrir={() => m.abrirPainel(row.id)}
                />
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
