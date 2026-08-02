"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActivateForm } from "@/features/integrations/hooks/use-activate-form";
import {
  ACTIVATABLE_SOURCES,
  SOURCE_LABELS,
} from "@/features/integrations/types";
import { ApiError } from "@/lib/api/errors";

import { onboardingCopy } from "../copy";

const t = onboardingCopy.processes;
const common = onboardingCopy.common;

// Passo "Seus processos" — o passo do VALOR: OABs + fonte fazem os processos
// chegarem sozinhos. REUSA o useActivateForm da feature integrations (Regra nº1),
// mas com o form ACHATADO no card do wizard (sem Card aninhado) e UM CTA só:
// "Continuar" salva as fontes e então avança — sem "Salvar fontes" concorrente.
// Sem OAB, Continuar mostra a validação; quem quer seguir sem ativar usa "Pular"
// (com o custo explícito no rodapé).
export function Step3Sources({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}) {
  const {
    sources,
    oab,
    oabDraft,
    setOabDraft,
    toggleSource,
    addOab,
    removeOab,
    submitAsync,
    isActivating,
    activateError,
    errors,
  } = useActivateForm();

  const handleContinue = async () => {
    if (await submitAsync()) onFinish();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="font-display text-xl tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          {t.description}
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Fontes</legend>
        {ACTIVATABLE_SOURCES.map((source) => (
          <Label
            key={source}
            className="flex cursor-pointer items-center gap-2.5 text-sm font-normal"
          >
            <Checkbox
              checked={sources.includes(source)}
              onCheckedChange={() => toggleSource(source)}
            />
            <span>
              <span className="font-medium">{source}</span>
              <span className="text-muted-foreground">
                {" "}
                — {SOURCE_LABELS[source].split(" — ")[1]}
              </span>
            </span>
          </Label>
        ))}
        {errors.sources ? (
          <p className="text-destructive text-sm">{errors.sources.message}</p>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="oab-input">OABs monitoradas</Label>
        <div className="flex gap-2">
          <Input
            id="oab-input"
            placeholder="ex.: SP123456"
            autoCapitalize="characters"
            value={oabDraft}
            onChange={(e) => setOabDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOab();
              }
            }}
            aria-describedby="oab-help"
          />
          <Button type="button" variant="outline" onClick={addOab}>
            Adicionar
          </Button>
        </div>
        <p id="oab-help" className="text-muted-foreground text-xs">
          UF em maiúsculas + número de inscrição (Enter para adicionar).
        </p>
        {oab.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {oab.map((reg) => (
              <Badge
                key={reg}
                variant="secondary"
                className="gap-1 font-mono tabular-nums"
              >
                {reg}
                <button
                  type="button"
                  onClick={() => removeOab(reg)}
                  aria-label={`Remover ${reg}`}
                  className="hover:text-destructive rounded-sm"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
        {errors.oab ? (
          <p className="text-destructive text-sm">
            {errors.oab.message ?? errors.oab.root?.message}
          </p>
        ) : null}
      </div>

      {activateError ? (
        <p className="text-destructive text-sm" role="alert">
          {activateError instanceof ApiError
            ? activateError.message
            : "Não foi possível salvar as fontes. Tente novamente."}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isActivating}
        >
          {common.back}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onFinish}
            disabled={isActivating}
          >
            {common.skip}
          </Button>
          <Button
            type="button"
            onClick={() => void handleContinue()}
            disabled={isActivating}
          >
            {isActivating ? common.saving : common.next}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-center text-xs">{t.skipCost}</p>
    </div>
  );
}
