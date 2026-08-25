"use client";

import { useOrganization } from "@clerk/nextjs";
import Link from "next/link";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar";

// Identidade no TOPO da sidebar: marca do produto (Atjus — monograma "A" com fio
// de latão) + nome do escritório (org do Clerk = tenant) como subtítulo. Atalho
// pra home. A marca sempre aparece; só o subtítulo depende da org carregar.
export function SidebarOrg() {
  const { organization } = useOrganization();
  const { collapsed } = useSidebar();

  const mark = (
    <span
      aria-hidden
      className="font-display border-gold text-gold grid size-8.5 shrink-0 place-items-center rounded-lg border text-[17px] leading-none select-none"
    >
      A
    </span>
  );

  const brand = (
    <Link
      href="/dashboard"
      aria-label="Atjus — início"
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg transition",
        collapsed ? "justify-center" : "px-1",
      )}
    >
      {mark}
      {collapsed ? null : (
        <span className="min-w-0 leading-tight">
          <span className="font-display text-foreground block text-lg font-semibold">
            Atjus
          </span>
          {organization ? (
            <span className="text-muted-foreground block truncate text-[11px]">
              {organization.name}
            </span>
          ) : (
            <span className="bg-muted mt-1 block h-2.5 w-24 animate-pulse rounded" />
          )}
        </span>
      )}
    </Link>
  );

  if (!collapsed) return brand;
  return (
    <Tooltip label="Atjus" className="max-w-64">
      {brand}
    </Tooltip>
  );
}
