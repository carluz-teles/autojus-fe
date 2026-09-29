"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";

import { subscriptionStatusLabel, subscriptionStatusTone } from "../lib/labels";
import type { Subscription } from "../types";

/**
 * Estado "assinante" (Fase 3): plano atual, status, limite de processos e
 * período. `past_due` ganha um Alert de destaque (cartão falhou, exige ação);
 * `canceled` oferece reassinar (a tela pai volta ao catálogo assim que o
 * refetch da subscription resolver `null` — este componente só avisa).
 */
export function BillingSubscriberView({
  subscription,
  onOpenPortal,
  isOpeningPortal,
  portalError,
}: {
  subscription: Subscription;
  onOpenPortal: () => void;
  isOpeningPortal: boolean;
  portalError: unknown;
}) {
  return (
    <div className="flex flex-col gap-4">
      {subscription.status === "past_due" ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Pagamento pendente.</AlertTitle>
          <AlertDescription>
            A última cobrança falhou — atualize a forma de pagamento pelo portal
            para evitar a suspensão do acesso.
          </AlertDescription>
        </Alert>
      ) : null}

      {subscription.status === "canceled" ? (
        <Alert>
          <AlertTitle>Assinatura cancelada.</AlertTitle>
          <AlertDescription>
            Assine novamente para continuar usando a plataforma.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle className="font-display text-lg">
            {subscription.plan}
          </CardTitle>
          <StatusBadge
            label={subscriptionStatusLabel(subscription.status)}
            tone={subscriptionStatusTone(subscription.status)}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Limite de processos ativos
            </span>
            <span className="font-medium">
              {subscription.active_process_limit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Próxima cobrança</span>
            <span className="font-medium">
              {formatDate(subscription.current_period_end)}
            </span>
          </div>
        </CardContent>
      </Card>

      {portalError ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            Não foi possível abrir o portal de assinatura.
          </AlertTitle>
          <AlertDescription>Tente novamente em instantes.</AlertDescription>
        </Alert>
      ) : null}

      <Button
        className="w-fit"
        disabled={isOpeningPortal}
        onClick={onOpenPortal}
      >
        Gerenciar assinatura
      </Button>
    </div>
  );
}
