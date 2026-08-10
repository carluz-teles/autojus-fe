import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCentsBRL } from "@/lib/format";

import type { Plan } from "../types";

const INTERVAL_LABEL: Record<string, string> = {
  month: "/mês",
  year: "/ano",
};

export function PlanCard({
  plan,
  onSubscribe,
  isPending,
}: {
  plan: Plan;
  onSubscribe: () => void;
  isPending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-2xl font-semibold">
          {formatCentsBRL(plan.amount)}
          <span className="text-muted-foreground text-sm font-normal">
            {INTERVAL_LABEL[plan.interval] ?? `/${plan.interval}`}
          </span>
        </p>
        <p className="text-muted-foreground text-sm">
          Até {plan.active_process_limit} processos ativos
        </p>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          className="w-full"
          onClick={onSubscribe}
          disabled={isPending}
        >
          {isPending ? "Redirecionando…" : "Assinar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
