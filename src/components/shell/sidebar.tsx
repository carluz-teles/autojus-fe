"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { createContext, useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav } from "./sidebar-nav";
import { SidebarOrg } from "./sidebar-org";

const SidebarContext = createContext<{ collapsed: boolean }>({
  collapsed: false,
});

export function useSidebar() {
  return useContext(SidebarContext);
}

// Coluna de navegação do shell autenticado, com colapso: quando reduzida mostra
// só os ícones (w-16), quando expandida mostra label + ícone (w-64). O estado
// vive aqui e é compartilhado com org/nav/footer via contexto.
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <aside
        className="border-sidebar-border bg-sidebar sticky top-0 hidden h-full shrink-0 flex-col overflow-y-auto border-r transition-[width] duration-200 ease-in-out md:flex"
        style={{ width: collapsed ? 64 : 256 }}
        aria-label="Barra lateral"
      >
        <div
          className={cn(
            "flex px-3 py-4",
            collapsed
              ? "flex-col items-center gap-2"
              : "items-start justify-between gap-1",
          )}
        >
          <SidebarOrg />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground size-7 shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>
        <SidebarNav />
        <SidebarFooter />
      </aside>
    </SidebarContext.Provider>
  );
}
