"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav
      aria-label="Seções de configurações"
      className="-mb-px flex gap-1 overflow-x-auto border-b"
    >
      {SETTINGS_TABS.map(({ href, label }) => {
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
