"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

/**
 * Modal genérico centralizado — mesmo motor/visual do ConfirmDialog
 * (base-ui Dialog, mesma animação), mas pra conteúdo arbitrário (forms),
 * não só confirmação. Fecha no Esc e no clique fora (diferente do
 * ConfirmDialog, que trava — aqui não é ação destrutiva).
 */
export function Dialog({
  aberto,
  titulo,
  onFechar,
  children,
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  return (
    <BaseDialog.Root
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onFechar();
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-[oklch(0.24_0.02_165/25%)] backdrop-blur-[2px] transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <BaseDialog.Popup className="border-border bg-card fixed top-1/2 left-1/2 z-50 w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-[0_20px_60px_oklch(0.24_0.02_165/18%)] transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <div className="flex items-start justify-between gap-4">
            <BaseDialog.Title className="font-display text-lg leading-snug">
              {titulo}
            </BaseDialog.Title>
            <BaseDialog.Close
              aria-label="Fechar"
              className="text-muted-foreground hover:bg-muted hover:text-foreground -mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <X className="size-4" />
            </BaseDialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
