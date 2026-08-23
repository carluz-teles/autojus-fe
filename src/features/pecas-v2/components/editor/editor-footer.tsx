"use client";

// Rodapé do editor: contagem de palavras e caracteres + "Rascunho salvo há X min".
// A label temporal atualiza sozinha a cada 30s enquanto o usuário fica na tela.

import { useEffect, useState } from "react";

import { relativeSaveLabel } from "../../lib/count";

interface Props {
  words: number;
  chars: number;
  savedAtIso: string;
}

export function EditorFooter({ words, chars, savedAtIso }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="border-border text-muted-foreground flex items-center justify-between border-t px-8 py-3 text-[12px]">
      <span className="tabular-nums">
        {words.toLocaleString("pt-BR")} palavras ·{" "}
        {chars.toLocaleString("pt-BR")} caracteres
      </span>
      <span data-tick={tick}>{relativeSaveLabel(savedAtIso)}</span>
    </div>
  );
}
