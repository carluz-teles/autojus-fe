"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { Button } from "./button";

// Slide-over sobre o Dialog do base-ui (foco-trap, scroll-lock, escape e portal
// de graça) — mesmo motor do src/components/ui/sheet.tsx, API própria (aberto/
// titulo/onFechar/...) preservada pra não mexer nos chamadores (filtros.tsx,
// configuracoes/tabs.tsx). A animação usa os data-attrs que o base-ui liga
// transitoriamente: [data-starting-style] antes de abrir, [data-ending-style]
// durante o fechamento — desliza da direita, backdrop em fade.
export function Sheet({
  aberto,
  titulo,
  descricao,
  onFechar,
  onLimpar,
  rodape,
  children,
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  onLimpar?: () => void;
  /** Substitui o rodapé padrão (Limpar tudo / Ver resultados) — usado quando o
   * conteúdo é um form com ações próprias (Cancelar / Salvar). */
  rodape?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onFechar();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[oklch(0.24_0.02_165/25%)] backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="border-border bg-card fixed inset-y-0 right-0 z-40 flex w-[420px] flex-col border-l shadow-[-12px_0_40px_oklch(0.24_0.02_165/14%)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full">
          <header className="border-border flex items-start justify-between gap-4 border-b px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl leading-snug">
                {titulo}
              </Dialog.Title>
              {descricao && (
                <Dialog.Description className="text-muted-foreground mt-1 text-[12.5px]">
                  {descricao}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-3"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4.5 overflow-y-auto px-6 py-5">
            {children}
          </div>

          <footer className="border-border flex items-center justify-between gap-2 border-t px-6 py-4">
            {rodape ?? (
              <>
                {onLimpar ? (
                  <Button variant="outline" size="sm" onClick={onLimpar}>
                    Limpar tudo
                  </Button>
                ) : (
                  <span />
                )}
                <Button onClick={onFechar}>Ver resultados</Button>
              </>
            )}
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
