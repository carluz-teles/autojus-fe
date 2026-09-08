import { Suspense } from "react";

import { IntimacoesFeed } from "@/features/prazos/components/acervo/intimacoes-feed";

export const metadata = { title: "Intimações · Feed · jus·assessoria" };

export default function AcervoIntimacoesPage() {
  return (
    <Suspense
      fallback={<p className="text-muted-foreground p-6">Carregando…</p>}
    >
      {" "}
      <IntimacoesFeed />{" "}
    </Suspense>
  );
}
