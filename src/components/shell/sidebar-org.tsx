"use client";

import { useOrganization } from "@clerk/nextjs";
import { Building2 } from "lucide-react";
import Link from "next/link";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar";

// Identidade do tenant no TOPO da sidebar: logo + nome da org, atalho pra
// /organization. Ocupa o lugar que era da marca (jus·assessoria, agora no rodapé).
export function SidebarOrg() {
  const { isLoaded, organization } = useOrganization();
  const { collapsed } = useSidebar();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3 px-2 py-1.5">
        <div className="bg-muted size-9 shrink-0 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-28 animate-pulse rounded" />
      </div>
    );
  }
  if (!organization) return null;

  const org = (
    <Link
      href="/settings/organization"
      className={cn(
        "hover:bg-sidebar-accent flex min-w-0 items-center gap-3 rounded-lg px-2 py-1.5 transition",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="bg-sidebar-accent ring-sidebar-border flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1">
        {organization.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organization.imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Building2 className="text-muted-foreground size-4.5" />
        )}
      </span>
      {collapsed ? null : (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {organization.name}
          </span>
          <span className="text-muted-foreground block text-xs">
            Escritório
          </span>
        </span>
      )}
    </Link>
  );

  if (!collapsed) return org;
  return (
    <Tooltip label={organization.name} className="max-w-64">
      {org}
    </Tooltip>
  );
}
