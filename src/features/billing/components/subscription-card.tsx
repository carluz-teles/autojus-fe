import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";

import type { Subscription } from "../types";
import { ManageSubscriptionButton } from "./manage-subscription-button";
import { PlanCatalog } from "./plan-catalog";
import { SubscriptionStatusBadge } from "./subscription-status-badge";

export function SubscriptionCard({
  subscription,
}: {
  subscription: Subscription;
}) {
  if (subscription.status === "canceled") {
    return (
      <div className="flex flex-col">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {subscription.plan}
              <SubscriptionStatusBadge status={subscription.status} />
            </CardTitle>
            <CardDescription>
              Sua assinatura foi cancelada. Escolha um plano para reativar.
            </CardDescription>
          </CardHeader>
        </Card>
        <PlanCatalog />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {subscription.plan}
          <SubscriptionStatusBadge status={subscription.status} />
        </CardTitle>
        {subscription.status === "past_due" ? (
          <CardDescription className="text-destructive">
            Não conseguimos cobrar seu cartão. Atualize a forma de pagamento no
            portal para evitar a suspensão do serviço.
          </CardDescription>
        ) : (
          <CardDescription>
            Renova em {formatDate(subscription.current_period_end)}.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">
          Limite de processos ativos:{" "}
          <strong>{subscription.active_process_limit}</strong>
        </p>
        <ManageSubscriptionButton />
      </CardContent>
    </Card>
  );
}
