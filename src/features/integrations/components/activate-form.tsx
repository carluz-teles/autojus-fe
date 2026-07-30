"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";

import { useActivateForm } from "../hooks/use-activate-form";
import { ACTIVATABLE_SOURCES, SOURCE_LABELS } from "../types";

export function ActivateForm() {
  const {
    sources,
    oab,
    oabDraft,
    setOabDraft,
    toggleSource,
    addOab,
    removeOab,
    onSubmit,
    isActivating,
    activateError,
    justSucceeded,
    errors,
  } = useActivateForm();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg tracking-tight">
          Configurar fontes
        </CardTitle>
        <CardDescription>
          Escolha as fontes e as OABs a monitorar. Ao salvar, iniciamos o
          backfill histórico e o acompanhamento contínuo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
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
              <p className="text-destructive text-sm">
                {errors.sources.message}
              </p>
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
              <p className="text-destructive text-sm">{errors.oab.message}</p>
            ) : null}
          </div>

          {activateError ? (
            <p className="text-destructive text-sm" role="alert">
              {activateError instanceof ApiError
                ? activateError.message
                : "Não foi possível salvar. Tente novamente."}
            </p>
          ) : null}
          {justSucceeded ? (
            <p className="text-primary text-sm" role="status">
              Fontes atualizadas.
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={isActivating}>
              {isActivating ? "Salvando…" : "Salvar fontes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
