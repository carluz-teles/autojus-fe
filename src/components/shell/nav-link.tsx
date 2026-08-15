"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar";

// Item de navegação da sidebar (usado na nav principal E no rodapé). Fonte única
// do estilo do link + indicador de latão da rota ativa. Com a sidebar recolhida
// mostra só o ícone (com tooltip do label).
export function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      {/* indicador de latão da rota ativa */}
      <span
        aria-hidden
        className={cn(
          "bg-gold absolute left-0 h-5 w-0.5 rounded-full transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
        )}
      />
      {collapsed ? null : label}
    </Link>
  );

  if (!collapsed) return link;
  return <Tooltip label={label}>{link}</Tooltip>;
}
