"use client";

import { BreadcrumbProvider } from "./breadcrumb-context";

// Região de conteúdo do shell. Todo o app logado é a casca "Linear" full-bleed
// (cada tela tem sua própria top bar), então o conteúdo entra sem header/padding
// globais. O BreadcrumbProvider fica no ar para telas que ainda consumam o
// contexto de breadcrumb.
export function ShellContent({ children }: { children: React.ReactNode }) {
  return (
    <BreadcrumbProvider>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </BreadcrumbProvider>
  );
}
