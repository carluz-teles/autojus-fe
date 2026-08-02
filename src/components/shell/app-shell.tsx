import { Wordmark } from "./brand-mark";
import { SidebarNav } from "./sidebar-nav";
import { SidebarOrg } from "./sidebar-org";
import { UserMenu } from "./user-menu";

// Chrome do app autenticado (Server Component). A auth já é garantida no proxy.
// A sidebar carrega a identidade do tenant no topo (SidebarOrg: logo + nome da
// org, → /organization) e a marca do produto (Wordmark + v0) no rodapé. O header
// fica enxuto: só a conta (UserMenu), já que a org está na sidebar.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="border-sidebar-border bg-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r md:flex">
        <div className="px-3 py-4">
          <SidebarOrg />
        </div>
        <SidebarNav />
        <div className="mt-auto flex flex-col gap-2 px-5 py-4">
          <Wordmark />
          <span className="text-muted-foreground/70 text-xs">
            v0 · fundação
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-20 flex h-16 items-center justify-end gap-4 border-b px-6 backdrop-blur-sm">
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
