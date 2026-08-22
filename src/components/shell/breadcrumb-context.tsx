"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { type Crumb, DetailBreadcrumb } from "@/components/ui/detail-layout";

import { NAV_ITEMS } from "./nav-config";

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

// Rótulos por segmento de rota — reusa os labels da nav (fonte única) + settings.
const SEG_LABEL: Record<string, string> = {
  ...Object.fromEntries(
    NAV_ITEMS.map((n) => [n.href.replace(/^\//, ""), n.label]),
  ),
  settings: "Configurações",
};

/**
 * Trilha derivada do pathname — sempre presente no header (inclusive nas listas),
 * no padrão do design. As telas de DETALHE publicam uma trilha semântica via
 * useSetBreadcrumb (título real em vez do id cru), que tem prioridade.
 */
function RouteBreadcrumb() {
  const pathname = usePathname();
  const segmentos = pathname.split("/").filter(Boolean);
  // Só monta crumbs de segmentos CONHECIDOS (rotas de lista) e para no primeiro
  // desconhecido — ids de detalhe (uuid/número) NUNCA viram crumb cru; a tela de
  // detalhe publica a trilha semântica via useSetBreadcrumb (que tem prioridade).
  const conhecidos: string[] = [];
  for (const seg of segmentos) {
    if (!SEG_LABEL[seg]) break;
    conhecidos.push(seg);
  }
  if (conhecidos.length === 0) return null;
  const items: Crumb[] = conhecidos.map((seg, i) => {
    const isLast = i === conhecidos.length - 1;
    return {
      label: SEG_LABEL[seg],
      href: isLast ? undefined : "/" + conhecidos.slice(0, i + 1).join("/"),
    };
  });
  return <DetailBreadcrumb items={items} />;
}

/** Slot renderizado dentro do <header> do AppShell: trilha semântica das telas de
 *  detalhe quando publicada; senão, a trilha derivada do pathname (listas). */
export function BreadcrumbSlot() {
  const items = useBreadcrumbValue();
  if (items) return <DetailBreadcrumb items={items} />;
  return <RouteBreadcrumb />;
}
