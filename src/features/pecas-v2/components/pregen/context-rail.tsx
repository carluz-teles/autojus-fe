"use client";
import { ArrowUpRight, CalendarDays, FileText, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAction } from "@/components/ui/icon-action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { PecaContexto, PecaContextoDoc } from "../../lib/peca-contexto";

export function ContextRail({
  contexto,
  onVerTeor,
  onVerAuto,
  tesesSlot,
  documentActions,
  summarySlot,
  attachmentsSlot,
  activeTab,
  onTabChange,
}: {
  contexto: PecaContexto;
  highlightedDocId: string | null;
  onVerTeor: () => void;
  onVerAuto: (d: PecaContextoDoc) => void;
  openingDocId: string | null;
  tesesSlot?: ReactNode;
  documentActions?: ReactNode;
  summarySlot?: ReactNode;
  attachmentsSlot?: ReactNode;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}) {
  const { processo, intimacao, partes, autos } = contexto;
  return (
    <aside
      aria-label="Contexto da peça"
      className="bg-card flex min-h-0 w-full flex-col text-sm"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange?.(String(value))}
        defaultValue="summary"
        className="min-h-0 flex-1"
      >
        <TabsList aria-label="Contexto da peça">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          {attachmentsSlot && (
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
          )}
          {tesesSlot && <TabsTrigger value="grounds">Teses</TabsTrigger>}
        </TabsList>
        <TabsContent value="summary" keepMounted className="m-0 animate-none">
          <div className="bg-muted/50 m-4 rounded-lg border p-4">
            <p className="text-muted-foreground flex items-center gap-2 text-[10px] font-medium tracking-widest uppercase">
              <CalendarDays aria-hidden className="size-3.5" />
              Prazo da intimação
            </p>
            <p className="font-display mt-2 text-xl">
              {intimacao.prazoLabel || "Sem prazo confirmado"}
            </p>
          </div>
          {summarySlot}
          <section
            aria-label="Dados do processo"
            className="flex flex-col gap-5 p-4"
          >
            <h3 className="font-display text-lg">O processo</h3>
            <div className="rounded-lg border p-3">
              <p className="text-primary font-mono text-[11px] break-all">
                {processo.cnj}
              </p>
              <p className="mt-2">{processo.classe}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {[processo.orgao, processo.tribunalGrau]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-muted-foreground text-xs">Assunto</dt>
                <dd>{processo.assunto || "Não informado"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  Valor da causa
                </dt>
                <dd>{processo.valor || "Não informado"}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-lg">Partes envolvidas</h3>
              {partes.map((p) => (
                <div
                  className="border-l-2 pl-3"
                  key={`${p.roleLabel}-${p.name}`}
                >
                  <p className="text-muted-foreground text-xs">{p.roleLabel}</p>
                  <p>{p.name}</p>
                  {p.counselLabel && (
                    <p className="text-muted-foreground text-xs">
                      {p.counselLabel}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </TabsContent>
        {attachmentsSlot && (
          <TabsContent
            value="attachments"
            keepMounted
            className="m-0 animate-none p-4"
          >
            {attachmentsSlot}
          </TabsContent>
        )}
        <TabsContent
          value="sources"
          keepMounted
          className="m-0 animate-none p-4"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-display text-xl">Fontes do processo</h3>
                <p className="text-muted-foreground text-xs">
                  {new Set(autos.map((d) => d.id)).size} documentos nos autos
                </p>
              </div>
              {documentActions}
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Consulte os originais. Uma fonte só fundamenta a peça quando
              citada no texto.
            </p>
            {intimacao.id ? (
              <SourceDocumentRow
                title="Intimação de origem"
                meta={`Publicação: ${intimacao.publishedAt || "Não informada"}`}
                status={
                  intimacao.teor.trim()
                    ? "Teor disponível"
                    : "Teor indisponível"
                }
                disabled={!intimacao.teor.trim()}
                onOpen={onVerTeor}
              />
            ) : (
              <p className="text-muted-foreground text-xs">
                Sem intimação de origem. Consulte os documentos abaixo.
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                Biblioteca dos autos
              </p>
              <Badge variant="outline">
                {new Set(autos.map((d) => d.id)).size}
              </Badge>
            </div>
            {autos.length === 0 && (
              <EmptyState
                icon={FolderOpen}
                title="Seus autos, reunidos aqui"
                description="Confira a integração ou envie um PDF pelo ícone acima."
                className="min-h-40 px-4 py-6"
              />
            )}
            <div className="flex flex-col gap-2">
              {Array.from(new Map(autos.map((a) => [a.id, a])).values()).map(
                (d) => (
                  <SourceDocumentRow
                    key={d.id}
                    title={d.name}
                    meta={d.meta}
                    disabled={d.status === "PENDING" || d.status === "FAILED"}
                    onOpen={() => onVerAuto(d)}
                    status={
                      d.status === "FAILED"
                        ? "Falha no processamento · indisponível"
                        : d.status === "READY"
                          ? "Texto disponível"
                          : d.status === "PENDING"
                            ? "Aguardando download"
                            : d.status
                              ? "Processando · texto indisponível"
                              : d.category
                    }
                  />
                ),
              )}
            </div>
          </div>
        </TabsContent>
        {tesesSlot && (
          <TabsContent
            value="grounds"
            keepMounted
            className="m-0 animate-none p-4"
          >
            {tesesSlot}
          </TabsContent>
        )}
      </Tabs>
    </aside>
  );
}

function SourceDocumentRow({
  title,
  meta,
  status,
  disabled,
  onOpen,
}: {
  title: string;
  meta?: string;
  status?: string;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <article className="bg-card hover:border-primary/25 flex items-start gap-2 rounded-xl border p-3 transition-colors">
      <span className="bg-muted/60 text-primary mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg">
        <FileText aria-hidden className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h4 className="text-sm leading-5 font-medium break-words">{title}</h4>
        {meta && (
          <p className="text-muted-foreground text-[11px] leading-4 break-words">
            {meta}
          </p>
        )}
        {status && (
          <p className="text-muted-foreground text-[11px] leading-4">
            {status}
          </p>
        )}
      </div>
      <IconAction
        icon={ArrowUpRight}
        label={`Abrir ${title}`}
        disabled={disabled}
        onClick={onOpen}
      />
    </article>
  );
}
