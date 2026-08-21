"use client";

import { cn } from "@/lib/utils";

import { Slot } from "./slot";

type Variant = "primary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-[color-mix(in_oklch,var(--primary)_88%,black)]",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive:
    "bg-destructive text-white hover:bg-[color-mix(in_oklch,var(--destructive)_88%,black)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-7.5 gap-1.5 px-2.5 text-xs",
  md: "h-8.5 gap-1.5 px-3.5 text-[13px]",
  icon: "size-8.5 justify-center",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
