"use client";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  FileText,
  RefreshCw,
  Undo2,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAction } from "@/components/ui/icon-action";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { Thesis } from "../../types";
import { ApplyThesisSelection } from "./thesis-selection";
export function TesesRail({
  theses,
  batch,
  isLoading,
  isError,
  onToggle,
  onFonte,
  teorSourceId,
  isRegenerating,
  isApplying = false,
  disabled = false,
  pregen,
  onRegenerate,
}: {
  theses: Thesis[];
  batch?: {
    ids: string[];
    added: number;
    removed: number;
    changeCount: number;
    selectAll: (selected: boolean) => void;
    reset: () => void;
    apply: () => Promise<void>;
  };
  selectedCount: number;
  isLoading: boolean;
  isError: boolean;
  onToggle: (t: Thesis) => void | Promise<void>;
  onFonte: (id: string, page?: number) => void;
  teorSourceId: string;
  isRegenerating: boolean;
  isApplying?: boolean;
  disabled?: boolean;
  pregen?: boolean;
  onRegenerate?: () => void;
}) {
  const autosCount = theses.filter(
    (t) => t.sourceDocumentId || t.anchors.some((a) => a.documentId),
  ).length;
  if (isLoading)
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">Carregando fundamentos…</span>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-xl">Fundamentos sugeridos</h2>
          {theses.length > 0 && (
            <p className="text-muted-foreground mt-2 text-xs">
              {theses.length} {theses.length === 1 ? "sugestão" : "sugestões"} ·{" "}
              {autosCount}{" "}
              {autosCount === 1
                ? "cita documento dos autos"
                : "citam documentos dos autos"}
            </p>
          )}
        </div>
        {onRegenerate && (
          <IconAction
            icon={RefreshCw}
            label={
              isRegenerating
                ? "Consultando fontes…"
                : isError
                  ? "Tentar atualizar fundamentos novamente"
                  : "Atualizar fundamentos"
            }
            onClick={onRegenerate}
            disabled={disabled || isApplying}
            loading={isRegenerating}
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs leading-relaxed">
          {pregen
            ? "Selecione apenas os fundamentos compatíveis com o objetivo."
            : "Revise a seleção e aplique as alterações de uma vez."}
        </p>
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer">
            Como as sugestões são atualizadas
          </summary>
          <p className="mt-2 leading-relaxed">
            A consulta automática de novos autos acrescenta sugestões e preserva
            suas escolhas e o texto. Confira a aplicabilidade antes de incluir
            um fundamento.
          </p>
        </details>
      </div>
      {isError && (
        <p role="alert" className="text-destructive text-xs">
          Não foi possível atualizar os fundamentos. Suas escolhas foram
          preservadas. Tente novamente.
        </p>
      )}
      {batch && theses.length > 0 && (
        <div
          role="group"
          aria-label="Seleção de fundamentos"
          className="flex flex-col gap-2 border-b pb-3"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all-theses"
                checked={batch.ids.length === theses.length}
                indeterminate={
                  batch.ids.length > 0 && batch.ids.length < theses.length
                }
                disabled={disabled || isRegenerating || isApplying}
                onCheckedChange={(checked) => batch.selectAll(checked === true)}
              />
              <Label htmlFor="select-all-theses">Todas</Label>
              <span
                className="text-muted-foreground text-xs tabular-nums"
                aria-label={`${batch.ids.length} de ${theses.length} fundamentos selecionados`}
              >
                {batch.ids.length}/{theses.length}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <ApplyThesisSelection
                added={batch.added}
                removed={batch.removed}
                disabled={
                  disabled ||
                  isRegenerating ||
                  isApplying ||
                  batch.changeCount === 0
                }
                onApply={batch.apply}
              />
              {batch.changeCount > 0 && (
                <IconAction
                  icon={Undo2}
                  label="Desfazer alterações na seleção"
                  disabled={disabled || isRegenerating || isApplying}
                  onClick={batch.reset}
                />
              )}
            </div>
          </div>
          {batch.changeCount > 0 && (
            <p role="status" className="text-muted-foreground text-xs">
              {batch.added} para adicionar · {batch.removed} para remover
            </p>
          )}
        </div>
      )}
      {isApplying && (
        <p role="status" className="text-muted-foreground text-xs">
          Redigindo a peça com os fundamentos selecionados…
        </p>
      )}
      {isRegenerating && (
        <p role="status" className="text-muted-foreground text-xs">
          Consultando as fontes atualizadas do processo…
        </p>
      )}
      {!theses.length && !isRegenerating && !isError && (
        <EmptyState
          icon={BookOpen}
          title="Nenhum fundamento sugerido"
          description="Atualize as fontes para consultar novas sugestões."
          className="min-h-40 px-4 py-6"
        />
      )}
      {theses.map((t) => {
        const selected = batch
          ? batch.ids.includes(t.id)
          : t.state === "included" || t.state === "pending_add";
        const anchors = t.anchors.length
          ? t.anchors
          : [
              {
                documentId: t.sourceDocumentId,
                label: t.sourceLabel,
                excerpt: t.sourceExcerpt,
                page: 0,
                grounded: t.grounded,
              },
            ];
        return (
          <article
            key={t.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
              selected ? "border-primary/25 bg-primary/5" : "bg-card",
            )}
          >
            <div className="flex items-start gap-2">
              <Checkbox
                id={`thesis-${t.id}`}
                checked={selected}
                disabled={disabled || isRegenerating || isApplying}
                onCheckedChange={() => onToggle(t)}
              />
              <Label
                htmlFor={`thesis-${t.id}`}
                className="min-w-0 text-sm leading-5"
              >
                {t.label}
              </Label>
            </div>
            <p className="text-muted-foreground text-xs leading-5">
              {t.foundation}
            </p>
            {t.legalRef && (
              <p className="flex items-start gap-2 text-xs leading-5">
                <BookOpen
                  aria-hidden
                  className="text-primary mt-0.5 size-3.5 shrink-0"
                />
                {t.legalRef}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {t.grounded
                ? "Referência encontrada · revisar aplicabilidade"
                : "Fundamentação a verificar"}
              {selected ? " · Selecionado" : ""}
            </p>
            <details
              open={pregen || undefined}
              className="group/sources border-t pt-3"
            >
              <summary className="text-primary flex cursor-pointer list-none items-center gap-2 text-xs font-medium [&::-webkit-details-marker]:hidden">
                <FileText aria-hidden className="size-3.5" />
                Autos e referências
                <ChevronDown
                  aria-hidden
                  className="ml-auto size-3.5 transition-transform group-open/sources:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {Array.from(
                  new Map(
                    anchors.map((a) => [
                      `${a.documentId}:${a.page}:${a.excerpt}`,
                      a,
                    ]),
                  ).values(),
                ).map((a, i) => (
                  <div
                    key={`${a.documentId}-${i}`}
                    className="bg-card flex flex-col gap-2 rounded-lg border p-3"
                  >
                    {a.documentId || teorSourceId ? (
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-5 font-medium break-words">
                            {a.label || "Intimação de origem"}
                          </p>
                          {a.page > 0 && (
                            <p className="text-muted-foreground text-[11px]">
                              Página {a.page}
                            </p>
                          )}
                        </div>
                        <IconAction
                          icon={ArrowUpRight}
                          label={`Abrir ${a.label || "intimação de origem"}${a.page > 0 ? `, página ${a.page}` : ""}`}
                          onClick={() =>
                            onFonte(a.documentId || teorSourceId, a.page)
                          }
                        />
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Fundamentação sem documento de origem · confira a
                        referência indicada.
                      </p>
                    )}
                    {a.excerpt.trim() ? (
                      <blockquote className="text-muted-foreground border-primary/20 border-l-2 pl-2 text-xs leading-5 break-words">
                        {a.excerpt}
                      </blockquote>
                    ) : (
                      <p className="text-muted-foreground text-xs leading-5">
                        Nenhum trecho literal validado para este fundamento.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}
