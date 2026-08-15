"use client";

import { Settings } from "lucide-react";

import { NavLink } from "./nav-link";
import { useSidebar } from "./sidebar";

// Rodapé da sidebar, seção separada (border-t, ancorada embaixo por mt-auto no
// AppShell): Configurações + a linha de versão da plataforma. Sem wordmark.
export function SidebarFooter() {
  const { collapsed } = useSidebar();

  return (
    <div className="mt-auto flex flex-col gap-2 border-t px-3 py-3">
      <NavLink href="/settings" label="Configurações" icon={Settings} />
      {collapsed ? null : (
        <span className="text-muted-foreground/70 px-3 text-xs">v0 · AtJud</span>
      )}
    </div>
  );
}
