"use client";

import { useState } from "react";

// Estado colapsado/expandido é SÓ client — nunca manda pro backend (decisão de
// produto travada). Mesma técnica de leitura síncrona do sessionStorage já
// usada em features/billing/hooks/use-trial-banner.ts (dismissKey): lê no
// render via useState(() => ...) (lazy init), sem efeito/cascading render.

const STORAGE_KEY = "jus_onboarding_widget_collapsed";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function useWidgetCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  return { collapsed, toggle };
}
