"use client";

// Triagem (Fase U-FE) — a tela REAL da pipeline, sobre o read model real e as
// mutações reais, montada com o CHROME PADRÃO do app (mesmos componentes que
// Intimações usa): PageFrame + ListToolbar (busca + popover Filtrar + UrgenciaFilter
// + controles), Tabs do DS (ciclo de vida) e FilterTabs (segmentos). A lista em si é
// a UI densa bulk-first do mockup aprovado (dev/triagem-v2), ligada ao BE:
//   • Abas de ciclo de vida (A triar / Em andamento / Concluído) por `lifecycle` (U0).
//   • Segmentos em "A triar": ⚠ Exceções [default] · Tudo · Pra trabalhar · Ciências ·
//     Sem prazo — por `is_excecao` / `acionabilidade` (FilterTabs).
//   • Linha densa a partir do IntimacaoView (pipelineRow): chip de categoria coarse,
//     título serif (deep-link), meta mono, PrazoBadge (fatal+dias+provisório+interno).
//   • Ações reais: Confirmar (confirm-batch trusted), Dar ciência (resolve/resolve-batch),
//     Gerar peça (GerarPecaModal → /pecas/nova), Definir responsável (PUT responsavel em
//     lote). Descartar = ignore. Adiar = SEM endpoint (desabilitado).
//
// TODO U0-followup: `?lifecycle=` server-side (hoje a partição é client-side sobre
// as páginas carregadas — ver useTriagemPipeline). Group-by-process adiado.

import { CheckCheck, Inbox, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { ListToolbar } from "@/components/shell/list-toolbar";
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

import { FilterTabs } from "../../intimacoes/components/shared/filter-tabs";
import { UrgenciaFilter } from "../../intimacoes/components/shared/urgencia-filter";
import { detalheNaFila } from "../../intimacoes/lib/fila-navigation";
import { useTriagemPipeline } from "../hooks/use-triagem-pipeline";
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
    if (!row.rec?.gera_peca) return;
    pecaGen.iniciar({
      intimacaoId: row.id,
      processoId: row.courtRecordId,
      actionItemId: row.rec.id,
      retorno: RETORNO,
      pecaLabel: row.rec.title ?? row.ato,
    });
  }

  // Roteamento das ações de UMA linha para a mutação real.
  function onRowAction(kind: RowAction, row: PipelineRow) {
    switch (kind) {
      case "confirmar":
        void m.confirmar([row.id]);
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
      case "adiar":
        // TODO U0-followup: sem endpoint de "adiar" — botão desabilitado na UI.
        break;
    }
  }

  function onBulk(kind: BulkKind) {
    const ids = m.selectedIds;
    switch (kind) {
      case "ciencia":
        void m.darCiencia(ids);
        break;
      case "confirmar":
        void m.confirmar(ids);
        break;
      case "responsavel":
        if (m.meId) void m.atribuir(ids, m.meId);
        break;
      case "adiar":
        break; // sem endpoint
    }
  }

  return (
    <PageFrame
      header={
        <>
          <h1 className="shrink-0 text-[13px] font-medium">Triagem</h1>
          <span
            className="text-fg3 min-w-0 truncate font-mono text-[11px]"
            aria-live="polite"
          >
            {m.countsPending
              ? "Carregando…"
              : quantidade(m.counts[m.tab], "intimação", "intimações")}
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
          {/* Ciclo de vida — Tabs do DS (indicador deslizante + navegação por teclado) */}
          <Tabs
            defaultValue="a_triar"
            value={m.tab}
            onValueChange={(v) => m.setTab(v as typeof m.tab)}
          >
            <TabsList aria-label="Ciclo de vida">
              <TabsTrigger value="a_triar">
                A triar
                <TabCount value={m.counts.a_triar} />
              </TabsTrigger>
              <TabsTrigger value="em_andamento">
                Em andamento
                <TabCount value={m.counts.em_andamento} />
              </TabsTrigger>
              <TabsTrigger value="concluido">
                Concluído
                <TabCount value={m.counts.concluido} />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Segmentos da fila "A triar" — FilterTabs do DS (Exceções primeiro/âmbar) */}
          {m.tab === "a_triar" ? (
            <FilterTabs label="Fila de trabalho" tabs={m.segmentTabs} />
          ) : null}
        </>
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
        ) : m.tab === "a_triar" ? (
          <ATriar m={m} href={href} onRowAction={onRowAction} onBulk={onBulk} />
        ) : (
          <ReadonlyLane
            rows={m.laneRows}
            density={m.density}
            href={href}
            vazio={
              m.tab === "em_andamento"
                ? "Nada em andamento no momento."
                : "Nenhuma intimação concluída ainda."
            }
          />
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
    </PageFrame>
  );
}

