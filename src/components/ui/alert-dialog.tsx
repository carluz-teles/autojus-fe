"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";

import { cn } from "@/lib/utils";

// Confirmação de ação destrutiva (ex.: remover credencial). Sobre o
// AlertDialog do base-ui — mesma família do Dialog usado no Sheet (foco-trap,
// scroll-lock, escape, portal de graça) mas sem dispensar em clique fora do
// backdrop, comportamento certo pra uma confirmação. Não existia nenhum
// componente/​padrão de confirmação no repo (grep não achou AlertDialog nem
// window.confirm) — criado do zero seguindo a linguagem visual do Sheet
// (bg-card, borda, Fraunces no título) em vez do output padrão do shadcn CLI.

export function AlertDialog(props: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root {...props} />;
}

export function AlertDialogContent({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className="bg-foreground/25 fixed inset-0 z-40 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <AlertDialogPrimitive.Popup
        className={cn(
          "bg-card text-card-foreground fixed top-1/2 left-1/2 z-50 w-full max-w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-2xl outline-none",
          "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
          className,
        )}
      >
        <AlertDialogPrimitive.Title className="font-display text-lg leading-tight tracking-tight">
          {title}
        </AlertDialogPrimitive.Title>
        {description ? (
          <AlertDialogPrimitive.Description className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {description}
          </AlertDialogPrimitive.Description>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? (
          <div className="mt-6 flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  );
}

export const AlertDialogClose = AlertDialogPrimitive.Close;
