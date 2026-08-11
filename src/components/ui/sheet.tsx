"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// Slide-over drawer sobre o Dialog do base-ui (foco-trap, scroll-lock, escape e
// portal de graça). A animação de entrada/saída usa os data-attrs que o base-ui
// liga transitoriamente: [data-starting-style] antes de abrir e [data-ending-style]
// durante o fechamento — o painel desliza da direita e o backdrop faz fade.
// Mantém a linguagem "Ledger" (bg-card, borda, Fraunces no título).

export function Sheet(props: Dialog.Root.Props) {
  return <Dialog.Root {...props} />;
}

export function SheetContent({
  title,
  description,
  eyebrow,
  children,
  footer,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="bg-foreground/25 fixed inset-0 z-40 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <Dialog.Popup
        className={cn(
          "bg-card text-card-foreground fixed inset-y-0 right-0 z-50 flex w-full max-w-[30rem] flex-col border-l shadow-2xl outline-none",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {eyebrow}
              </div>
            ) : null}
            <Dialog.Title className="font-display truncate text-xl leading-tight tracking-tight tabular-nums">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <Dialog.Close
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring/50 -mr-1.5 shrink-0 rounded-md p-1.5 transition-colors outline-none focus-visible:ring-3"
          >
            <X className="size-4" />
          </Dialog.Close>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer ? (
          <div className="bg-card/85 flex items-center justify-end gap-2 border-t px-6 py-4 backdrop-blur">
            {footer}
          </div>
        ) : null}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

// Bloco de conteúdo do drawer (um título curto + corpo em cartão). accent usa o
// latão pra marcar o bloco de maior peso (ex.: "O que fazer" / prazo).
export function SheetSection({
  title,
  children,
  accent,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      <div
        className={cn(
          "text-foreground/85 mt-2 rounded-xl border p-4 text-sm leading-relaxed",
          accent ? "border-gold/30 bg-gold/5" : "bg-card",
        )}
      >
        {children}
      </div>
    </section>
  );
}

// Par rótulo/valor para as fichas de metadados. emphasis destaca o valor (prazo).
export function SheetField({
  label,
  children,
  emphasis,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-sm tabular-nums",
          emphasis && "text-gold font-medium",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
