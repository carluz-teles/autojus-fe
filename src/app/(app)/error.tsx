"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import { useEffect } from "react";

import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// Error boundary do grupo (app). error.tsx envolve o page.tsx (e layouts mais
// aninhados) do segmento, mas NÃO o layout.tsx do MESMO segmento — então um
// throw em qualquer página/feature aqui dentro troca só o `children`,
// preservando o AppShell (header, sidebar, EnsureActiveOrg, NotificationStream)
// renderizado pelo (app)/layout.tsx. Sem este arquivo, um erro não capturado em
// QUALQUER página sob (app) sobe até não achar nenhum error.tsx no app inteiro
// (não existe nenhum outro) e derruba a árvore inteira, inclusive o header —
// esse é o bug relatado ("header some" em /processos/[id] e potencialmente em
// qualquer outra rota autenticada).
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] erro não tratado na página:", error);
  }, [error]);

  return (
    <PageFrame
      header={
        <h1 className="text-sm font-medium">
          Não foi possível carregar a página
        </h1>
      }
    >
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <EmptyState
          icon={CircleAlert}
          title="Vamos tentar novamente?"
          description="Não foi possível carregar esta página. Sua navegação pelo escritório continua disponível."
          action={
            <Button onClick={() => reset()}>
              <RotateCw data-icon="inline-start" />
              Tentar novamente
            </Button>
          }
        />
      </div>
    </PageFrame>
  );
}
