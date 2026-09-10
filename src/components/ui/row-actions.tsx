"use client";

import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface RowActionItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  disabled?: boolean;
}

/** Portal-based menu: stays visible inside scrolling tables, with keyboard
 * navigation, Escape, disabled items and focus restoration. */
export function RowActions({
  items,
  label = "Ações da linha",
  className,
}: {
  items?: RowActionItem[];
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Menu.Root>
        <Tooltip
          label={label}
          render={
            <Menu.Trigger
              disabled={!items?.length}
              render={
                <Button variant="ghost" size="icon-sm" aria-label={label} />
              }
            />
          }
        >
          <MoreHorizontal aria-hidden />
        </Tooltip>
        <Menu.Portal>
          <Menu.Positioner
            side="bottom"
            align="end"
            sideOffset={6}
            className="z-50"
          >
            <Menu.Popup
              data-slot="menu-content"
              className="bg-popover text-popover-foreground shadow-float max-h-(--available-height) w-52 max-w-(--available-width) overflow-y-auto rounded-xl border p-1.5 outline-none"
            >
              <Menu.Group>
                {items?.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Menu.Item
                      key={item.label}
                      disabled={item.disabled}
                      render={item.href ? <Link href={item.href} /> : undefined}
                      onClick={item.onSelect}
                      className={cn(
                        "flex min-h-9 cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-40",
                        item.destructive
                          ? "text-destructive data-highlighted:bg-destructive/10"
                          : "data-highlighted:bg-muted",
                      )}
                    >
                      {Icon ? <Icon className="size-4 shrink-0" /> : null}
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </Menu.Item>
                  );
                })}
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
