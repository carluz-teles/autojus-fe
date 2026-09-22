"use client";

import { ChevronRight, Clock, FolderSearch } from "lucide-react";
import Link from "next/link";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { PageFrame } from "@/components/shell/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportByCnjDialog } from "@/features/acquisition/components/import-by-cnj-dialog";
import { FilterTabs } from "@/features/intimacoes/components/shared/filter-tabs";
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { ProcessoSituacao } from "@/features/processos/components/situacao-processo";
import { useAssignResponsavel } from "@/features/processos/hooks/use-processos";
import { cn } from "@/lib/utils";

import { useAcervoProcessos } from "../../hooks/use-acervo-processos";

type Linha = ReturnType<typeof useAcervoProcessos>["rows"][number];
type PrazoVariant = NonNullable<Linha["prazo"]>["variant"];

// Trilho de urgência à esquerda da linha: só o que precisa de ação GRITA (atraso
// vermelho, hoje/≤2d gold), folga recua (teal suave) e "sem prazo" quase some.
// A lista fica orientada a urgência sem reordenar (a ordem segue o CNJ).
function railColor(variant: PrazoVariant | undefined): string {
  switch (variant) {
    case "destructive":
      return "var(--destructive)";
    case "warning":
      return "var(--gold)";
    case "success":
      return "color-mix(in oklch, var(--primary) 45%, transparent)";
    default:
      return "var(--line)";
  }
}

// Cor da DATA do vencimento — mesmo código de urgência do trilho, no texto.
function prazoTextColor(variant: PrazoVariant): string {
  return cn(
    "text-base font-semibold tabular-nums",
    variant === "destructive"
      ? "text-destructive"
      : variant === "warning"
        ? "text-gold-foreground"
        : "text-primary",
  );
}

