"use client";

import { useOrganization } from "@clerk/nextjs";
import { Building2 } from "lucide-react";
import Link from "next/link";

// Indicador da organização ativa (= tenant) no header — substitui o
// <OrganizationSwitcher/> do Clerk. No modelo 1 user = 1 escritório não há troca de
// org, então mostramos o nome como atalho para gerenciar (/organization).
export function OrgName() {
  const { isLoaded, organization } = useOrganization();

  if (!isLoaded) {
    return <div className="bg-muted h-6 w-40 animate-pulse rounded" />;
  }
  if (!organization) return null;

  return (
    <Link
      href="/organization"
      className="hover:bg-accent text-foreground/90 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition"
    >
      <Building2 className="text-muted-foreground size-4" />
      <span className="max-w-[16rem] truncate">{organization.name}</span>
    </Link>
  );
}
