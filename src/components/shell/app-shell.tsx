import { TrialBanner } from "@/features/billing/components/trial-banner";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { NotificationStream } from "@/features/notifications/notification-stream";

import { BreadcrumbProvider, BreadcrumbSlot } from "./breadcrumb-context";
import { EnsureActiveOrg } from "./ensure-active-org";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

// Chrome do app autenticado (Server Component). A auth já é garantida no proxy.
// A sidebar carrega a identidade do tenant no topo (SidebarOrg: logo + nome da
// org, → /organization) e, no rodapé, uma seção separada com Configurações + a
// versão (SidebarFooter). O header fica enxuto: só a conta (UserMenu).
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-1 flex-col">
      <EnsureActiveOrg />
      {/* Conexão SSE de notificações: sem UI, empurra toast + invalida as queries. */}
      <NotificationStream />
      {/* Aviso de trial acabando/expirado — full-width, acima de sidebar+conteúdo. */}
      <TrialBanner />

      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <BreadcrumbProvider>
          <div className="flex min-h-0 min-w-0 flex-1 [scrollbar-gutter:stable] flex-col overflow-y-auto">
            <header className="bg-background/80 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 backdrop-blur-sm">
              <div className="min-w-0 flex-1">
                <BreadcrumbSlot />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NotificationBell />
                <UserMenu />
              </div>
            </header>
            <main className="w-full flex-1 px-6 py-10">{children}</main>
          </div>
        </BreadcrumbProvider>
      </div>
    </div>
  );
}