export function ProcessosLista() {
  const m = useAcervoProcessos();
  return (
    <PageFrame
      header={
        <>
          <h1 className="shrink-0 text-[13px] font-medium">Processos</h1>
          <span
            className="text-fg3 min-w-0 truncate font-mono text-[11px]"
            aria-live="polite"
          >
            {m.isLoading ? "Carregando…" : m.totalLabel}
          </span>
          <div className="ml-auto shrink-0">
            <ImportByCnjDialog />
          </div>
        </>
      }
      toolbar={
        <>
          <ListToolbar
            search={m.search}
            onSearch={m.setSearch}
            searchLabel="Buscar processos"
            placeholder="Buscar por CNJ, partes ou título…"
            filters={m.filters}
            active={m.active}
            onClear={m.clear}
          />
          <FilterTabs
            label="Filtrar por situação do processo"
            title="Situação"
            tabs={m.tabs}
          />
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-5">
        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground min-h-5 text-xs"
        >
          {m.isLoading
            ? "Carregando processos…"
            : m.updating
              ? "Atualizando resultados…"
              : m.statusLabel}
        </p>
        {m.isError && !m.loadMoreError ? (
          <div
            role="alert"
            className="border-destructive/20 bg-destructive/5 flex flex-col items-start gap-3 rounded-xl border p-5 shadow-sm"
          >
            <p>Não foi possível atualizar os processos.</p>
            <Button variant="outline" onClick={m.retry}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {m.isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : !m.rows.length && !m.isError ? (
          <EmptyState
            icon={FolderSearch}
            title="Nenhum processo neste recorte"
            description="Revise a busca, os filtros ou a situação selecionada."
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
              "border-line bg-card min-w-0 overflow-hidden rounded-xl border shadow-[var(--shadow-surface)]",
              m.updating && "opacity-60",
            )}
          >
            <div
              aria-hidden
              className="border-line bg-muted/25 hidden grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_200px] items-center gap-6 border-b py-2.5 pr-4 pl-6 xl:grid"
            >
              <span className="section-label">Processo e partes</span>
              <span className="section-label">Acompanhamento</span>
              <span className="section-label">Responsável e situação</span>
            </div>
            <ul className="reveal-stagger">
              {m.rows.map((r) => (
                <li key={r.id} className="border-line border-b last:border-b-0">
                  <LinhaProcesso row={r} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {!m.isLoading && m.rows.length > 0 ? (
          <InfiniteListFooter
            paginationKey={m.paginationKey}
            hasMore={m.hasMore}
            loading={m.isLoadingMore}
            paused={m.updating}
            error={m.loadMoreError}
            onLoadMore={m.loadMore}
          />
        ) : null}
      </div>
    </PageFrame>
  );
}

// Responsável ATRIBUÍVEL direto da lista — cada linha abre seu próprio menu e grava
// via PUT /v1/processos/:id/responsavel (o diretório de membros é cache compartilhado).
function LinhaResponsavel({
  processoId,
  value,
  nome,
}: {
  processoId: string;
  value: string | null | undefined;
  nome: string;
}) {
  const directory = useOrgMembersDirectory();
  const assign = useAssignResponsavel(processoId);
  return (
    <ResponsavelMenu
      label="Responsável pelo processo"
      value={value}
      nome={nome}
      membros={directory.members}
      emVoo={assign.isPending}
      onAssign={(id) => assign.mutate(id)}
    />
  );
}

function LinhaProcesso({ row: r }: { row: Linha }) {
  return (
    <article className="group hover:bg-primary/[0.025] relative grid min-w-0 gap-4 py-4 pr-4 pl-6 transition-colors xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_200px] xl:gap-6">
      {/* trilho de urgência (pílula) — a cor reflete o próximo prazo */}
      <span
        aria-hidden
        className="absolute inset-y-3 left-2.5 w-1 rounded-full"
        style={{ backgroundColor: railColor(r.prazo?.variant) }}
      />

      {/* ── Identidade (âncora) ── */}
      <div className="min-w-0">
        <Link
          href={r.href}
          className="font-display text-foreground focus-visible:ring-ring hover:text-primary rounded text-base leading-snug font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          {r.title}
        </Link>
        <p className="text-primary mt-1 font-mono text-xs font-medium">
          {r.cnj}
        </p>
        {r.partes ? (
          <p
            className="text-muted-foreground mt-1 line-clamp-2 text-[13px]"
            title={r.partes}
          >
            {r.partes}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">
            Partes não informadas
          </p>
        )}
        <p
          className="text-muted-foreground mt-1.5 line-clamp-1 text-xs"
          title={`${r.tribunal} · ${r.orgao}`}
        >
          {r.tribunal}
          {r.orgao ? <span className="opacity-60"> · {r.orgao}</span> : null}
        </p>
        {r.classeAssunto && r.classeAssunto !== r.title ? (
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
            {r.classeAssunto}
          </p>
        ) : null}
      </div>

      {/* ── Acompanhamento: próximo prazo (estrela) + última movimentação ── */}
      <div className="min-w-0">
        <p className="section-label">Próximo prazo</p>
        {r.prazo ? (
          <div className="mt-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={prazoTextColor(r.prazo.variant)}>
                {r.prazo.data}
              </span>
              <Badge variant={r.prazo.variant}>{r.prazo.ato}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
              <Clock className="size-3 shrink-0" aria-hidden />
              {r.prazo.resumo}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground mt-1.5 text-sm">
            Sem prazo ativo
          </p>
        )}
        <div className="border-line/70 mt-3 border-t pt-3">
          <p className="section-label">Última movimentação</p>
          <p className="text-muted-foreground mt-1 text-xs tabular-nums">
            {r.movimentoData}
          </p>
          <p
            className="mt-0.5 line-clamp-2 text-sm leading-relaxed"
            title={r.movimento}
          >
            {r.movimento}
          </p>
        </div>
      </div>

      {/* ── Responsável + situação ── */}
      <div className="flex min-w-0 flex-col items-start gap-2.5">
        <ProcessoSituacao situacao={r.situacaoDetalhe} />
        {r.fase ? (
          <p className="text-muted-foreground text-xs">Fase · {r.fase}</p>
        ) : null}
        <div className="-ml-2 max-w-full">
          <LinhaResponsavel
            processoId={r.id}
            value={r.responsavelId}
            nome={r.responsavel}
          />
        </div>
        <Link
          href={r.href}
          aria-label={`Abrir processo ${r.cnj}`}
          className="text-primary focus-visible:ring-ring mt-auto inline-flex h-8 items-center gap-1 rounded text-xs font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          Abrir processo
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
