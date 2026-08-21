"use client";

import { Popover } from "@base-ui/react/popover";
import { Bell } from "lucide-react";

import { useMarkNotifications } from "../hooks/use-mark-notifications";
import { useNotifications } from "../hooks/use-notifications";
import { useUnreadCount } from "../hooks/use-unread-count";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

// Sino de notificações no header: badge de não-lidas + painel sobre o Popover do
// base-ui (foco-trap, escape, clique-fora, portal e animação de graça — mesmo
// motor do UserMenu/Sheet). A lista e o badge se atualizam sozinhos: o stream SSE
// (3b) invalida as queries no push. Clicar num aviso não-lido marca como lido;
// "Marcar todas" zera o badge.
export function NotificationBell() {
  const { data: unread } = useUnreadCount();
  const { data: page, isPending } = useNotifications();
  const { markOne, markAll } = useMarkNotifications();

  const count = unread?.count ?? 0;
  const items = page?.data ?? [];

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Notificações"
        className="hover:bg-muted relative flex size-9 items-center justify-center rounded-full transition-colors"
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="bg-destructive absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white tabular-nums">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="bg-popover w-80 overflow-hidden rounded-xl border shadow-lg outline-none transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-medium">Notificações</span>
              {count > 0 ? (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="text-muted-foreground hover:text-foreground text-xs disabled:opacity-50"
                >
                  Marcar todas
                </button>
              ) : null}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isPending ? (
                <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                  Carregando…
                </p>
              ) : items.length === 0 ? (
                <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                  Nenhuma notificação por aqui.
                </p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.read && markOne.mutate(n.id)}
                    className="hover:bg-muted flex w-full flex-col items-start gap-0.5 border-b px-4 py-3 text-left last:border-b-0"
                  >
                    <span className="flex w-full items-center gap-2">
                      {!n.read ? (
                        <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                      ) : null}
                      <span
                        className={`flex-1 text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}
                      >
                        {n.title}
                      </span>
                      <time className="text-muted-foreground shrink-0 text-[11px]">
                        {fmtWhen(n.created_at)}
                      </time>
                    </span>
                    {n.body ? (
                      <span className="text-muted-foreground line-clamp-2 pl-3.5 text-xs">
                        {n.body}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
