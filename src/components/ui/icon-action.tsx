"use client";

import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

type IconActionProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "size" | "render" | "aria-label"
> & {
  label: string;
  icon: LucideIcon;
  loading?: boolean;
};

export function IconAction({
  label,
  icon: Icon,
  loading = false,
  disabled,
  variant = "ghost",
  ...props
}: IconActionProps) {
  return (
    <Tooltip
      label={label}
      render={
        <Button
          {...props}
          variant={variant}
          size="icon-sm"
          aria-label={label}
          aria-busy={loading || undefined}
          disabled={disabled || loading}
          focusableWhenDisabled
        />
      }
    >
      {loading ? (
        <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
      ) : (
        <Icon aria-hidden />
      )}
    </Tooltip>
  );
}
