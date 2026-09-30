"use client";

import {
  ArrowDownUp,
  ChevronRight,
  FileText,
  FolderOpen,
  FolderTree,
  Info,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";

import type { AutosTreeState } from "../hooks/use-autos-tree";
import { formatarReferenciaAuto, rotuloTipoAuto } from "../lib/tipo-autos";
import type { AutosNode, AutosUnavailableDocument } from "../types";

const EVENT_DETAIL_PREVIEW_LENGTH = 180;

function eventDetailPreview(detail: string): string {
  const normalized = detail.trim().replace(/\s+/g, " ");
  return normalized.length > EVENT_DETAIL_PREVIEW_LENGTH
    ? `${normalized.slice(0, EVENT_DETAIL_PREVIEW_LENGTH).trimEnd()}…`
    : normalized;
}

export function AutosTree({ autos }: { autos: AutosTreeState }) {
  // The API paginates unmapped documents individually. Merge every loaded page
  // into one UI group without changing its cursor or inventing an event identity.
  const displayedNodes: AutosNode[] = autos.nodes.filter(
    (node) => node.kind !== "unmapped",
  );
  const unmappedDocuments = autos.nodes.flatMap((node) =>
    node.kind === "unmapped" ? node.documents : [],
  );
  if (unmappedDocuments.length > 0) {
    displayedNodes.push({
      kind: "unmapped",
      id: "autos-unmapped",
      documents: unmappedDocuments,
    });
  }
  return (
    <div>
      <div className="min-w-0">
        <div className="bg-muted/40 text-muted-foreground mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Esta árvore mostra eventos e documentos com autos associados.
            Movimentos sem documentos não aparecem aqui.
          </p>
        </div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">Buscar nos autos</span>
            <Search
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              value={autos.search}
              onChange={autos.onSearchChange}
              placeholder="Evento, título ou documento"
              className="pl-9"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={autos.toggleOrder}>
              <ArrowDownUp data-icon="inline-start" aria-hidden />
              {autos.order === "newest" ? "Mais recentes" : "Mais antigos"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={autos.toggleVisibleEvents}
            >
              <FolderTree data-icon="inline-start" aria-hidden />
              {autos.allVisibleExpanded ? "Recolher grupos" : "Expandir grupos"}
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mb-3 text-xs" aria-live="polite">
          {displayedNodes.length} grupos carregados · {autos.filteredTotal} de{" "}
          {autos.total} documentos
          {autos.unavailableTotal > 0
            ? ` · ${autos.unavailableFilteredTotal} referências indisponíveis`
            : null}
        </p>
        {autos.isPending ? <SkeletonRows rows={4} /> : null}
        {autos.isError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"
          >
            <p>Não foi possível carregar os autos.</p>
            <Button size="sm" variant="outline" onClick={autos.retry}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {!autos.isPending && !autos.isError && autos.nodes.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={
              autos.search
                ? "Nenhum auto encontrado"
                : "Os autos ainda não estão disponíveis"
            }
            description={
              autos.search
                ? "Busque pelo número do evento, código, título ou arquivo."
                : "Sincronize com o tribunal ou adicione um PDF do escritório."
            }
          />
        ) : null}
        {!autos.isPending && !autos.isError ? (
          <ol
            aria-label="Árvore cronológica dos autos"
            className="flex flex-col"
          >
            {displayedNodes.map((node) => (
              <li
                key={node.id}
                className="border-border border-l-2 pl-4 [contain-intrinsic-size:0_74px] [content-visibility:auto] sm:pl-5"
              >
                {node.kind !== "unmapped" ? (
                  <>
                    <button
                      type="button"
                      value={node.id}
                      aria-expanded={autos.expanded.has(node.id)}
                      aria-controls={
                        autos.expanded.has(node.id)
                          ? `autos-${node.id}`
                          : undefined
                      }
                      onClick={autos.onEventToggle}
                      className="hover:bg-muted/50 focus-visible:ring-ring/50 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-3"
                    >
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          "text-muted-foreground mt-0.5 size-4 shrink-0",
                          autos.expanded.has(node.id) && "rotate-90",
                        )}
                      />
                      <FolderOpen
                        aria-hidden
                        className="text-primary mt-0.5 size-4 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {node.kind === "event"
                              ? `Evento ${node.event_number}`
                              : `Documento ${node.external_group_ref || "dos autos"}`}
                          </Badge>
                          <span className="text-sm font-medium">
                            {node.description ||
                              (node.kind === "event"
                                ? "Evento do processo"
                                : "Documento dos autos")}
                          </span>
                          {node.group_scope === "SIGILOSOS" ? (
                            <Badge variant="secondary">Sigiloso</Badge>
                          ) : null}
                        </span>
                        {node.detail ? (
                          <span className="text-muted-foreground mt-1 block text-xs">
                            {eventDetailPreview(node.detail)}
                          </span>
                        ) : null}
                        <span className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 text-xs">
                          {node.occurred_at ? (
                            <time dateTime={node.occurred_at}>
                              {node.kind === "document" ? "Incluído em " : ""}
                              {new Date(node.occurred_at).toLocaleString("pt-BR")}
                            </time>
                          ) : (
                            <span>Data não informada</span>
                          )}
                          <span aria-hidden>·</span>
                          <span>
                            {node.kind === "document"
                              ? `${node.documents.length} ${node.documents.length === 1 ? "unidade carregada" : "unidades carregadas"}`
                              : `${node.documents.length} ${node.documents.length === 1 ? "documento" : "documentos"}`}
                          </span>
                          {node.unavailable_count ? (
                            <>
                              <span aria-hidden>·</span>
                              <span>
                                {node.unavailable_count} indisponíveis
                              </span>
                            </>
                          ) : null}
                          {node.actor ? (
                            <>
                              <span aria-hidden>·</span>
                              <span>Responsável: {node.actor}</span>
                            </>
                          ) : null}
                        </span>
                      </span>
                    </button>
                    {autos.expanded.has(node.id) ? (
                      <ol
                        id={`autos-${node.id}`}
                        className="border-border ml-8 flex flex-col border-l pb-3 sm:ml-9"
                      >
                        {node.documents.map((doc) => (
                          <AutosDocumentRow
                            key={doc.id}
                            doc={doc}
                            autos={autos}
                          />
                        ))}
                        {node.unavailable_documents?.map((doc) => (
                          <AutosUnavailableRow
                            key={`${doc.external_ref}-${doc.external_page}`}
                            doc={doc}
                            sourceSystem={node.source_system}
                          />
                        ))}
                      </ol>
                    ) : null}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      value={node.id}
                      aria-expanded={autos.expanded.has(node.id)}
                      aria-controls={
                        autos.expanded.has(node.id)
                          ? `autos-${node.id}`
                          : undefined
                      }
                      onClick={autos.onEventToggle}
                      className="hover:bg-muted/50 focus-visible:ring-ring/50 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-3"
                    >
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          "text-muted-foreground mt-0.5 size-4 shrink-0",
                          autos.expanded.has(node.id) && "rotate-90",
                        )}
                      />
                      <FolderOpen
                        aria-hidden
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <Badge variant="secondary">Sem evento confirmado</Badge>
                        <span className="text-muted-foreground mt-1 block text-xs">
                          {node.documents.length} documentos carregados ·
                          uploads e autos sem vínculo confirmado
                        </span>
                      </span>
                    </button>
                    {autos.expanded.has(node.id) ? (
                      <ol
                        id={`autos-${node.id}`}
                        className="border-border ml-8 flex flex-col border-l pb-3 sm:ml-9"
                      >
                        {node.documents.map((doc) => (
                          <AutosDocumentRow
                            key={doc.id}
                            doc={doc}
                            autos={autos}
                          />
                        ))}
                      </ol>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ol>
        ) : null}
        {autos.hasNextPage ? (
          <Button
            className="mt-4"
            variant="outline"
            disabled={autos.isFetchingNextPage}
            onClick={autos.loadMore}
          >
            {autos.isFetchingNextPage ? "Carregando…" : "Mostrar mais grupos"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function AutosDocumentRow({
  doc,
  autos,
}: {
  doc: AutosTreeState["nodes"][number]["documents"][number];
  autos: AutosTreeState;
}) {
  const isESAJ = doc.source_system === "ESAJ";
  const title = isESAJ
    ? doc.title || "Documento dos autos"
    : rotuloTipoAuto(doc.document_type);
  const reference =
    isESAJ && doc.court_reference
      ? formatarReferenciaAuto(doc.court_reference)
      : null;
  const pages =
    doc.pages ||
    (isESAJ && doc.court_reference?.folio_verified
      ? doc.court_reference.page_count
      : undefined);
  return (
    <li className="list-none pl-3 [contain-intrinsic-size:0_48px] [content-visibility:auto]">
      <button
        type="button"
        value={doc.id}
        aria-label={`${doc.status === "PENDING" ? "Selecionar" : "Abrir"} documento ${title}`}
        aria-current={doc.id === autos.selectedId ? "true" : undefined}
        onClick={autos.onDocumentSelect}
        className={cn(
          "hover:bg-muted/60 focus-visible:ring-ring/50 my-0.5 flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left outline-none focus-visible:ring-3",
          doc.id === autos.selectedId && "border-primary/20 bg-primary/5",
        )}
      >
        <FileText
          aria-hidden
          className="text-muted-foreground size-4 shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{title}</span>
            {!isESAJ && doc.court_document_code ? (
              <code className="text-muted-foreground text-[11px]">
                {doc.court_document_code}
              </code>
            ) : null}
          </span>
          <span className="text-muted-foreground mt-0.5 block text-xs">
            {reference ? `${reference} · ` : ""}
            {pages
              ? `${pages} ${pages === 1 ? "página" : "páginas"}${isESAJ ? " no PDF" : ""}`
              : "Páginas ainda não identificadas"}
          </span>
        </span>
        <Badge
          variant={
            doc.status === "READY"
              ? "success"
              : doc.status === "FAILED"
                ? "warning"
                : "secondary"
          }
        >
          {doc.status === "READY"
            ? "Pronto"
            : doc.status === "FAILED"
              ? "Falha"
              : "Processando"}
        </Badge>
      </button>
    </li>
  );
}

function AutosUnavailableRow({
  doc,
  sourceSystem,
}: {
  doc: AutosUnavailableDocument;
  sourceSystem?: string;
}) {
  const reason =
    doc.reason === "access_denied" || doc.reason === "absolute_restriction"
      ? "Acesso negado"
      : doc.reason === "opening_pending"
        ? "Abertura pendente"
        : doc.reason === "unsupported_media_type"
          ? "Formato indisponível"
          : "Indisponível";
  return (
    <li className="list-none pl-3 [contain-intrinsic-size:0_48px] [content-visibility:auto]">
      <div className="text-muted-foreground my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
        <FileText aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {sourceSystem === "ESAJ"
            ? `Documento ${doc.external_ref}, unidade ${doc.external_page}`
            : `Documento ${doc.court_document_code || doc.external_ref}`}
        </span>
        <Badge variant="warning">{reason}</Badge>
      </div>
    </li>
  );
}
