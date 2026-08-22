"use client";

import { useState } from "react";

import { Segmented } from "@/components/mock-ui/layout";

// O painel lateral do editor tem duas abas — Sugestões e Chat. Ambas são frentes
// futuras do pipeline (revisão assistida e conversa ancorada nos autos) e ainda não
// estão ligadas ao BE. Até lá, mostramos um estado honesto em vez de dados falsos —
// sem contagem inventada nem cartões apontando para trechos inexistentes.

export function AssistentePanel() {
  const [aba, setAba] = useState<"sugestoes" | "chat">("sugestoes");

  return (
    <aside className="border-border flex min-h-0 flex-col border-l">
      <div className="border-border border-b p-4">
        <Segmented
          className="w-full"
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: "sugestoes", label: "Sugestões" },
            { valor: "chat", label: "Chat" },
          ]}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-[13px] font-medium">
          {aba === "sugestoes"
            ? "Revisão assistida"
            : "Conversa sobre os autos"}
        </p>
        <p className="text-muted-foreground text-[12px] leading-relaxed">
          {aba === "sugestoes"
            ? "As sugestões de revisão da peça entram em uma próxima atualização."
            : "A conversa ancorada nos autos entra em uma próxima atualização."}
        </p>
      </div>
    </aside>
  );
}
