import { Badge } from "@/components/ui/badge";

import type { SubscriptionStatus } from "../types";

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  trialing: { label: "Período de teste", variant: "secondary" },
  active: { label: "Ativa", variant: "default" },
  past_due: { label: "Pagamento pendente", variant: "destructive" },
  canceled: { label: "Cancelada", variant: "outline" },
};

export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
