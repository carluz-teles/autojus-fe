"use client";

import { useClerk, useOrganization, useUser } from "@clerk/nextjs";
import type { OrganizationCustomRoleKey } from "@clerk/shared/types";
import { Building2, CreditCard, Pencil, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/mock-ui/button";
import { ConfirmDialog } from "@/components/mock-ui/confirm-dialog";
import { Avatar } from "@/components/mock-ui/data-display";
import { Dialog } from "@/components/mock-ui/dialog";
import { Field, Input, Switch } from "@/components/mock-ui/input";
import { Card } from "@/components/mock-ui/layout";
import { Skeleton, SkeletonRows } from "@/components/mock-ui/skeleton";
import { StatusBadge } from "@/components/mock-ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useNotificationPreferences,
  useSetNotificationPreference,
} from "@/features/notifications/hooks/use-notification-preferences";
import { NOTIFICATION_TYPES } from "@/features/notifications/lib/labels";
import type { NotificationChannel } from "@/features/notifications/types";
import { useOrgLogo } from "@/features/organization/hooks/use-org-logo";
import {
  ORG_ROLES,
  roleLabel as clerkRoleLabel,
  useOrgMembers,
} from "@/features/organization/hooks/use-org-members";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { useOrgProfile } from "@/features/organization/hooks/use-org-profile";
import { useOrgProfileEditForm } from "@/features/organization/hooks/use-org-profile-edit-form";
import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { useRemoveOrgMember } from "@/features/organization/hooks/use-remove-org-member";
import { roleLabel as beRoleLabel } from "@/features/organization/lib/labels";
import type {
  OrgMemberView,
  OrgProfileView,
} from "@/features/organization/types";
import { ApiError } from "@/lib/api/errors";
import { maskCnpj, maskPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";

/* ---------- Organização ---------- */

/**
 * Logo da organização — caixa quadrada (rounded-lg), igual ao tratamento do
 * logo no onboarding (step2-company.tsx: bg-muted + ring, não círculo — o
 * Avatar de pessoa é redondo, mas o logo do escritório segue a mesma
 * linguagem quadrada/rounded do resto do "Ledger"). Sem upload (ou o
 * default colorido que o Clerk gera sozinho), cai no ícone de prédio. Pra
 * admin, um botão dispara upload imediato (org já existe, sem staging —
 * diferente do onboarding). Clerk-nativo, não passa pelo profile do BE.
 */
function LogoEditor({ isAdmin }: { isAdmin: boolean }) {
  const { logoUrl, uploadLogo, isUploading } = useOrgLogo();

  return (
    <div className="relative shrink-0">
      <span className="bg-muted ring-border flex size-12 items-center justify-center overflow-hidden rounded-lg ring-1">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Logo do escritório"
            className="size-full object-cover"
          />
        ) : (
          <Building2 className="text-muted-foreground/60 size-6" />
        )}
      </span>
      {isAdmin ? (
        <label
          className="bg-primary text-primary-foreground ring-card absolute -right-1.5 -bottom-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full shadow-sm ring-2 transition-opacity hover:opacity-90"
          aria-label="Trocar foto do escritório"
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadLogo(file);
              e.target.value = "";
            }}
          />
          <Pencil className="size-2.5" />
        </label>
      ) : null}
    </div>
  );
}

function profileRows(p: OrgProfileView): [string, string][] {
  return [
    ["Nome do escritório", p.trade_name],
    ["CNPJ", maskCnpj(p.cnpj)],
    ["E-mail administrativo", p.email || "—"],
    ["Telefone", p.phone ? maskPhone(p.phone) : "—"],
    [
      "Cidade",
      p.address?.cidade && p.address.uf
        ? `${p.address.cidade} / ${p.address.uf}`
        : "—",
    ],
  ];
}

