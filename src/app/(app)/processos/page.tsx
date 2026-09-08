import { Suspense } from "react";

import { ProcessosLista } from "@/features/prazos/components/acervo/processos-lista";

export const metadata = { title: "Processos · Acervo · jus·assessoria" };

export default function AcervoProcessosPage() {
  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground p-6">Carregando processos…</p>
      }
    >
      {<ProcessosLista />}
    </Suspense>
  );
}
