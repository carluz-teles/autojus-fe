import { Suspense } from "react";

import { ProcessoHub } from "@/features/prazos/components/processo/processo-hub";

export const metadata = { title: "Processo · Prazos · jus·assessoria" };

export default async function ProcessoPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground p-6">Carregando processos…</p>
      }
    >
      {<ProcessoHub numero={decodeURIComponent(numero)} />}
    </Suspense>
  );
}
