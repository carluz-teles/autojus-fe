"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCentsToBRL } from "@/lib/format";

import type { Plan } from "../types";

/** Card de um plano do catálogo (Fase 2). `onSubscribe` desabilitado durante
 * `isSubmitting` — evita duplo checkout por duplo clique. */
export function BillingPlanCard({
  plan,
  onSubscribe,
  isSubmitting,
}: {
  plan: Plan;
  onSubscribe: (priceId: string) => void;
  isSubmitting: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-semibold">
          {formatCentsToBRL(plan.amount)}
          <span className="text-muted-foreground text-sm font-normal">
            /{plan.interval === "month" ? "mês" : plan.interval}
          </span>
        </p>
        <p className="text-muted-foreground text-[12.5px]">
          Até {plan.active_process_limit} processos ativos
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={isSubmitting}
          onClick={() => onSubscribe(plan.price_id)}
        >
          Assinar
        </Button>
      </CardFooter>
    </Card>
  );
}