function TabCount({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="text-fg3 ml-1 font-mono text-[10.5px] tabular-nums">
      {value.toLocaleString("pt-BR")}
    </span>
  );
}

/* ─────────────────────────── fila "A triar" ─────────────────────────── */

type Pipeline = ReturnType<typeof useTriagemPipeline>;

function ATriar({
  m,
  href,
  onRowAction,
  onBulk,
}: {
  m: Pipeline;
  href: (id: string) => string;
  onRowAction: (kind: RowAction, row: PipelineRow) => void;
  onBulk: (kind: BulkKind) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* header do segmento Exceções — contagem REAL (full backlog) do pipeline-counts */}
      {m.segment === "excecoes" && m.segCounts.excecoes > 0 && (
        <div className="border-gold/25 bg-gold/8 text-gold-foreground flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          <span className="font-medium">
            {m.segCounts.excecoes.toLocaleString("pt-BR")}{" "}
            {m.segCounts.excecoes === 1 ? "exceção" : "exceções"} — revise cada
            uma.
          </span>
          <span className="text-gold-foreground/80 text-xs">
            Prazo provisório, tipo inferido ou divergência.
          </span>
        </div>
      )}

      {/* barra de bulk (seleção manual) */}
      {m.selectedIds.length > 0 && (
        <BulkBar
          count={m.selectedIds.length}
          onBulk={onBulk}
          onClear={m.clearSelection}
          adiarDisponivel={m.adiarDisponivel}
        />
      )}

      {/* barra-mestra: select-all + contagem */}
      {m.triarFiltered.length > 0 && (
        <div className="text-muted-foreground flex items-center gap-2 pl-1 text-xs">
          <Checkbox
            checked={m.allVisibleSelected}
            onCheckedChange={m.toggleSelectAllVisible}
            aria-label="Selecionar todas visíveis"
          />
          <span>
            Exibindo{" "}
            {quantidade(m.triarFiltered.length, "intimação", "intimações")}{" "}
            deste recorte.
          </span>
        </div>
      )}

      {/* LISTA DENSA */}
      {m.triarFiltered.length === 0 ? (
        <EmptyState
          icon={m.segment === "excecoes" ? CheckCheck : Inbox}
          title={
            m.segment === "excecoes"
              ? "Nenhuma exceção neste recorte"
              : "Nenhuma intimação neste recorte"
          }
          description={
            m.segment === "excecoes"
              ? "Tudo confiável — nada exige revisão humana."
              : "Revise a busca ou os filtros para consultar outras publicações."
          }
        />
      ) : (
        <div className="border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
          <ul className="divide-border divide-y">
            {m.triarFiltered.map((row) => (
              <li key={row.id}>
                <RowTriar
                  row={row}
                  selected={m.selected.has(row.id)}
                  density={m.density}
                  members={m.members}
                  href={href(row.id)}
                  adiarDisponivel={m.adiarDisponivel}
                  onToggleSelect={() => m.toggleSelect(row.id)}
                  onAction={onRowAction}
                  onAssign={(r, memberId) => void m.atribuir([r.id], memberId)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ──────────────────── lanes read-only (andamento/concluído) ──────────── */

function ReadonlyLane({
  rows,
  density,
  href,
  vazio,
}: {
  rows: PipelineRow[];
  density: Density;
  href: (id: string) => string;
  vazio: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-xl border px-6 py-14 text-center text-sm shadow-sm">
        {vazio}
      </div>
    );
  }
  return (
    <div className="border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
      <ul className="divide-border divide-y">
        {rows.map((row) => (
          <li key={row.id}>
            <RowReadonly row={row} density={density} href={href(row.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
