"use client";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { ShellHeader } from "@/components/shell/page-frame";
import { Badge } from "@/components/ui/badge";
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
    <ShellHeader className="h-auto min-h-11 py-2 lg:h-11 lg:py-0">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 lg:flex-nowrap">
        <Button
          variant="ghost"
          size="icon-sm"
          className="-ml-2 shrink-0"
          aria-label="Voltar à origem"
          onClick={onBack}
        >
          <ChevronLeft />
        </Button>
        <div className="min-w-0 flex-1">
          {onRename ? (
            <>
              <h1 className="sr-only">{title}</h1>
              <input
                aria-label="Título da peça"
                key={title}
                defaultValue={title}
                className="focus-visible:ring-ring w-full min-w-0 truncate rounded bg-transparent text-sm font-medium outline-none focus-visible:ring-2"
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value.trim() !== title)
                    onRename(e.target.value.trim());
                }}
              />
            </>
          ) : (
            <h1 className="truncate text-sm font-medium">{title}</h1>
          )}
        </div>
        <span className="text-muted-foreground hidden shrink-0 font-mono text-[11px] 2xl:inline">
          {cnjShort}
        </span>
        <Badge variant="outline">{state}</Badge>
        {(saveLabel || onSalvar || actions) && (
          <div className="flex basis-full flex-wrap items-center gap-2 lg:basis-auto lg:flex-nowrap">
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
                variant="ghost"
                size="xs"
                onClick={onSalvar}
                disabled={!podeSalvar || salvando}
              >
                {salvando ? "Salvando…" : "Salvar"}
              </Button>
            )}
            {actions}
          </div>
        )}
      </div>
    </ShellHeader>
  );
}
