"use client";

import { useEffect } from "react";

import { usePrazosInbox } from "../../hooks/use-prazos-inbox";
import { PeekPane } from "./peek-pane";
import { TriagemPane } from "./triagem-pane";

export type InboxModel = ReturnType<typeof usePrazosInbox>;

// Inbox = triagem em escala. Instancia o hook público e distribui pros dois
// painéis (triagem à esquerda, peek à direita). Aqui mora só a navegação por
// teclado J/K (⏎ = confirmar) — atalhos globais da vista.
export function InboxView() {
  const inbox = usePrazosInbox();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "j") {
        e.preventDefault();
        inbox.proximo();
      } else if (k === "k") {
        e.preventDefault();
        inbox.anterior();
      } else if (k === "c" && inbox.foco) {
        e.preventDefault();
        inbox.foco.confirmar();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [inbox]);

  return (
    <div className="flex min-h-0 flex-1">
      <TriagemPane inbox={inbox} />
      <PeekPane inbox={inbox} />
    </div>
  );
}
