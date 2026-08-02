"use client";

import { useOrganization } from "@clerk/nextjs";
import type { OrganizationCustomRoleKey } from "@clerk/shared/types";
import { X } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ORG_ROLES,
  roleLabel,
} from "@/features/organization/hooks/use-org-members";

import { onboardingCopy } from "../copy";

const t = onboardingCopy.team;
const common = onboardingCopy.common;

type StagedInvite = { email: string; role: OrganizationCustomRoleKey };

// Passo "Convide seu time" — cada advogado convidado traz a própria OAB → mais
// processos monitorados (valor E receita). O padrão é STAGED, como as OABs: o
// usuário ADICIONA convidados a uma lista (chips) e o CONCLUIR envia tudo de uma
// vez (organization.inviteMember por entrada) antes de fechar pro dashboard.
// Falha no meio: os que saíram somem da lista, os pendentes ficam — reconcluir
// reenvia só o que falta. Concluir com a lista vazia apenas fecha.
export function StepTeam({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}) {
  const { organization } = useOrganization();
  const [staged, setStaged] = useState<StagedInvite[]>([]);
  const [draft, setDraft] = useState("");
  const [role, setRole] = useState<OrganizationCustomRoleKey>(
    "org:member" as OrganizationCustomRoleKey,
  );
  const [addError, setAddError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const add = () => {
    const email = draft.trim().toLowerCase();
    setAddError(null);
    if (!z.string().email().safeParse(email).success) {
      setAddError(t.fields.email.invalid);
      return;
    }
    if (staged.some((s) => s.email === email)) {
      setAddError(t.fields.email.duplicate);
      return;
    }
    setStaged((prev) => [...prev, { email, role }]);
    setDraft("");
  };

  const remove = (email: string) =>
    setStaged((prev) => prev.filter((s) => s.email !== email));

  const finish = async () => {
    if (staged.length === 0 || !organization) {
      onFinish();
      return;
    }
    setSendError(null);
    setSending(true);
    const sent = new Set<string>();
    try {
      for (const inv of staged) {
        await organization.inviteMember({
          emailAddress: inv.email,
          role: inv.role,
        });
        sent.add(inv.email);
      }
      onFinish();
    } catch {
      setStaged((prev) => prev.filter((s) => !sent.has(s.email)));
      setSendError(t.sendError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="font-display text-xl tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          {t.description}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="invite_email">{t.fields.email.label}</Label>
          <Input
            id="invite_email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder={t.fields.email.placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            aria-invalid={addError ? true : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite_role">{t.fields.role.label}</Label>
          <select
            id="invite_role"
            className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 h-10 rounded-lg border px-3 text-sm shadow-xs transition-colors outline-none focus-visible:ring-3"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as OrganizationCustomRoleKey)
            }
          >
            {ORG_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" onClick={add}>
          {t.add}
        </Button>
      </div>
      {addError ? (
        <p className="text-destructive -mt-2 text-sm">{addError}</p>
      ) : null}

      {staged.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {staged.map((inv) => (
              <Badge key={inv.email} variant="secondary" className="gap-1.5">
                {inv.email}
                <span className="text-muted-foreground font-normal">
                  · {roleLabel(inv.role)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(inv.email)}
                  aria-label={`Remover ${inv.email}`}
                  className="hover:text-destructive rounded-sm"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{t.stagedHint}</p>
        </div>
      ) : null}

      {sendError ? (
        <p className="text-destructive text-sm" role="alert">
          {sendError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={sending}
        >
          {common.back}
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={() => void finish()}
          disabled={sending}
        >
          {sending ? t.sending : common.finish}
        </Button>
      </div>
    </div>
  );
}
