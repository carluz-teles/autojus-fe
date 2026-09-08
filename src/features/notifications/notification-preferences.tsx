"use client";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { preferenceChannels } from "./notification-presentation";
import type { NotificationChannel } from "./types";
import { useNotificationPreferences } from "./use-notifications";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: "No app",
  EMAIL: "E-mail",
};

export function NotificationPreferences() {
  const { types, preferences, save } = useNotificationPreferences();
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-xl font-medium">Notificações</h1>
        <p className="text-muted-foreground text-sm">
          Escolha como receber cada atualização. Estas preferências são suas e
          valem para este escritório.
        </p>
        <p className="text-muted-foreground text-sm">
          Os avisos começam ativados no app. Ative o e-mail nos tipos que quiser
          receber também na sua caixa de entrada.
        </p>
      </div>
      {types.isPending || preferences.isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : types.isError || preferences.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar suas preferências.</AlertTitle>
          <Button
            variant="outline"
            size="sm"
            disabled={types.isFetching || preferences.isFetching}
            onClick={() => {
              void types.refetch();
              void preferences.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </Alert>
      ) : (
        <div className="divide-border divide-y border-y">
          {types.data.data.map((definition) => {
            const channels = preferenceChannels(
              definition,
              preferences.data.data,
            );
            return (
              <div
                key={definition.type}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <p className="min-w-40 flex-1 text-sm font-medium">
                  {definition.label}
                </p>
                <FieldGroup className="w-auto flex-row gap-5">
                  {definition.channels.map((channel) => (
                    <Field
                      key={channel}
                      orientation="horizontal"
                      className="w-auto"
                      data-disabled={save.isPending}
                    >
                      <FieldLabel htmlFor={`${definition.type}-${channel}`}>
                        {CHANNEL_LABELS[channel]}
                      </FieldLabel>
                      <Switch
                        id={`${definition.type}-${channel}`}
                        aria-label={`${definition.label}: ${CHANNEL_LABELS[channel]}`}
                        checked={channels.includes(channel)}
                        disabled={save.isPending}
                        onCheckedChange={(checked) => {
                          if (save.isPending) return;
                          save.mutate({
                            type: definition.type,
                            channels: checked
                              ? [...channels, channel]
                              : channels.filter((item) => item !== channel),
                          });
                        }}
                      />
                    </Field>
                  ))}
                </FieldGroup>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
