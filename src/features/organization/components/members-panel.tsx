"use client";

import type { OrganizationCustomRoleKey } from "@clerk/shared/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { ORG_ROLES, roleLabel, useOrgMembers } from "../hooks/use-org-members";
import { InviteForm } from "./invite-form";

const fmtDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Seletor de papel reutilizado na tabela de membros (admin troca inline).
function RoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (role: OrganizationCustomRoleKey) => void;
}) {
  return (
    <select
      aria-label="Papel do membro"
      className="border-input bg-background h-8 rounded-md border px-2 text-sm disabled:opacity-50"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as OrganizationCustomRoleKey)}
    >
      {ORG_ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

// Painel headless da Organização (Membros + Convites). Substitui o
// <OrganizationProfile/> do Clerk: dados via useOrgMembers (useOrganization por
// baixo), marcação e estilo 100% nossos. Escrita só para admin — a UI esconde as
// ações; o BE reforça via RequireRole(ADMIN).
export function MembersPanel() {
  const {
    isLoaded,
    isAdmin,
    currentUserId,
    memberships,
    invitations,
    busy,
    error,
    invite,
    revokeInvite,
    changeRole,
    removeMember,
  } = useOrgMembers();

  if (!isLoaded) {
    return (
      <div className="text-muted-foreground reveal mt-8 text-sm">
        Carregando membros…
      </div>
    );
  }

  const members = memberships?.data ?? [];
  const pending = invitations?.data ?? [];

  return (
    <div className="reveal mt-8 flex flex-col gap-8">
      {isAdmin ? (
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-medium">Convidar membro</h2>
            <p className="text-muted-foreground text-sm">
              Ele recebe um e-mail para criar a conta e entra direto no
              escritório.
            </p>
          </div>
          <InviteForm onInvite={invite} busy={busy} error={error} />
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-medium">
          Membros{" "}
          <span className="text-muted-foreground font-normal">
            ({members.length})
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-2 pr-4 font-medium">Membro</th>
                <th className="py-2 pr-4 font-medium">Papel</th>
                <th className="py-2 pr-4 font-medium">Entrou</th>
                {isAdmin ? <th className="py-2 font-medium">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((mem) => {
                const isSelf = mem.publicUserData?.userId === currentUserId;
                const name =
                  [mem.publicUserData?.firstName, mem.publicUserData?.lastName]
                    .filter(Boolean)
                    .join(" ") || mem.publicUserData?.identifier;
                return (
                  <tr key={mem.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">
                        {name}
                        {isSelf ? (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            (você)
                          </span>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground">
                        {mem.publicUserData?.identifier}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {isAdmin && !isSelf ? (
                        <RoleSelect
                          value={mem.role}
                          disabled={busy}
                          onChange={(role) => changeRole(mem, role)}
                        />
                      ) : (
                        <Badge variant="secondary">{roleLabel(mem.role)}</Badge>
                      )}
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">
                      {fmtDate(mem.createdAt)}
                    </td>
                    {isAdmin ? (
                      <td className="py-3">
                        {!isSelf ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => removeMember(mem)}
                            className="text-destructive hover:text-destructive"
                          >
                            Remover
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {isAdmin && pending.length > 0 ? (
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-medium">
            Convites pendentes{" "}
            <span className="text-muted-foreground font-normal">
              ({pending.length})
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-2 pr-4 font-medium">E-mail</th>
                  <th className="py-2 pr-4 font-medium">Papel</th>
                  <th className="py-2 pr-4 font-medium">Enviado</th>
                  <th className="py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {inv.emailAddress}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{roleLabel(inv.role)}</Badge>
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">
                      {fmtDate(inv.createdAt)}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => revokeInvite(inv)}
                        className="text-destructive hover:text-destructive"
                      >
                        Revogar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
