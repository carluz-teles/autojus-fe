"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

// Sino de notificações no header: badge de não-lidas + painel (dropdown headless, o
// mesmo molde do UserMenu — fecha ao clicar fora ou no Esc). A lista e o badge se
// atualizam sozinhos: o stream SSE (3b) invalida as queries no push. Clicar num aviso
// não-lido marca como lido; "Marcar todas" zera o badge.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unread } = useUnreadCount();
  const { data: page, isPending } = useNotifications();
  const { markOne, markAll } = useMarkNotifications();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = unread?.count ?? 0;
  const items = page?.data ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificações"
        aria-haspopup="menu"
        aria-expanded={open}
        className="hover:bg-muted relative flex size-9 items-center justify-center rounded-full transition-colors"
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="bg-destructive absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white tabular-nums">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="bg-popover absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border shadow-lg"
        >
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
        </div>
      ) : null}
    </div>
  );
}
