"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/70";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(base, "min-h-20 resize-y", className)} {...props} />
  );
}

/** Busca com lupa — todo campo de busca do produto usa este. */
export function SearchInput({
  className,
  wrapperClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-[15px] -translate-y-1/2"
        strokeWidth={1.9}
      />
      <Input className={cn("pl-8.5", className)} {...props} />
    </div>
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-foreground text-[12.5px] font-medium", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative h-5 w-8.5 shrink-0 rounded-full transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        checked ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "bg-card absolute top-0.5 size-4 rounded-full transition-all",
          checked ? "left-4" : "left-0.5",
        )}
      />
    </button>
  );

  if (!label) return toggle;

  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm">
        {label}
        {hint && (
          <span className="text-muted-foreground block text-xs">{hint}</span>
        )}
      </span>
      {toggle}
    </label>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  ...props
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-sm border text-[11px] leading-none",
        checked
          ? "border-primary text-primary bg-[color-mix(in_oklch,var(--primary)_18%,transparent)]"
          : "border-border hover:border-primary",
        className,
      )}
      {...props}
    >
      {checked ? "✓" : ""}
    </button>
  );
}
