"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCourtConnections } from "@/features/configuracoes/hooks/use-court-connections";

import { courtAccess } from "../lib/import-readiness";

export function ImportAccessBanner() {
  const pathname = usePathname();
  const query = useCourtConnections();
  if (
    pathname === "/primeira-importacao" ||
    pathname.startsWith("/configuracoes") ||
    query.isPending ||
    query.isError ||
    courtAccess(query.data ?? []) === "connected"
  )
    return null;
  return (
    <div
      role="status"
      className="border-line bg-panel text-fg2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-[12px]"
    >
      <AlertCircle className="text-gold size-3.5 shrink-0" />
      <span>
        Busca automática de autos pendente: conecte o eproc com certificado e
        2FA.
      </span>
      <Link
        className="text-primary font-medium hover:underline"
        href="/primeira-importacao"
      >
        Concluir preparação
      </Link>
    </div>
  );
}
