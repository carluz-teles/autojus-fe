"use client";

import { useLayoutEffect, useRef, useState } from "react";

// useSlidingIndicator — indicador deslizante GLOBAL para navegação por abas / toggle
// segmentado. Mede o item ATIVO (marcado com data-slide-active="true") dentro do
// container e devolve {left,width} pra um sublinhado/pílula transladar suavemente com
// CSS (transition). Um só mecanismo → animação consistente em TODA "tab navigation" do
// app (Tabs do DS, toggle de persona, filtros…), sem lib de animação nova.
//
// Uso: espalhe `ref={containerRef}` no container `relative`, `data-slide-active={ativo}`
// em cada item, e posicione o indicador absoluto com `left`/`width` de `rect`. Re-mede
// na troca de `activeKey` e em resize (ResizeObserver) — cobre texto de largura variável.
export function useSlidingIndicator(activeKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const active = container.querySelector<HTMLElement>(
        '[data-slide-active="true"]',
      );
      if (active) {
        setRect({
          left: active.offsetLeft,
          width: active.offsetWidth,
          ready: true,
        });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeKey]);

  return { containerRef, rect };
}
