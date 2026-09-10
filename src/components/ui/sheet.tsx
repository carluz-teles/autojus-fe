"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
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
      <Dialog.Backdrop
        data-slot="sheet-backdrop"
        className="bg-foreground/25 fixed inset-0 z-40 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
      />
      <Dialog.Popup
        data-slot="sheet-content"
        className={cn(
          "bg-card text-card-foreground fixed inset-y-0 right-0 z-50 flex w-full max-w-[30rem] flex-col border-l shadow-2xl outline-none",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {eyebrow}
              </div>
            ) : null}
            <Dialog.Title className="font-display text-xl leading-tight tracking-tight break-words tabular-nums">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <Tooltip
            label="Fechar painel"
            render={
              <Dialog.Close
                aria-label="Fechar"
                render={<Button variant="ghost" size="icon-sm" />}
              />
            }
          >
            <X aria-hidden />
          </Tooltip>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {children}
        </div>

        {footer ? (
          <div className="bg-card/85 flex flex-wrap items-center justify-end gap-2 border-t px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
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
