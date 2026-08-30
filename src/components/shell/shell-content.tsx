"use client";

import { usePathname } from "next/navigation";

import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { cn } from "@/lib/utils";

import { BreadcrumbProvider, BreadcrumbSlot } from "./breadcrumb-context";

// Região de conteúdo do shell. Telas portadas pra casca nova (ex.: /prazos) são
// FULL-BLEED (own top bar, sem header/padding globais). As telas ainda NÃO
// portadas mantêm o header (breadcrumb + sino) e o padding de página — assim o
// rebranding é incremental sem quebrar o que já existe.
const BLEED_PREFIXES = ["/prazos"];

export function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bleed = BLEED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {bleed ? (
          children
        ) : (
          <div className="flex min-h-0 flex-1 [scrollbar-gutter:stable] flex-col overflow-y-auto">
            <header className="bg-background/80 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 backdrop-blur-sm">
              <div className="min-w-0 flex-1">
                <BreadcrumbSlot />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NotificationBell />
              </div>
            </header>
            <main className={cn("w-full flex-1 px-6 py-10")}>{children}</main>
          </div>
        )}
      </div>
    </BreadcrumbProvider>
  );
}
