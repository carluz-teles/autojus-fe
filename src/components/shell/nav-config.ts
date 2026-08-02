import { LayoutDashboard, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Fonte única da navegação PRINCIPAL do shell autenticado. Configurações fica no
// rodapé (SidebarFooter), separada; Organização/Integrações/Cobrança/Perfil são
// abas dentro de /settings.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];
