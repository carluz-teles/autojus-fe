import {
  MessageSquare,
  PanelLeftClose,
  PanelRightClose,
  PanelsTopLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export function ColumnToggle({
  side,
  collapsed,
  controls,
  onToggle,
}: {
  side: "left" | "right";
  collapsed: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const name = side === "left" ? "bancada jurídica" : "assistente da peça";
  const label = `${collapsed ? "Mostrar" : "Recolher"} ${name}`;
  const Icon =
    side === "left"
      ? collapsed
        ? PanelsTopLeft
        : PanelLeftClose
      : collapsed
        ? MessageSquare
        : PanelRightClose;

  return (
    <Button
      className="hidden shrink-0 xl:inline-flex"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      aria-controls={controls}
      onClick={onToggle}
    >
      <Icon aria-hidden data-icon="inline-start" />
    </Button>
  );
}
