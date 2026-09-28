"use client";

// Histórico de Intimações (`/intimacoes`) — superfície de CONSULTA/AUDITORIA de
// TODAS as intimações que já passaram pelo sistema (todos os status, escritório
// inteiro). Read-only: sem seleção/lote/painel/CTA operacional/pendência — "uma
// tela é ação (Mesa), outra é histórico" (docs/history-design.md), inclusive
// agrupado (o summary de grupo não sinaliza mais "precisa revisar"). Título/linha
// navegam pro detalhe cheio (`/intimacoes/[id]`, modo consulta), reusando
// useFilaNavigation (anterior/próxima + `?retorno=`).
//
// Composição da linha rebrand: identidade (título/meta/partes/teor) na coluna
// corpo; cronologia de publicação em protagonismo + estado/prazo secundários
// numa coluna, responsável numa 3ª coluna quando o espaço permitir. Responsivo
// pela LARGURA DO CONTÊINER (`@container`, mesmo padrão de `pipeline/row-triar.tsx`
// — não viewport): a lista pode estar mais estreita que a viewport (sidebar,
// contexto embutido), então o reflow reage ao espaço real disponível, não a um
// breakpoint de tela presumido. O summary de grupo (pré-existente) ganhou o
// mesmo tratamento, pela mesma razão.

import { ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { PageFrame } from "@/components/shell/page-frame";
import { TeorContent } from "@/components/teor-content";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Responsavel } from "@/features/organization/components/responsavel";
import { cn } from "@/lib/utils";

import { useListagemIntimacoes } from "../../hooks/use-listagem-intimacoes";
import type { linhaIntimacao } from "../../lib/listagem";
import { UrgenciaFilter } from "../shared/urgencia-filter";

type Lista = ReturnType<typeof useListagemIntimacoes>;
type Linha = ReturnType<typeof linhaIntimacao>;

export function ListagemIntimacoes() {
  const m = useListagemIntimacoes();
  return (
    <PageFrame
      fill
      header={
        <>
          <h1 className="shrink-0 text-[13px] font-medium">Intimações</h1>
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
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-5">
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
                        className="group bg-card @container"
                      >
                        <summary className="hover:bg-muted/30 focus-visible:ring-ring grid cursor-pointer list-none gap-4 px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-5 @min-[768px]:grid-cols-[minmax(0,1fr)_180px_180px] @min-[768px]:gap-5 [&::-webkit-details-marker]:hidden">
                          <div className="flex min-w-0 gap-2">
                            <ChevronRight
                              className="text-muted-foreground mt-0.5 size-4 shrink-0 group-open:rotate-90"
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <h2 className="font-display text-base leading-snug font-medium break-words">
                                {g.title}
                              </h2>
                              <p className="text-muted-foreground mt-1 font-mono text-xs break-all">
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
                            <p className="text-muted-foreground text-xs @min-[768px]:sr-only">
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

/** Publicação — a âncora cronológica do registro, em protagonismo (identidade
 *  legível + tabular-nums): é o dado que organiza o histórico como um livro-razão.
 *  `rotulo` distingue a FONTE real do dado ("Publicada" = published_at; "Disponibilizada"
 *  = fallback made_available_at, que NÃO é a publicação — nunca afirmar uma coisa pela
 *  outra, ver linhaIntimacao). */
function PublicacaoLinha({
  data,
  rotulo,
}: {
  data: string;
  rotulo: Linha["publicadoRotulo"];
}) {
  return (
    <div className="@min-[560px]:text-right">
      <p className="text-fg3 text-[11px]">{rotulo}</p>
      <p className="font-display text-foreground text-[15px] leading-tight font-medium tabular-nums">
        {data}
      </p>
    </div>
  );
}

/** Chip de estado/desfecho — tokens de estadoIntimacao (cor≠único sinal: o
 *  rótulo textual acompanha sempre a cor). Extraído 1:1 do card anterior. */
function EstadoChip({ estado }: { estado: Linha["estado"] }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: estado.cor, backgroundColor: estado.fundo }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: estado.cor }}
        aria-hidden
      />
      {estado.label}
    </span>
  );
}

