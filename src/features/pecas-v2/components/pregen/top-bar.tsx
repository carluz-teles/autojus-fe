"use client";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { ShellHeader } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";

export function TopBar({
  title,
  cnjShort,
  onBack,
  onSalvar,
  salvando,
  podeSalvar,
  state = "Preparação",
  saveLabel,
  actions,
  onRename,
}: {
  title: string;
  cnjShort: string;
  onBack: () => void;
  onSalvar?: () => void;
  salvando?: boolean;
  podeSalvar?: boolean;
  state?: string;
  saveLabel?: string;
  actions?: ReactNode;
  onRename?: (title: string) => void;
}) {
  return (
    <ShellHeader>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Voltar à origem"
        onClick={onBack}
      >
        <ChevronLeft />
      </Button>
      {onRename ? (
        <input
          aria-label="Título da peça"
          key={title}
          defaultValue={title}
          className="focus-visible:ring-ring min-w-0 flex-1 truncate bg-transparent text-sm font-medium outline-none focus-visible:ring-2"
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value.trim() !== title)
              onRename(e.target.value.trim());
          }}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </span>
      )}
      <span className="text-muted-foreground hidden max-w-44 truncate font-mono text-xs xl:block">
        {cnjShort}
      </span>
      <span className="bg-muted text-muted-foreground shrink-0 rounded px-2 py-1 text-xs">
        {state}
      </span>
      {saveLabel && (
        <span
          role="status"
          className="text-muted-foreground hidden text-xs sm:inline"
        >
          {saveLabel}
        </span>
      )}
      {onSalvar && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSalvar}
          disabled={!podeSalvar || salvando}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      )}
      {actions}
    </ShellHeader>
  );
}
