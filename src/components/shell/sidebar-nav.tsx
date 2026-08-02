"use client";

import { NAV_ITEMS } from "./nav-config";
import { NavLink } from "./nav-link";

// Navegação principal do shell. Configurações NÃO fica aqui — vive no rodapé
// (SidebarFooter), numa seção separada.
export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-3">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}
