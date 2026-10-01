"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

import type { useComparisonActions } from "../hooks/_private/use-comparison-actions";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";

export function ComparisonCommand({
  actions,
  context,
  enabled,
  submit,
  label,
}: {
  actions: ReturnType<typeof useComparisonActions>;
  context: string;
  enabled: boolean;
  submit: () => Promise<void>;
  label: string;
}) {
  const confirmed = !!context && actions.confirmation === context;
  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        <Field orientation="horizontal" data-disabled={!enabled}>
          <Checkbox
            id="comparison-exposure"
            checked={confirmed}
            disabled={!enabled}
            onCheckedChange={(checked) => actions.confirm(checked, context)}
          />
          <FieldLabel htmlFor="comparison-exposure">
            Confirmo a exposição aos gabaritos e resultados destes casos.
          </FieldLabel>
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-3">
        <Button onClick={submit} disabled={!enabled || !confirmed}>
          {actions.write.mutation.isPending ? "Registrando emissão…" : label}
        </Button>
        {actions.write.uncertain ? (
          <Button
            variant="outline"
            disabled={actions.write.mutation.isPending}
            onClick={actions.recover}
          >
            Recuperar o mesmo pedido
          </Button>
        ) : null}
      </div>
      {actions.message ? (
        <Alert variant="destructive">
          <AlertDescription>{actions.message}</AlertDescription>
        </Alert>
      ) : null}
      {actions.write.uncertain ? (
        <Alert>
          <AlertDescription>
            A resposta não foi confirmada. Recupere o pedido original antes de
            mudar as fontes ou iniciar outra comparação. O reenvio não executa
            IA.
          </AlertDescription>
        </Alert>
      ) : null}
      <AnnotationNavigationDialog navigation={actions.navigation} />
    </div>
  );
}
