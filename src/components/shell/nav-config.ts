import { LayoutDashboard, type LucideIcon, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Fonte única da navegação do shell autenticado. Organização, Integrações,
// Cobrança e Perfil vivem dentro de Configurações (abas em /settings).
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Configurações", icon: Settings },
];
