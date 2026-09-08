"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  if (isLoading) return <p role="status">Carregando fundamentos…</p>;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">Fundamentos sugeridos</h2>
        {theses.length > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">
            {theses.length} {theses.length === 1 ? "sugestão" : "sugestões"} ·{" "}
            {autosCount}{" "}
            {autosCount === 1
              ? "cita documento dos autos"
              : "citam documentos dos autos"}
          </p>
        )}
        <p className="text-muted-foreground mt-1 text-xs">
          {pregen
            ? "Selecione apenas os fundamentos compatíveis com o objetivo."
            : "Marque ou desmarque os fundamentos e aplique todas as alterações de uma vez."}{" "}
          A consulta automática de novos autos apenas acrescenta sugestões e
          preserva suas escolhas e o texto.
        </p>
      </div>
      {isError && (
        <p role="alert" className="text-destructive text-xs">
          Não foi possível atualizar os fundamentos. Suas escolhas foram
          preservadas. Tente novamente.
        </p>
      )}
      {onRegenerate && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={disabled || isRegenerating || isApplying}
        >
          {isRegenerating
            ? "Consultando fontes…"
            : isError
              ? "Tentar novamente"
              : "Atualizar fundamentos"}
        </Button>
      )}
      {batch && theses.length > 0 && (
        <div className="bg-background sticky top-0 z-10 flex flex-col gap-3 border-y py-3">
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
            <Label htmlFor="select-all-theses">Selecionar todas</Label>
            <span className="text-muted-foreground ml-auto text-xs">
              {batch.ids.length}/{theses.length}
            </span>
          </div>
          <p role="status" className="text-muted-foreground text-xs">
            {batch.changeCount > 0
              ? `${batch.added} para adicionar · ${batch.removed} para remover`
              : "Nenhuma alteração pendente"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
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
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled || isRegenerating || isApplying}
                onClick={batch.reset}
              >
                Desfazer
              </Button>
            )}
          </div>
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
        <p className="text-muted-foreground text-xs">
          Nenhum fundamento sugerido.
        </p>
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
          <article key={t.id} className="space-y-3 rounded-md border p-3">
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
            {t.legalRef && <p className="text-xs">{t.legalRef}</p>}
            <p className="text-muted-foreground text-xs">
              {t.grounded
                ? "Referência encontrada · revisar aplicabilidade"
                : "Fundamentação a verificar"}
              {selected ? " · Selecionado" : ""}
            </p>
            <details>
              <summary className="cursor-pointer text-xs">
                Consultar referências
              </summary>
              <div className="mt-2 space-y-3">
                {Array.from(
                  new Map(
                    anchors.map((a) => [
                      `${a.documentId}:${a.page}:${a.excerpt}`,
                      a,
                    ]),
                  ).values(),
                ).map((a, i) => (
                  <div key={`${a.documentId}-${i}`}>
                    {a.documentId || teorSourceId ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-left whitespace-normal"
                        onClick={() =>
                          onFonte(a.documentId || teorSourceId, a.page)
                        }
                      >
                        {a.label || "Intimação de origem"}
                        {a.page > 0 ? ` · pág. ${a.page}` : ""}
                      </Button>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Fundamentação sem documento de origem · confira a
                        referência indicada.
                      </p>
                    )}
                    <blockquote className="text-muted-foreground border-l-2 pl-2 text-xs">
                      {a.excerpt}
                    </blockquote>
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
