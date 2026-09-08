"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { PageFrame } from "@/components/shell/page-frame";
import { TeorContent } from "@/components/teor-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Responsavel } from "@/features/organization/components/responsavel";
import { cn } from "@/lib/utils";

import { useListagemIntimacoes } from "../../hooks/use-listagem-intimacoes";
import type { linhaIntimacao } from "../../lib/listagem";
import { FilterTabs } from "../shared/filter-tabs";
import { UrgenciaFilter } from "../shared/urgencia-filter";

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
                  title="Prazo"
                  tabs={m.origemTabs}
                />
              ) : null}
            </>
          )}
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-3 px-4 py-3">
        {m.bulkAction ? (
          <div className="border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
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
            className="border-border bg-card flex flex-col items-start gap-3 rounded-lg border p-5"
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
              <div
                key={i}
                className="bg-muted h-28 rounded-lg motion-safe:animate-pulse"
              />
            ))}
          </div>
        ) : !m.rows.length && !m.isError ? (
          <div className="border-border bg-card flex flex-col items-center gap-3 rounded-lg border px-5 py-12">
            <h2 className="text-base font-medium">
              Nenhuma intimação neste recorte
            </h2>
            <p className="text-muted-foreground text-center text-sm">
              Revise a busca ou remova os filtros para consultar outras
              publicações.
            </p>
            <Button variant="outline" onClick={m.clear}>
              Limpar busca e filtros
            </Button>
          </div>
        ) : (
          <div
            aria-busy={m.updating}
            inert={m.updating}
            className={cn(
              "border-border bg-card min-w-0 overflow-hidden rounded-lg border",
              m.updating && "opacity-60",
            )}
          >
            <div
              aria-hidden
              className="border-border bg-muted/30 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_180px_180px] gap-4 border-b px-4 py-2 text-xs lg:grid"
            >
              <span>Intimação / processo</span>
              <span>Vencimento</span>
              <span>Responsável / situação</span>
            </div>
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
                        className="group"
                      >
                        <summary className="hover:bg-muted/30 focus-visible:ring-ring grid cursor-pointer list-none gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset lg:grid-cols-[minmax(0,1fr)_180px_180px] lg:gap-4 [&::-webkit-details-marker]:hidden">
                          <div className="flex min-w-0 gap-2">
                            <ChevronRight
                              className="text-muted-foreground mt-0.5 size-4 shrink-0 group-open:rotate-90"
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <h2 className="text-sm font-medium break-words">
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

function LinhaIntimacao({
  row: r,
  m,
  grouped = false,
}: {
  row: Linha;
  m: Lista;
  grouped?: boolean;
}) {
  return (
    <article className="hover:bg-muted/30 grid min-w-0 gap-3 px-4 py-3 transition-colors lg:grid-cols-[minmax(0,1fr)_180px_180px] lg:gap-4">
      <div className="min-w-0">
        <Link
          href={m.href(r.id)}
          onClick={m.remember}
          className="text-foreground focus-visible:ring-ring rounded text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          {grouped ? r.ato : r.title}
        </Link>
        {!grouped ? (
          <>
            <p className="text-muted-foreground mt-1 font-mono text-xs">
              {r.cnj} · {r.tribunal}
            </p>
            {r.partes ? (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                {r.partes}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">{r.tribunal}</p>
        )}
        <p className="text-muted-foreground mt-2 text-xs">
          Publicação: {r.publicado}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!grouped && r.ato !== r.origem ? (
            <span className="text-xs">{r.ato}</span>
          ) : null}
          {r.origem && (!grouped || r.origem !== r.ato) ? (
            <Badge variant={r.revisao.pending ? "warning" : "outline"}>
              {r.origem}
            </Badge>
          ) : null}
          {r.revisao.label ? (
            <span
              className={cn(
                "text-xs",
                r.revisao.pending
                  ? "text-gold-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {r.revisao.label}
            </span>
          ) : null}
        </div>
        {grouped && r.preview ? (
          <TeorContent
            content={r.preview}
            allowLinks={false}
            className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-relaxed"
          />
        ) : null}
      </div>
      <div>
        <p className="text-muted-foreground text-xs lg:sr-only">Vencimento</p>
        <p
          className={cn(
            "text-base font-semibold tabular-nums",
            r.prazo.alert && "text-destructive",
          )}
        >
          {r.prazo.data}
        </p>
        {r.prazo.relative ? (
          <p className="text-muted-foreground mt-1 text-xs">
            {r.prazo.relative}
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-muted-foreground text-xs lg:sr-only">Responsável</p>
        <Responsavel value={r.responsavelId} nome={r.responsavel} />
        <div className="mt-2">
          <Badge variant="secondary">{r.situacao}</Badge>
        </div>
        {r.etapa ? (
          <p className="text-muted-foreground mt-2 text-xs">Etapa: {r.etapa}</p>
        ) : null}
        <Link
          href={m.href(r.id)}
          onClick={m.remember}
          aria-label={`Abrir intimação de ${r.publicado}, processo ${r.cnj}`}
          className="text-primary focus-visible:ring-ring mt-3 inline-flex items-center gap-1 rounded text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          Abrir intimação
          <ChevronRight className="size-3" aria-hidden />
        </Link>
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
