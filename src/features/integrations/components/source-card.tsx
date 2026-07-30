import { CheckCircle2, CircleDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  type Integration,
  type IntegrationSource,
  SOURCE_LABELS,
  STATUS_ACTIVE,
} from "../types";

// Apresentacional: status de uma fonte. Sem hooks — recebe tudo por prop.
export function SourceCard({
  source,
  integration,
}: {
  source: IntegrationSource;
  integration?: Integration;
}) {
  const active = integration?.status === STATUS_ACTIVE;
  const oab = integration?.scope.oab ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-base tracking-tight">
              {source}
            </CardTitle>
            <CardDescription>{SOURCE_LABELS[source]}</CardDescription>
          </div>
          <Badge
            variant={active ? "default" : "outline"}
            className={active ? "gap-1" : "text-muted-foreground gap-1"}
          >
            {active ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <CircleDashed className="size-3.5" />
            )}
            {active ? "Ativa" : "Não configurada"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {oab.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {oab.map((reg) => (
              <span
                key={reg}
                className="bg-muted/50 rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums"
              >
                {reg}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nenhuma OAB monitorada nesta fonte.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
