"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar";

// Item de navegação da sidebar (usado na nav principal E no rodapé). Fonte única
// do estilo do link: fio de latão à esquerda (border-l) na rota ativa + contagem
// opcional à direita. Com a sidebar recolhida mostra só o ícone (com tooltip).
export function NavLink({
  href,
  label,
  icon: Icon,
  count,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
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
        "flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-[13.5px] font-medium transition-colors",
        collapsed ? "justify-center px-0" : "justify-between",
        active
          ? "border-gold bg-sidebar-accent text-foreground"
          : "text-muted-foreground/75 hover:bg-sidebar-accent hover:text-foreground border-transparent",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon
          strokeWidth={1.8}
          className={cn(
            "size-4 shrink-0 transition-colors",
            active ? "text-primary" : "text-muted-foreground/60",
          )}
        />
        {collapsed ? null : label}
      </span>
      {!collapsed && count !== undefined ? (
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;
  return <Tooltip label={label}>{link}</Tooltip>;
}
