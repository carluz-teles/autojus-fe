"use client";

import { useEffect } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Algo deu errado"
        description="Não foi possível carregar esta página. Você pode tentar novamente."
      />
      <div className="reveal">
        <Button onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </div>
  );
}
