"use client";

import {
  Check,
  ChevronRight,
  Clock,
  Inbox,
  Loader2,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { PageFrame } from "@/components/shell/page-frame";
import { TeorContent } from "@/components/teor-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { WORK_TYPES } from "@/features/action-items/components/new-providencia";
import { ProvidenciaFulfillment } from "@/features/action-items/components/providencia-fulfillment";
import {
  useWorkMutation,
  type WorkAction,
} from "@/features/action-items/hooks/use-workspace";
import { hasActionableFulfillment } from "@/features/action-items/lib/fulfillment";
import { Responsavel } from "@/features/organization/components/responsavel";
import { cn } from "@/lib/utils";

import { useListagemIntimacoes } from "../../hooks/use-listagem-intimacoes";
import type { linhaIntimacao } from "../../lib/listagem";
import type { RecommendedProvidencia } from "../../types";
import { FilterTabs } from "../shared/filter-tabs";
import { UrgenciaFilter } from "../shared/urgencia-filter";
import { RevisaoOrigem } from "./revisao-origem";

type Lista = ReturnType<typeof useListagemIntimacoes>;
type Linha = ReturnType<typeof linhaIntimacao>;

export function ListagemIntimacoes({ triagem = false }: { triagem?: boolean }) {
  const m = useListagemIntimacoes(triagem);
  return (
    <PageFrame
      header={
        <>
          <h1 className="shrink-0 text-[13px] font-medium">
            {triagem ? "Triagem" : "Intimações"}
          </h1>
          <span
            className="text-fg3 min-w-0 truncate font-mono text-[11px]"
            aria-live="polite"
          >
            {m.isPending
              ? "Carregando…"
              : `${quantidade(m.total, "intimação", "intimações")} · ${quantidade(m.processCount, "processo", "processos")}`}
          </span>
        </>
      }
      toolbar={
        <>
          <ListToolbar
            search={m.search}
            onSearch={m.setSearch}
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
              aria-label="Visualização"
              value={m.grouped ? "processos" : "intimacoes"}
              onChange={(e) => m.setMode(e.target.value)}
            >
              <NativeSelectOption value="processos">
                Por processo (CNJ)
              </NativeSelectOption>
              <NativeSelectOption value="intimacoes">
                Intimações individuais
              </NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              aria-label="Ordenação"
              value={m.sort}
              onChange={(e) => m.setSort(e.target.value)}
            >
              <NativeSelectOption value="recent">
                Mais recentes
              </NativeSelectOption>
              <NativeSelectOption value="deadline">
                Prazo mais próximo
              </NativeSelectOption>
            </NativeSelect>
          </ListToolbar>
          {triagem && (
            <>
              <FilterTabs label="Fila de trabalho" tabs={m.laneTabs} />
              {m.lane !== "historical" ? (
                <FilterTabs
                  label="Origem do prazo"
                  title="Origem do prazo"
                  tabs={m.origemTabs}
                />
              ) : null}
            </>
          )}
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-5">
        {m.bulkAction ? (
          <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm">
            <p className="text-muted-foreground text-xs">
              Revise o recorte e conclua os itens repetitivos de uma só vez.
            </p>
            <Button
              size="sm"
              disabled={m.bulkAction.pending}
              onClick={() => void m.bulkAction?.run()}
            >
              {m.bulkAction.pending ? "Processando…" : m.bulkAction.label}
            </Button>
          </div>
        ) : null}
        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground min-h-5 text-xs"
        >
          {m.updating && !m.isPending
            ? "Atualizando resultados…"
            : m.isPending
              ? "Carregando intimações…"
              : m.grouped
                ? `Exibindo ${m.groups.length} de ${quantidade(m.processCount, "processo", "processos")}. Os contadores dos filtros representam intimações.`
                : `Exibindo ${m.rows.length} de ${quantidade(m.total, "intimação", "intimações")}.`}
        </div>
        {m.isError && !m.loadMoreError ? (
          <div
            role="alert"
            className="border-border bg-card flex flex-col items-start gap-3 rounded-xl border p-5 shadow-sm"
          >
            <p>Não foi possível atualizar as intimações.</p>
            <Button variant="outline" onClick={m.retry}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {m.isPending ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : !m.rows.length && !m.isError ? (
          <EmptyState
            icon={Inbox}
            title="Nenhuma intimação neste recorte"
            description="Revise a busca ou remova os filtros para consultar outras publicações."
            action={
              <Button variant="outline" onClick={m.clear}>
                Limpar busca e filtros
              </Button>
            }
          />
        ) : (
          <div
            aria-busy={m.updating}
            inert={m.updating}
            className={cn(
              "border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm",
              m.updating && "opacity-60",
            )}
          >
            {m.grouped ? (
              <ul className="divide-border divide-y">
                {m.groups.map((g) => (
                  <li key={g.cnj_number}>
                    {g.items.length === 1 ? (
                      <div>
                        <LinhaIntimacao row={g.items[0]} m={m} />
                        {g.total_count > 1 ? (
                          <ContextoGrupo
                            cnj={g.cnj_number}
                            total={g.total_count}
                            matches={g.matching_count}
                            m={m}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <details
                        open={m.open.has(g.cnj_number)}
                        onToggle={(e) =>
                          m.toggleGroup(g.cnj_number, e.currentTarget.open)
                        }
                        className="group bg-card"
                      >
                        <summary className="hover:bg-muted/30 focus-visible:ring-ring grid cursor-pointer list-none gap-4 px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-5 lg:grid-cols-[minmax(0,1fr)_180px_180px] lg:gap-5 [&::-webkit-details-marker]:hidden">
                          <div className="flex min-w-0 gap-2">
                            <ChevronRight
                              className="text-muted-foreground mt-0.5 size-4 shrink-0 group-open:rotate-90"
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <h2 className="font-display text-base leading-snug font-medium break-words">
                                {g.title}
                              </h2>
                              <p className="text-muted-foreground mt-1 font-mono text-xs">
                                {g.cnj}
                              </p>
                              {g.partes && (
                                <p className="text-muted-foreground mt-1 line-clamp-2 text-[13px]">
                                  {g.partes}
                                </p>
                              )}
                              <p className="text-muted-foreground mt-2 text-xs">
                                {g.matching_count} neste filtro ·{" "}
                                {g.total_count} no processo
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs lg:sr-only">
                              Vencimento mais urgente neste filtro
                            </p>
                            <p
                              className={cn(
                                "text-base font-semibold tabular-nums",
                                g.urgente?.alert && "text-destructive",
                              )}
                            >
                              {g.urgente?.data ?? "Sem prazo ativo"}
                            </p>
                            {g.urgente && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {g.urgente.relative}
                              </p>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col items-start gap-2">
                            <Responsavel
                              value={g.responsavelId}
                              nome={g.responsavel}
                              multiplo={g.responsaveisDiferentes}
                            />
                            {g.pending > 0 && (
                              <Badge variant="warning">{g.pendencias}</Badge>
                            )}
                          </div>
                        </summary>
                        <div className="border-border border-t">
                          <ul>
                            {g.items.map((row) => (
                              <li
                                key={row.id}
                                className="border-border border-b last:border-b-0"
                              >
                                <LinhaIntimacao row={row} grouped m={m} />
                              </li>
                            ))}
                          </ul>
                          <ContextoGrupo
                            cnj={g.cnj_number}
                            total={g.total_count}
                            matches={g.matching_count}
                            m={m}
                          />
                        </div>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                <ul>
                  {m.rows.map((row) => (
                    <li
                      key={row.id}
                      className="border-border border-b last:border-b-0"
                    >
                      <LinhaIntimacao row={row} m={m} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {!m.isPending && m.rows.length > 0 ? (
          <InfiniteListFooter
            paginationKey={m.paginationKey}
            hasMore={m.hasMore}
            loading={m.loadingMore}
            paused={m.updating}
            error={m.loadMoreError}
            onLoadMore={m.loadMore}
          />
        ) : null}
      </div>
    </PageFrame>
  );
}

// PrazoBadge — pill de vencimento do card (mockup): ⏱ "vence 10/09 · 3 dias" com tom
// atenção (amber) / atraso (vermelho) / normal. Deriva de vencimentoDaLinha (data/relative/alert).
function PrazoBadge({ prazo }: { prazo: Linha["prazo"] }) {
  const semPrazo = prazo.data === "Sem prazo" || prazo.data === "A definir";
  const atraso = prazo.relative.toLowerCase().includes("atraso");
  const variant = atraso ? "destructive" : prazo.alert ? "warning" : "outline";
  const label = semPrazo
    ? prazo.data
    : `vence ${prazo.data}${prazo.relative ? ` · ${prazo.relative}` : ""}`;
  return (
    <Badge variant={variant}>
      <Clock data-icon="inline-start" />
      {label}
    </Badge>
  );
}

// TriageActions — barra de ação DIRETA do mockup (a providência nasce comprometida, sem o
// passo de curadoria SUGGESTED). Gera peça → /pecas/nova (mesmo href do WorkActions);
// Concluir/Criar já concluída → POST /v1/action-items/:id/actions {accept_completed};
// Dispensar → {dismiss}. O onSuccess do useWorkMutation invalida `intimacoes`, então a
// linha some/atualiza sozinha.
function TriageActions({
  rec,
  r,
  m,
}: {
  rec: RecommendedProvidencia;
  r: Linha;
  m: Lista;
}) {
  const mutation = useWorkMutation();
  const busy = mutation.isPending;
  const run = (action: WorkAction) => {
    if (!busy) mutation.mutate({ id: rec.id, action });
  };
  const pieceHref = `/pecas/nova?providencia=${rec.id}&intimacao=${r.id}&retorno=${encodeURIComponent(m.href(r.id))}`;
  const cumprimento = hasActionableFulfillment(rec.fulfillment);
  const ciencia = rec.tipo === "ciencia" || !rec.gera_peca;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {cumprimento ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => run("accept_completed")}
        >
          <Check data-icon="inline-start" />
          Criar já concluída
        </Button>
      ) : ciencia ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => run("accept_completed")}
        >
          <Check data-icon="inline-start" />
          Concluir
        </Button>
      ) : (
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={pieceHref} onClick={m.remember} />}
        >
          <PenLine data-icon="inline-start" />
          Gerar peça
        </Button>
      )}
      {!ciencia && !cumprimento ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => run("accept_completed")}
        >
          Concluir
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => run("dismiss")}
      >
        <X data-icon="inline-start" />
        Dispensar
      </Button>
      {mutation.isError ? (
        <span role="alert" className="text-destructive text-xs">
          Não foi possível concluir. Tente novamente.
        </span>
      ) : null}
    </div>
  );
}

function LinhaIntimacao({
  row: r,
  m,
  grouped = false,
}: {
  row: Linha;
  m: Lista;
  grouped?: boolean;
}) {
  const rec = r.lifecycle.state === "recommended" ? r.lifecycle.rec : null;
  return (
    <article className="hover:bg-muted/25 flex min-w-0 flex-col gap-3 px-4 py-4 transition-colors sm:px-5">
      {/* Header: prazo · situação · responsável */}
      <div className="flex flex-wrap items-center gap-2">
        <PrazoBadge prazo={r.prazo} />
        {r.prazo.alert ? <Badge variant="warning">atenção</Badge> : null}
        <span className="ml-auto">
          <Responsavel value={r.responsavelId} nome={r.responsavel} />
        </span>
      </div>

      {/* Corpo: título + meta do processo + teor */}
      <div className="min-w-0">
        <Link
          href={m.href(r.id)}
          onClick={m.remember}
          className="font-display text-foreground focus-visible:ring-ring hover:text-primary rounded text-base leading-snug font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          {grouped ? r.ato : r.title}
        </Link>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {[grouped ? "" : r.ato, r.cnj, r.tribunal]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {r.preview ? (
          <TeorContent
            content={r.preview}
            allowLinks={false}
            className="text-foreground/85 mt-1.5 line-clamp-2 text-sm leading-relaxed"
          />
        ) : r.partes ? (
          <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
            {r.partes}
          </p>
        ) : null}
      </div>

      {/* Seção de ação (border-t) — analisando / revisar / ação recomendada */}
      <div className="flex flex-col gap-3 border-t pt-3">
        {r.lifecycle.state === "analyzing" ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Analisando… a ação recomendada preenche em instantes
          </p>
        ) : r.revisao.pending ? (
          <div className="flex flex-wrap items-center gap-2">
            <RevisaoOrigem
              revisao={r.revisao}
              origem=""
              origemDescricao={r.origemDescricao}
            />
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={m.href(r.id)} onClick={m.remember} />}
            >
              Revisar tipo e prazo
            </Button>
          </div>
        ) : rec ? (
          <>
            <p className="section-label flex items-center gap-1.5">
              <Sparkles className="size-3" aria-hidden />
              Ação recomendada
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-base font-medium">
                {WORK_TYPES[rec.tipo]}
              </span>
              {rec.gera_peca ? (
                <Badge variant="secondary">gera peça</Badge>
              ) : null}
            </div>
            {hasActionableFulfillment(rec.fulfillment) ? (
              <ProvidenciaFulfillment fulfillment={rec.fulfillment} />
            ) : null}
            <TriageActions rec={rec} r={r} m={m} />
          </>
        ) : (
          <Link
            href={m.href(r.id)}
            onClick={m.remember}
            aria-label={`Abrir intimação de ${r.publicado}, processo ${r.cnj}`}
            className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2"
          >
            Abrir intimação
            <ChevronRight className="size-3" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

function ContextoGrupo({
  cnj,
  total,
  matches,
  m,
}: {
  cnj: string;
  total: number;
  matches: number;
  m: Lista;
}) {
  if (total <= matches) return null;
  return (
    <div className="border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
      <p className="text-muted-foreground text-xs">
        {quantidade(total - matches, "publicação", "publicações")} fora deste
        filtro.
      </p>
      <Link
        href={m.contextoHref(cnj)}
        className="text-primary focus-visible:ring-ring rounded text-sm underline underline-offset-4 outline-none focus-visible:ring-2"
      >
        Ver todas deste processo
      </Link>
    </div>
  );
}

function quantidade(n: number, singular: string, plural: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : plural}`;
}
