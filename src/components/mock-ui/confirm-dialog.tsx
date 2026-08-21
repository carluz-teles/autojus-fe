"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "./button";

/**
 * Confirmação de ação destrutiva — padrão único do app: SEMPRE um dialog
 * modal (nunca linha inline expandindo), sobre o AlertDialog do base-ui
 * (role="alertdialog", foco preso, Esc fecha, clique fora NÃO fecha — é
 * proposital, ação destrutiva não deve fechar sem decisão explícita). Mesmo
 * motor/animação do Sheet (mock-ui/sheet.tsx): data-starting-style/
 * data-ending-style do base-ui. Resultado da ação (sucesso/erro) é sempre
 * toast — nunca texto inline aqui (fonte única de feedback pós-ação).
 */
export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  onFechar,
  onConfirmar,
  confirmando,
  confirmLabel = "Confirmar",
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  onConfirmar: () => void;
  confirmando?: boolean;
  confirmLabel?: string;
}) {
  return (
    <AlertDialog.Root
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onFechar();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-[oklch(0.24_0.02_165/25%)] backdrop-blur-[2px] transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-[0_20px_60px_oklch(0.24_0.02_165/18%)] outline-none transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <AlertDialog.Title className="font-display text-lg leading-snug">
            {titulo}
          </AlertDialog.Title>
          {descricao ? (
            <AlertDialog.Description className="mt-1.5 text-[13px] text-muted-foreground">
              {descricao}
            </AlertDialog.Description>
          ) : null}
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onFechar}
              disabled={confirmando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onConfirmar}
              disabled={confirmando}
            >
              {confirmando ? "Confirmando…" : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
