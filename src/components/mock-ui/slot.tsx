"use client";

import { Children, cloneElement, isValidElement } from "react";

import { cn } from "@/lib/utils";

/**
 * Versão mínima do Slot do Radix: mescla className e props no único filho.
 * Evita a dependência só para o padrão `asChild`.
 */
export function Slot({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const child = Children.only(children);
  if (!isValidElement<React.HTMLAttributes<HTMLElement>>(child)) return null;

  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className),
  });
}