/** Prazo — secundário ao lado da publicação; texto simples tabular-nums (sem
 *  pill), tom warning/destructive só reforçando o que o texto já diz por
 *  extenso ("em atraso"/"vence hoje"…), nunca só cor. */
function PrazoLinha({ prazo }: { prazo: Linha["prazo"] }) {
  const semPrazo = prazo.data === "Sem prazo" || prazo.data === "A definir";
  const atraso = prazo.relative.toLowerCase().includes("atraso");
  return (
    <p
      className={cn(
        "text-xs tabular-nums @min-[560px]:text-right",
        atraso
          ? "text-destructive font-medium"
          : prazo.alert
            ? "text-gold-foreground font-medium"
            : "text-muted-foreground",
      )}
    >
      {semPrazo
        ? prazo.data
        : `${prazo.data}${prazo.relative ? ` · ${prazo.relative}` : ""}`}
    </p>
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
  const abrir = () => m.remember();
  return (
    <article className="hover:bg-muted/25 @container transition-colors">
      {/* Responsivo pela largura do CONTÊINER (não viewport — mesmo padrão de
          pipeline/row-triar.tsx): @560px empilha corpo+meta numa coluna
          só; @900px abre a 3ª coluna pro responsável. Só 2 grupos reais
          na coluna meta (cronologia, responsável) — cada um é UMA caixa com
          altura pelo próprio conteúdo, sem row/col fantasma nem espaço vazio
          artificial abaixo do corpo. */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 @min-[560px]:grid @min-[560px]:grid-cols-[minmax(0,1fr)_200px] @min-[560px]:items-start @min-[560px]:gap-x-6 @min-[900px]:grid-cols-[minmax(0,1fr)_180px_180px]">
        {/* CORPO — identidade: título · meta do processo · partes (sempre que
            houver, mesmo com teor) · teor */}
        <div className="min-w-0">
          <Link
            href={m.href(r.id)}
            onClick={abrir}
            className="font-display text-foreground focus-visible:ring-ring hover:text-primary rounded text-base leading-snug font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:ring-2"
          >
            {grouped ? r.ato : r.title}
          </Link>
          <p className="text-muted-foreground mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 font-mono text-xs">
            {!grouped && r.ato ? <span>{r.ato}</span> : null}
            {!grouped && r.ato ? <span aria-hidden>·</span> : null}
            <span className="break-all">{r.cnj}</span>
            {r.tribunal ? <span aria-hidden>·</span> : null}
            {r.tribunal ? <span>{r.tribunal}</span> : null}
          </p>
          {r.partes ? (
            <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
              {r.partes}
            </p>
          ) : null}
          {r.preview ? (
            <TeorContent
              content={r.preview}
              allowLinks={false}
              className="text-foreground/85 mt-1.5 line-clamp-2 text-sm leading-relaxed"
            />
          ) : null}
        </div>

        {/* Cronologia (grupo real, 1 caixa) — publicação protagonista + estado/prazo. */}
        <div className="flex flex-col gap-2 @min-[560px]:items-end">
          <PublicacaoLinha data={r.publicado} rotulo={r.publicadoRotulo} />
          {r.estado.tone !== "pending" ? (
            <EstadoChip estado={r.estado} />
          ) : null}
          <PrazoLinha prazo={r.prazo} />
        </div>

        {/* Responsável — 3ª coluna quando o contêiner comporta (@900px); antes
            disso, cai junto da cronologia (2ª coluna, empilhado). */}
        <div className="flex @min-[560px]:col-start-2 @min-[560px]:justify-end @min-[900px]:col-start-3 @min-[900px]:row-start-1 @min-[900px]:self-start">
          <Responsavel value={r.responsavelId} nome={r.responsavel} />
        </div>
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