export function OrganizacaoTab() {
  const { isAdmin } = useIsOrgAdmin();
  const { profile, isProfileLoading, profileLoadFailed } = useOrgProfile();
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  return (
    <div className="mt-7 flex max-w-4xl flex-col gap-4">
      <Card>
        <div className="flex items-center gap-3.5">
          <LogoEditor isAdmin={isAdmin} />
          <h2 className="font-display text-lg font-medium">
            Dados do escritório
          </h2>
        </div>
        {isProfileLoading ? (
          <SkeletonRows rows={5} className="mt-3.5" />
        ) : profileLoadFailed || !profile ? (
          <p className="text-destructive mt-3.5 text-[13px]">
            Não foi possível carregar os dados do escritório.
          </p>
        ) : (
          <div className="mt-3.5">
            {profileRows(profile).map(([k, v]) => (
              <div
                key={k}
                className="border-border flex items-center justify-between gap-4 border-t py-2.5 text-[13.5px]"
              >
                <span className="text-muted-foreground">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}
        {isAdmin ? (
          <Button
            variant="outline"
            className="mt-4"
            disabled={isProfileLoading || !profile}
            onClick={() => setEditing(true)}
          >
            Editar dados
          </Button>
        ) : null}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-medium">
            Membros e convites
          </h2>
          {isAdmin ? (
            <Button onClick={() => setInviting(true)}>Convidar membro</Button>
          ) : null}
        </div>
        <MembrosList isAdmin={isAdmin} />
      </Card>

      {editing ? (
        <EditarPerfilDialog onFechar={() => setEditing(false)} />
      ) : null}
      {inviting ? (
        <ConvidarMembroDialog onFechar={() => setInviting(false)} />
      ) : null}
    </div>
  );
}

/** Lista mesclada: membros ATIVOS (BE) + convites PENDENTES (Clerk direto). */
function MembrosList({ isAdmin }: { isAdmin: boolean }) {
  const {
    members,
    isPending: membersPending,
    error: membersError,
  } = useOrgMembersDirectory();
  const { isLoaded: clerkLoaded, invitations } = useOrgMembers();
  const { removeMember, isRemoving } = useRemoveOrgMember();
  const { user } = useUser();
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress;

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmInviteId, setConfirmInviteId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  if (membersPending || !clerkLoaded) {
    return (
      <div className="mt-3.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-border border-t py-3 first:border-t-0">
            <div className="grid grid-cols-[32px_minmax(0,1fr)_150px_110px_32px] items-center gap-3.5">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-3 w-20 justify-self-start" />
              <Skeleton className="h-5 w-16 justify-self-start rounded-full" />
              <span />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (membersError) {
    return (
      <p className="text-destructive mt-3.5 text-[13px]">
        Não foi possível carregar os membros. Tente novamente.
      </p>
    );
  }

  const pendentes = invitations?.data ?? [];

  const handleRemove = async (m: OrgMemberView) => {
    try {
      await removeMember(m.id);
      toast.success(`${m.name || m.email} removido do escritório.`);
      setConfirmId(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.message === "cannot remove yourself"
          ? "Você não pode remover a si mesmo."
          : "Não foi possível remover o membro. Tente novamente.",
      );
    }
  };

  const handleRevoke = async (
    inv: NonNullable<NonNullable<typeof invitations>["data"]>[number],
  ) => {
    setRevoking(true);
    try {
      await inv.revoke();
      void invitations?.revalidate?.();
      toast.success(`Convite para ${inv.emailAddress} revogado.`);
      setConfirmInviteId(null);
    } catch {
      toast.error("Não foi possível revogar o convite. Tente novamente.");
    } finally {
      setRevoking(false);
    }
  };

  if (members.length === 0 && pendentes.length === 0) {
    return (
      <p className="border-border text-muted-foreground mt-3.5 border-t py-3 text-[13px]">
        Nenhum membro ainda.
      </p>
    );
  }

  return (
    <div className="mt-3.5">
      {members.map((m) => {
        const displayName = m.name || m.email;
        const isSelf = !!currentUserEmail && m.email === currentUserEmail;
        return (
          <div key={m.id} className="border-border border-t py-3">
            <div className="grid grid-cols-[32px_minmax(0,1fr)_150px_110px_32px] items-center gap-3.5">
              <Avatar nome={displayName} size={32} />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium">
                  {displayName}
                </span>
                <span className="text-muted-foreground block truncate text-[11.5px]">
                  {m.email}
                </span>
              </span>
              <span className="text-muted-foreground text-[12.5px]">
                {beRoleLabel(m.role)}
              </span>
              <StatusBadge tone="success" className="justify-self-start">
                Ativo
              </StatusBadge>
              {isAdmin && !isSelf ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${displayName}`}
                  onClick={() => setConfirmId(m.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : (
                <span />
              )}
            </div>
          </div>
        );
      })}
      <ConfirmDialog
        aberto={confirmId !== null}
        titulo="Remover membro?"
        descricao={
          confirmId
            ? `Remover ${members.find((m) => m.id === confirmId)?.name || members.find((m) => m.id === confirmId)?.email} do escritório? Essa ação não pode ser desfeita.`
            : undefined
        }
        onFechar={() => setConfirmId(null)}
        onConfirmar={() => {
          const m = members.find((mem) => mem.id === confirmId);
          if (m) void handleRemove(m);
        }}
        confirmando={isRemoving}
        confirmLabel="Remover"
      />

      {pendentes.map((inv) => (
        <div key={inv.id} className="border-border border-t py-3">
          <div className="grid grid-cols-[32px_minmax(0,1fr)_150px_110px_32px] items-center gap-3.5">
            <Avatar nome="—" size={32} />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium">
                Convite pendente
              </span>
              <span className="text-muted-foreground block truncate text-[11.5px]">
                {inv.emailAddress}
              </span>
            </span>
            <span className="text-muted-foreground text-[12.5px]">
              {clerkRoleLabel(inv.role)}
            </span>
            <StatusBadge tone="warning" className="justify-self-start">
              Convidado
            </StatusBadge>
            {isAdmin ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Revogar convite para ${inv.emailAddress}`}
                onClick={() => setConfirmInviteId(inv.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : (
              <span />
            )}
          </div>
        </div>
      ))}
      <ConfirmDialog
        aberto={confirmInviteId !== null}
        titulo="Revogar convite?"
        descricao={
          confirmInviteId
            ? `Revogar o convite para ${pendentes.find((inv) => inv.id === confirmInviteId)?.emailAddress}?`
            : undefined
        }
        onFechar={() => setConfirmInviteId(null)}
        onConfirmar={() => {
          const inv = pendentes.find((i) => i.id === confirmInviteId);
          if (inv) void handleRevoke(inv);
        }}
        confirmando={revoking}
        confirmLabel="Revogar convite"
      />
    </div>
  );
}

/**
 * Dialog de edição do perfil — reusa schema/máscaras do onboarding (fonte
 * única). Localização = só Cidade + UF (endereço postal saiu do produto);
 * rua/CEP/número não são mais coletados — o que já existe no banco fica intocado
 * (preservado pelo defaultValues do form → volta no PUT).
 */
function EditarPerfilDialog({ onFechar }: { onFechar: () => void }) {
  const { register, submit, errors, isProfileLoading, isSaving } =
    useOrgProfileEditForm({ onDone: onFechar });

  const cnpj = register("cnpj");
  const phone = register("phone");

  return (
    <Dialog aberto titulo="Editar dados do escritório" onFechar={onFechar}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-muted-foreground -mt-2 text-[13px] leading-relaxed">
          Estes dados aparecem nas peças e no cadastro junto aos tribunais.
        </p>

        <Field label="Nome do escritório" error={errors.trade_name?.message}>
          <Input {...register("trade_name")} />
        </Field>

        <Field label="CNPJ" error={errors.cnpj?.message}>
          <Input
            inputMode="numeric"
            {...cnpj}
            onChange={(e) => {
              e.target.value = maskCnpj(e.target.value);
              void cnpj.onChange(e);
            }}
          />
        </Field>

        <Field label="E-mail administrativo" error={errors.email?.message}>
          <Input type="email" inputMode="email" {...register("email")} />
        </Field>

        <Field label="Telefone" error={errors.phone?.message}>
          <Input
            type="tel"
            inputMode="tel"
            {...phone}
            onChange={(e) => {
              e.target.value = maskPhone(e.target.value);
              void phone.onChange(e);
            }}
          />
        </Field>

        <div className="grid grid-cols-[1fr_80px] gap-3">
          <Field label="Cidade" error={errors.address?.cidade?.message}>
            <Input placeholder="Franca" {...register("address.cidade")} />
          </Field>
          <Field label="UF" error={errors.address?.uf?.message}>
            <Input maxLength={2} placeholder="SP" {...register("address.uf")} />
          </Field>
        </div>

        <div className="border-border mt-1 flex items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving || isProfileLoading}>
            {isSaving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Dialog de convite — abre pelo botão "Convidar membro". Um e-mail por convite
 * + o papel escolhido num radio-card (só os DOIS papéis reais: Administrador e
 * Advogado — Estagiário do design ainda não é papel do Clerk/BE). Chama
 * organization.inviteMember direto (Clerk garante a permissão
 * org:sys_memberships:manage do lado dele). O campo "OAB que o convidado traz"
 * do design foi omitido: exige plumbing de BE (metadata no convite + ativação
 * em Termos no webhook de aceite) que ainda não existe.
 */
function ConvidarMembroDialog({ onFechar }: { onFechar: () => void }) {
  const { organization, invitations } = useOrgMembers();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [role, setRole] = useState<OrganizationCustomRoleKey>(
    ORG_ROLES[1].value,
  );
  const [sending, setSending] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) {
      setEmailError("Informe um e-mail válido.");
      return;
    }
    setSending(true);
    try {
      await organization!.inviteMember({
        emailAddress: email.trim().toLowerCase(),
        role,
      });
      void invitations?.revalidate?.();
      toast.success("Convite enviado.");
      onFechar();
    } catch {
      toast.error("Não foi possível enviar o convite. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog aberto titulo="Convidar membro" onFechar={onFechar}>
      <form
        onSubmit={(e) => void submit(e)}
        className="flex flex-col gap-5"
        noValidate
      >
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          O convidado recebe um e-mail para criar a conta e entrar no
          escritório.
        </p>

        <Field label="E-mail profissional" error={emailError ?? undefined}>
          <Input
            autoFocus
            type="email"
            inputMode="email"
            placeholder="advogado@escritorio.com.br"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-[12.5px] font-medium">
            Papel
          </span>
          <div
            role="radiogroup"
            aria-label="Papel"
            className="flex flex-col gap-2"
          >
            {ORG_ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    selected
                      ? "border-primary ring-primary/20 bg-[color-mix(in_oklch,var(--primary)_4%,transparent)] ring-1"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-px flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                      selected ? "border-primary" : "border-border",
                    )}
                  >
                    {selected ? (
                      <span className="bg-primary size-2 rounded-full" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium">
                      {r.label}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-[12.5px] leading-relaxed">
                      {r.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-border flex items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!emailValid || sending}>
            {sending ? "Enviando…" : "Enviar convite"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------- Cobrança ---------- */

export function CobrancaTab() {
  return (
    <div className="mt-7 max-w-4xl">
      <EmptyState
        icon={CreditCard}
        title="Plano e faturas"
        description="A gestão de plano, uso e faturas ainda não está disponível."
        phase="Em breve"
      />
    </div>
  );
}

/* ---------- Notificações ---------- */

/** Canais suportados pelo produto. Ordem é a da coluna na matriz. */
const CANAIS: { key: NotificationChannel; label: string }[] = [
  { key: "IN_APP", label: "App" },
  { key: "EMAIL", label: "E-mail" },
];

export function NotificacoesTab() {
  const { data, isPending, isError } = useNotificationPreferences();
  const { mutate: setPreference, isPending: isSaving } =
    useSetNotificationPreference();

  // Reconstrói um Map<type, Set<channel>> a partir dos overrides salvos.
  // Tipo AUSENTE no Map = default = ambos os canais ligados.
  const overrides = new Map(
    (data?.data ?? []).map((p) => [p.type, new Set(p.channels)]),
  );

  const isOn = (type: string, channel: NotificationChannel): boolean => {
    if (!overrides.has(type)) return true; // default: tudo ligado
    return overrides.get(type)!.has(channel);
  };

  const toggle = (type: string, channel: NotificationChannel) => {
    // Estado efetivo atual
    const currentChannels = overrides.has(type)
      ? [...overrides.get(type)!]
      : (CANAIS.map((c) => c.key) as NotificationChannel[]);

    const wasOn = currentChannels.includes(channel);
    const newChannels = wasOn
      ? currentChannels.filter((c) => c !== channel)
      : [...currentChannels, channel];

    setPreference({ type, channels: newChannels as NotificationChannel[] });
  };

  return (
    <Card className="mt-7 max-w-3xl">
      <h2 className="font-display text-lg font-medium">
        Preferências de notificação
      </h2>
      <p className="text-muted-foreground mt-2 text-[13px]">
        Escolha por qual canal receber cada tipo de aviso. Sem configuração
        salva, todos os canais ficam ativos por padrão.
      </p>

      {isPending ? (
        <div className="mt-4.5">
          <div className="border-border grid grid-cols-[minmax(0,1fr)_repeat(2,100px)] gap-2.5 border-b pb-2.5">
            <span />
            {CANAIS.map((c) => (
              <Skeleton key={c.key} className="h-3 w-10 justify-self-center" />
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="border-border grid grid-cols-[minmax(0,1fr)_repeat(2,100px)] items-center gap-2.5 border-b py-3 last:border-0"
            >
              <Skeleton className="h-3.5 w-40" />
              {CANAIS.map((c) => (
                <Skeleton
                  key={c.key}
                  className="h-5 w-8.5 justify-self-center rounded-full"
                />
              ))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="text-destructive mt-4 text-sm">
          Não foi possível carregar as preferências. Tente novamente.
        </p>
      ) : (
        <>
          <div className="border-border mt-4.5 grid grid-cols-[minmax(0,1fr)_repeat(2,100px)] gap-2.5 border-b pb-2.5">
            <span />
            {CANAIS.map((c) => (
              <span
                key={c.key}
                className="text-muted-foreground text-center text-[11px] font-medium tracking-[0.06em] uppercase"
              >
                {c.label}
              </span>
            ))}
          </div>

          {NOTIFICATION_TYPES.map(({ type, label }) => (
            <div
              key={type}
              className="border-border grid grid-cols-[minmax(0,1fr)_repeat(2,100px)] items-center gap-2.5 border-b py-3 last:border-0"
            >
              <span className="text-[13.5px]">{label}</span>
              {CANAIS.map((canal) => (
                <span key={canal.key} className="justify-self-center">
                  <Switch
                    checked={isOn(type, canal.key)}
                    onCheckedChange={() => toggle(type, canal.key)}
                    aria-label={`${label} — ${canal.label}`}
                    disabled={isSaving}
                  />
                </span>
              ))}
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

/* ---------- Perfil ---------- */

export function PerfilTab() {
  const { user, isLoaded } = useUser();
  const { membership } = useOrganization();
  const { openUserProfile } = useClerk();

  // Papel do usuário: mapeia a chave do Clerk para label legível.
  const papel = clerkRoleLabel(membership?.role ?? "");

  if (!isLoaded) {
    return (
      <div className="mt-7 flex max-w-3xl flex-col gap-4">
        <Card>
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <SkeletonRows rows={3} className="mt-4" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-24" />
          <SkeletonRows rows={2} className="mt-3" />
        </Card>
      </div>
    );
  }

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress;
  const photoUrl = user.hasImage ? user.imageUrl : null;
  const infoRows: [string, string][] = [
    ["Nome", user.fullName ?? "—"],
    ["E-mail", email ?? "—"],
    ["Papel", papel || "—"],
  ];

  return (
    <div className="mt-7 flex max-w-3xl flex-col gap-4">
      <Card>
        <div className="flex items-center gap-3.5">
          <Avatar
            nome={user.fullName ?? email ?? "?"}
            src={photoUrl}
            size={48}
            destaque={!photoUrl}
          />
          <div>
            <p className="font-display text-xl">{user.fullName ?? "—"}</p>
            <p className="text-muted-foreground text-[12.5px]">
              {papel || "Membro"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => openUserProfile()}
          >
            Gerenciar conta
          </Button>
        </div>
        <div className="mt-4">
          {infoRows.map(([k, v]) => (
            <div
              key={k}
              className="border-border flex items-center justify-between gap-4 border-t py-2.5 text-[13.5px]"
            >
              <span className="text-muted-foreground">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Shield
            className="text-muted-foreground size-[15px]"
            strokeWidth={1.7}
          />
          <h2 className="font-display text-lg font-medium">Segurança</h2>
        </div>
        <div className="border-border mt-3 flex items-center justify-between gap-4 border-t py-3">
          <span className="text-[13.5px]">
            Alterar senha
            <span className="text-muted-foreground block text-[11.5px]">
              Gerenciado pelo Clerk
            </span>
          </span>
          <Button
            variant="outline"
            size="sm"
            // Abre direto na aba "Security" (não "Account", o default) — API
            // documentada pelo Clerk, ainda que com prefixo experimental.
            onClick={() =>
              openUserProfile({ __experimental_startPath: "/security" })
            }
          >
            Alterar senha
          </Button>
        </div>
        <div className="border-border flex items-center justify-between gap-4 border-t py-3">
          <span className="text-[13.5px]">
            Verificação em duas etapas
            {user.twoFactorEnabled !== undefined && (
              <span className="text-muted-foreground block text-[11.5px]">
                {user.twoFactorEnabled
                  ? "Habilitada na sua conta"
                  : "Não habilitada"}
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {user.twoFactorEnabled !== undefined && (
              <StatusBadge tone={user.twoFactorEnabled ? "success" : "neutral"}>
                {user.twoFactorEnabled ? "Ativa" : "Inativa"}
              </StatusBadge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openUserProfile()}
            >
              Gerenciar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
