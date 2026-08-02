"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteForm } from "@/features/organization/components/invite-form";
import {
  roleLabel,
  useOrgMembers,
} from "@/features/organization/hooks/use-org-members";

import { onboardingCopy } from "../copy";

const t = onboardingCopy.team;
const common = onboardingCopy.common;

// Passo "Convide seu time" — cada advogado convidado traz a própria OAB → mais
// processos monitorados (valor E receita, que cobra por processo ativo). REUSA o
// InviteForm + useOrgMembers da feature organization (Regra nº1); a org já está
// ativa (criada no passo da empresa). Convidar é opcional: Concluir sempre fecha.
export function StepTeam({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}) {
  const { invite, invitations, busy, error } = useOrgMembers();
  const pending = invitations?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="font-display text-xl tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          {t.description}
        </p>
      </div>

      <InviteForm onInvite={invite} busy={busy} error={error} />

      {pending.length > 0 ? (
        <div className="flex flex-col gap-2">
          {pending.map((inv) => (
            <div
              key={inv.id}
              className="bg-muted/50 flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm"
            >
              <span className="truncate font-medium">{inv.emailAddress}</span>
              <Badge variant="secondary">{roleLabel(inv.role)}</Badge>
            </div>
          ))}
          <p className="text-muted-foreground text-xs">{t.invitedHint}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          {common.back}
        </Button>
        <Button type="button" size="lg" onClick={onFinish}>
          {common.finish}
        </Button>
      </div>
    </div>
  );
}
