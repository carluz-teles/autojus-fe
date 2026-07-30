import {
  Building2,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  Plug,
  UserRound,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Fonte única da navegação do shell autenticado. Cada rota tem sua page em src/app/(app).
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/integrations", label: "Integrações", icon: Plug },
  { href: "/organization", label: "Organização", icon: Building2 },
  { href: "/billing", label: "Cobrança", icon: CreditCard },
  { href: "/profile", label: "Perfil", icon: UserRound },
];
