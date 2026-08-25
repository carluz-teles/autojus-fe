"use client";

// Card compartilhado entre Ajuste proposto (iteração do usuário) e Revisão
// (análise proativa). Mesma anatomia: badge de categoria à esquerda + título
// da seção à direita → explicação curta → diff em blocos (removido/adicionado)
// → ações Aplicar/Descartar. A origem da sugestão não muda a UI.

import { cn } from "@/lib/utils";

import type { PendingChange } from "../../types";

interface Props {
  change: PendingChange;
  onAccept: () => void;
  onDismiss: () => void;
}

export function ChangeCard({ change, onAccept, onDismiss }: Props) {
  return (
    <article className="border-border rounded-lg border p-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <span
          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase"
          style={{
            background: "color-mix(in oklch, var(--gold) 22%, transparent)",
            color: "color-mix(in oklch, var(--gold) 65%, var(--foreground))",
          }}
        >
          {change.category}
        </span>
        <span className="text-muted-foreground text-[11.5px]">
          {change.sectionRoman} — {shortTitleOf(change.sectionTitle)}
        </span>
      </header>

      {change.explanation && (
        <p className="text-muted-foreground mb-2 text-[12px] leading-[1.5]">
          {change.explanation}
        </p>
      )}

      <BlockDiff
        oldParagraphs={change.oldParagraphs}
        newParagraphs={change.newParagraphs}
      />

      <div className="mt-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onAccept}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="border-border hover:bg-muted rounded-md border bg-transparent px-3 py-1 text-[12px] font-medium transition-colors"
        >
          Descartar
        </button>
      </div>
    </article>
  );
}

/** Diff em blocos separados: um bloco vermelho (removido, tachado) + um bloco
 *  verde (adicionado). Cada parágrafo mantido em linha própria, prefixado por
 *  "−" ou "+" (estilo git). */
function BlockDiff({
  oldParagraphs,
  newParagraphs,
}: {
  oldParagraphs: string[];
  newParagraphs: string[];
}) {
  return (
    <div className="border-border overflow-hidden rounded-md border">
      {oldParagraphs.length > 0 && (
        <DiffBlock kind="removed">
          {oldParagraphs.map((p, i) => (
            <DiffLine key={`old-${i}`} prefix="−">
              {p}
            </DiffLine>
          ))}
        </DiffBlock>
      )}
      {newParagraphs.length > 0 && (
        <DiffBlock kind="added">
          {newParagraphs.map((p, i) => (
            <DiffLine key={`new-${i}`} prefix="+">
              {p}
            </DiffLine>
          ))}
        </DiffBlock>
      )}
    </div>
  );
}

function DiffBlock({
  kind,
  children,
}: {
  kind: "removed" | "added";
  children: React.ReactNode;
}) {
  const bg =
    kind === "removed"
      ? "color-mix(in oklch, var(--destructive) 10%, transparent)"
      : "color-mix(in oklch, var(--success) 12%, transparent)";
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-2.5 py-1.5",
        kind === "removed" && "border-border border-b",
      )}
      style={{ background: bg }}
    >
      {children}
    </div>
  );
}

function DiffLine({
  prefix,
  children,
}: {
  prefix: "−" | "+";
  children: React.ReactNode;
}) {
  const isRemoved = prefix === "−";
  return (
    <p
      className={cn(
        "text-[12.5px] leading-[1.5]",
        isRemoved && "text-muted-foreground line-through",
      )}
    >
      <span className="mr-1.5 font-mono text-[11px] opacity-60">{prefix}</span>
      {children}
    </p>
  );
}

function shortTitleOf(title: string): string {
  return title.replace(/^(dos?|das?|do|da)\s+/i, "").trim();
}
