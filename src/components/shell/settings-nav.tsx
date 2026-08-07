"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { cn } from "@/lib/utils";

// Abas de Configurações — fonte única das seções. Cada uma tem sua page em
// src/app/(app)/settings/<slug>.
export const SETTINGS_TABS = [
  { href: "/settings/organization", label: "Organização" },
  { href: "/settings/integrations", label: "Integrações" },
  { href: "/settings/billing", label: "Cobrança" },
  { href: "/settings/profile", label: "Perfil" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  const { isAdmin } = useIsOrgAdmin();

  // Cobrança é ADMIN-only no BE (RequireRole(ADMIN)) — a UX não deve nem
  // oferecer a aba pra quem vai receber 403. Some por padrão até confirmar
  // o papel (evita mostrar e esconder em seguida pra não-admin).
  const tabs = SETTINGS_TABS.filter(
    (tab) => tab.href !== "/settings/billing" || isAdmin,
  );

  return (
    <nav
      aria-label="Seções de configurações"
      className="-mb-px flex gap-1 overflow-x-auto border-b"
    >
      {tabs.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
