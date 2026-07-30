import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

import { SidebarNav } from "./sidebar-nav";

// Chrome do app autenticado (Server Component). A auth já é garantida no proxy.
// OrganizationSwitcher expõe a troca de org = tenant; UserButton, a conta.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="border-sidebar-border bg-sidebar hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex h-14 items-center px-5 text-sm font-semibold tracking-tight">
          jus-assessoria
        </div>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-6">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
          />
          <UserButton />
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
