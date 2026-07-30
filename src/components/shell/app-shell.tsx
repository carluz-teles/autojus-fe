import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

import { Wordmark } from "./brand-mark";
import { SidebarNav } from "./sidebar-nav";

// Chrome do app autenticado (Server Component). A auth já é garantida no proxy.
// OrganizationSwitcher expõe a troca de org = tenant; UserButton, a conta.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="border-sidebar-border bg-sidebar hidden w-64 shrink-0 flex-col border-r md:flex">
        <div className="flex h-16 items-center px-5">
          <Wordmark />
        </div>
        <SidebarNav />
        <div className="text-muted-foreground/70 mt-auto px-5 py-4 text-xs">
          v0 · fundação
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b px-6 backdrop-blur-sm">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "flex",
                organizationSwitcherTrigger: "gap-2",
              },
            }}
          />
          <UserButton />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
