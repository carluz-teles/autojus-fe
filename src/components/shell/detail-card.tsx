import type { ComponentProps } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DetailCard({
  className,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <Card
      size="sm"
      {...props}
      className={cn("border-line rounded-lg border ring-0", className)}
    />
  );
}
