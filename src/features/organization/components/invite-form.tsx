"use client";

import type { OrganizationCustomRoleKey } from "@clerk/shared/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ORG_ROLES } from "../hooks/use-org-members";

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  role: z.enum(["org:admin", "org:member"]),
});

type InviteValues = z.infer<typeof schema>;

// Form de convite (só admin renderiza). Convida via useOrgMembers().invite e limpa
// o campo no sucesso; erros de rede vêm de `error` (do hook), os de validação do RHF.
export function InviteForm({
  onInvite,
  busy,
  error,
}: {
  onInvite: (email: string, role: OrganizationCustomRoleKey) => Promise<void>;
  busy: boolean;
  error: string | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "org:member" },
  });

  const submit = handleSubmit(async ({ email, role }) => {
    await onInvite(email, role as OrganizationCustomRoleKey);
    reset({ email: "", role });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="invite_email">E-mail do convidado</Label>
          <Input
            id="invite_email"
            type="email"
            placeholder="advogado@escritorio.com"
            autoComplete="off"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite_role">Papel</Label>
          <select
            id="invite_role"
            className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm focus-visible:ring-1 focus-visible:outline-none"
            {...register("role")}
          >
            {ORG_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Enviando…" : "Convidar"}
        </Button>
      </div>
      {errors.email ? (
        <p className="text-destructive text-sm">{errors.email.message}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
