import { TrialBanner } from "@/features/billing/components/trial-banner";
import { NotificationStream } from "@/features/notifications/notification-stream";
import { OnboardingWidget } from "@/features/onboarding-widget/components/onboarding-widget";

import { EnsureActiveOrg } from "./ensure-active-org";
import { ShellContent } from "./shell-content";
import { Sidebar } from "./sidebar";

// Chrome do app autenticado (Server Component) — casca "Linear" do rebranding.
// A auth já é garantida no proxy. A sidebar concentra identidade (org switcher),
// busca (⌘K), navegação em seções e a conta (user menu no rodapé). O conteúdo é
// renderizado pelo ShellContent, que decide entre full-bleed (telas portadas) e
// o header + padding clássicos (telas ainda não portadas).
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-1 flex-col">
      <EnsureActiveOrg />
      {/* Conexão SSE de notificações: sem UI, empurra toast + invalida as queries. */}
      <NotificationStream />
      {/* Aviso de trial acabando/expirado — full-width, acima de sidebar+conteúdo. */}
      <TrialBanner />
      {/* Card flutuante "Comece por aqui" — global, canto inferior-direito. */}
      <OnboardingWidget />

      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <ShellContent>{children}</ShellContent>
      </div>
    </div>
  );
}
