"use client";

import { createContext, useMemo, useState } from "react";

import { type Crumb } from "@/components/ui/detail-layout";

// Provider fino de breadcrumb: guarda só o array atual em estado. Fica no ar no
// AppShell (shell-content) para telas que ainda venham a consumir o contexto.
// A publicação/renderização da trilha (useSetBreadcrumb + BreadcrumbSlot) foi
// removida junto com as telas de detalhe que a usavam.

export type { Crumb };

interface BreadcrumbContextValue {
  items: Crumb[] | undefined;
  setItems: (items: Crumb[] | undefined) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<Crumb[] | undefined>(undefined);
  const value = useMemo(() => ({ items, setItems }), [items]);

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}
