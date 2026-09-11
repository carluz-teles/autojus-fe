"use client";

import {
  tabListClassName,
  tabTriggerClassName,
} from "@/components/ui/tab-styles";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface FilterTab {
  key: string;
  label: string;
  description?: string;
  count?: number;
  ativo: boolean;
  onClick: () => void;
}

export function FilterTabs({
  label,
  title,
  tabs,
}: {
  label: string;
  title?: string;
  tabs: FilterTab[];
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(tabListClassName, "px-4")}
    >
      {title ? (
        <span className="text-muted-foreground mr-2 shrink-0 text-xs font-medium">
          {title}
        </span>
      ) : null}
      {tabs.map((tab) => {
        const trigger = (
          <button
            key={tab.key || "todas"}
            type="button"
            aria-pressed={tab.ativo}
            onClick={tab.onClick}
            className={tabTriggerClassName(tab.ativo)}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 ? (
              <span
                className={cn(
                  "font-mono text-[10.5px] tabular-nums",
                  tab.ativo ? "text-fg2" : "text-fg3",
                )}
              >
                {tab.count.toLocaleString("pt-BR")}
              </span>
            ) : null}
          </button>
        );
        return tab.description ? (
          <Tooltip
            key={tab.key || "todas"}
            label={tab.description}
            render={trigger}
          >
            {trigger.props.children}
          </Tooltip>
        ) : (
          trigger
        );
      })}
    </div>
  );
}
