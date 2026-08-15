"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { type Crumb, DetailBreadcrumb } from "@/components/ui/detail-layout";

// Publica a trilha de breadcrumb das 4 telas de detalhe (Intimação/Peça/Tarefa/
// Processo) pro header sticky do AppShell. Provider fino: guarda só o array
// atual em estado; a tela de detalhe publica via useSetBreadcrumb (useLayoutEffect,
// limpa no unmount) e o BreadcrumbSlot (usado só dentro do <header>) renderiza.
// Telas de lista nunca chamam useSetBreadcrumb, então o slot fica vazio (null).

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

function useBreadcrumbContext(): BreadcrumbContextValue {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error(
      "useBreadcrumbContext deve ser usado dentro de BreadcrumbProvider",
    );
  }
  return ctx;
}

/**
 * Chamado pelas telas de detalhe: publica a trilha no render e limpa (undefined)
 * no cleanup. `items` deve ser uma referência estável entre renders (a chamadora
 * envolve o array em `useMemo` com deps primitivas) pra não disparar o efeito à toa.
 */
export function useSetBreadcrumb(items: Crumb[] | undefined): void {
  const { setItems } = useBreadcrumbContext();

  useLayoutEffect(() => {
    setItems(items);
    return () => setItems(undefined);
  }, [setItems, items]);
}

/** Uso interno do BreadcrumbSlot — não exportar pras features. */
function useBreadcrumbValue(): Crumb[] | undefined {
  return useBreadcrumbContext().items;
}

/** Slot renderizado dentro do <header> do AppShell. */
export function BreadcrumbSlot() {
  const items = useBreadcrumbValue();
  if (!items) return null;
  return <DetailBreadcrumb items={items} />;
}
