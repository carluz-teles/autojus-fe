import { Suspense } from "react";

import { TriagemView } from "@/features/triagem/components/triagem-view";

export const metadata = { title: "Triagem · jus·assessoria" };

export default function TriagemPage() {
  return (
    <Suspense
      fallback={<p className="text-muted-foreground p-6">Carregando…</p>}
    >
      {" "}
      <TriagemView />{" "}
    </Suspense>
  );
}
