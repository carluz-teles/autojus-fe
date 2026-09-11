import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ColumnToggle } from "./column-toggle";

describe("ColumnToggle", () => {
  it.each([
    { side: "left", collapsed: true, icon: "lucide-panels-top-left" },
    { side: "right", collapsed: true, icon: "lucide-message-square" },
    { side: "left", collapsed: false, icon: "lucide-panel-left-close" },
    { side: "right", collapsed: false, icon: "lucide-panel-right-close" },
  ] as const)(
    "$side recolhido=$collapsed mantém o ícone identificável",
    ({ side, collapsed, icon }) => {
      const markup = renderToStaticMarkup(
        createElement(ColumnToggle, {
          side,
          collapsed,
          controls: `${side}-content`,
          onToggle: () => {},
        }),
      );
      expect(markup).toContain(icon);
      expect(markup).toContain('aria-hidden="true"');
    },
  );
  it.each([
    { side: "left", collapsed: false, label: "Recolher bancada jurídica" },
    { side: "left", collapsed: true, label: "Mostrar bancada jurídica" },
    { side: "right", collapsed: false, label: "Recolher assistente da peça" },
    { side: "right", collapsed: true, label: "Mostrar assistente da peça" },
  ] as const)(
    "$label anuncia o estado e o painel controlado",
    ({ side, collapsed, label }) => {
      const markup = renderToStaticMarkup(
        createElement(ColumnToggle, {
          side,
          collapsed,
          controls: `${side}-content`,
          onToggle: () => {},
        }),
      );
      expect(markup).toContain(`aria-label="${label}"`);
      expect(markup).toContain(`title="${label}"`);
      expect(markup).toContain(`aria-expanded="${!collapsed}"`);
      expect(markup).toContain(`aria-controls="${side}-content"`);
      expect(markup).toContain('type="button"');
    },
  );
});
