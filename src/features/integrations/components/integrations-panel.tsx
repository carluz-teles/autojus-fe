"use client";

import { ApiError } from "@/lib/api/errors";

import { useIntegrations } from "../hooks/use-integrations";
import { ACTIVATABLE_SOURCES } from "../types";
import { ActivateForm } from "./activate-form";
import { SourceCard } from "./source-card";

export function IntegrationsPanel() {
  const { integrations, isLoading, error } = useIntegrations();

  const bySource = new Map(integrations.map((i) => [i.source, i]));

  return (
    <div className="mt-8 flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading
          ? ACTIVATABLE_SOURCES.map((s) => (
              <div
                key={s}
                className="bg-muted/40 h-36 animate-pulse rounded-xl border"
              />
            ))
          : ACTIVATABLE_SOURCES.map((source) => (
              <SourceCard
                key={source}
                source={source}
                integration={bySource.get(source)}
              />
            ))}
      </section>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof ApiError
            ? error.message
            : "Não foi possível carregar suas integrações."}
        </p>
      ) : null}

      <ActivateForm />
    </div>
  );
}
