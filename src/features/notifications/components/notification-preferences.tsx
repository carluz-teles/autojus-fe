"use client";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  useNotificationPreferences,
  useSetNotificationPreference,
} from "../hooks/use-notification-preferences";
import { NOTIFICATION_TYPES } from "../lib/labels";
import type { NotificationPreference } from "../types";

// Só o canal EMAIL é exposto aqui: hoje é o único canal que o BE realmente
// verifica antes de enviar (internal/notifications/domain.go, channelEnabled) —
// os avisos IN_APP (o sino) não respeitam preferência ainda, então um toggle para
// esse canal não teria efeito nenhum e só confundiria o usuário.
const EMAIL = "EMAIL";

// Resolve se EMAIL está habilitado para `type`: ausência de override = default
// (habilitado); override presente = union() checa se EMAIL está no conjunto salvo.
function emailEnabled(
  prefs: NotificationPreference[] | undefined,
  type: string,
): boolean {
  const pref = prefs?.find((p) => p.type === type);
  if (!pref) return true;
  return pref.channels.includes(EMAIL);
}

// Painel headless "Preferências de notificação" — uma linha por tipo de aviso
// conhecido, com um checkbox "Receber por e-mail". Desmarcar salva um PUT com
// channels:[] (ou sem EMAIL, se outro canal um dia entrar); marcar de volta salva
// channels:["EMAIL"]. Cada linha salva independentemente (sem botão "Salvar").
export function NotificationPreferences() {
  const { data, isPending, isError } = useNotificationPreferences();
  const setPreference = useSetNotificationPreference();

  if (isPending) {
    return (
      <div className="text-muted-foreground reveal mt-8 text-sm">
        Carregando preferências…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-destructive reveal mt-8 text-sm">
        Não foi possível carregar suas preferências. Tente novamente.
      </div>
    );
  }

  const prefs = data?.data ?? [];

  return (
    <Card className="reveal mt-8 flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-lg font-medium">Preferências de notificação</h2>
        <p className="text-muted-foreground text-sm">
          Escolha quais avisos você também quer receber por e-mail. Todos
          continuam aparecendo no sino de notificações.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {NOTIFICATION_TYPES.map(({ type, label }) => {
          const checked = emailEnabled(prefs, type);
          const pending =
            setPreference.isPending && setPreference.variables?.type === type;
          return (
            <div key={type} className="flex items-center gap-3">
              <Checkbox
                id={`pref-${type}`}
                checked={checked}
                disabled={pending}
                onCheckedChange={(next) =>
                  setPreference.mutate({
                    type,
                    channels: next === true ? [EMAIL] : [],
                  })
                }
              />
              <Label htmlFor={`pref-${type}`} className="font-normal">
                {label}
              </Label>
            </div>
          );
        })}
      </div>
      {setPreference.isError ? (
        <p className="text-destructive text-sm">
          Não foi possível salvar essa preferência. Tente novamente.
        </p>
      ) : null}
    </Card>
  );
}
