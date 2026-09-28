"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { z } from "zod";

const statusSchema = z.enum(["pending", "accepted", "expired", "revoked"]);
const invitationIdSchema = z.string().min(1);
const PAGE_SIZE = 20;

async function session() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId)
    throw new Error("Entre no escritório para ver os convites.");
  return { userId, orgId, orgRole };
}

async function adminSession() {
  const current = await session();
  if (current.orgRole !== "org:admin") {
    throw new Error("Somente administradores podem gerenciar convites.");
  }
  return current;
}

export async function listTeamInvitations(
  expectedOrgId: string,
  status: string,
  page: number,
) {
  const current = await session();
  if (z.string().min(1).parse(expectedOrgId) !== current.orgId) {
    throw new Error("O escritório ativo mudou. Atualize a lista de convites.");
  }
  const filteredStatus = statusSchema.parse(status);
  const filteredPage = z.number().int().min(0).max(10000).parse(page);
  const client = await clerkClient();
  const result = await client.organizations.getOrganizationInvitationList({
    organizationId: current.orgId,
    status: [filteredStatus],
    limit: PAGE_SIZE,
    offset: filteredPage * PAGE_SIZE,
  });
  return {
    data: result.data.map((inv) => ({
      id: inv.id,
      email: inv.emailAddress,
      role: inv.role,
      status:
        inv.status === "pending" && inv.expiresAt && inv.expiresAt <= Date.now()
          ? "expired"
          : (inv.status ?? null),
      expiresAt: inv.expiresAt ?? null,
    })),
    totalCount: result.totalCount,
  };
}

export async function revokeTeamInvitation(invitationId: string) {
  const { userId, orgId } = await adminSession();
  const id = invitationIdSchema.parse(invitationId);
  const client = await clerkClient();
  const invitation = await client.organizations.getOrganizationInvitation({
    organizationId: orgId,
    invitationId: id,
  });
  if (invitation.organizationId !== orgId) {
    throw new Error("Convite não pertence a este escritório.");
  }
  if (invitation.status !== "pending" || invitation.expiresAt <= Date.now()) {
    throw new Error("Este convite já não está pendente. Atualize a lista.");
  }
  await client.organizations.revokeOrganizationInvitation({
    organizationId: orgId,
    invitationId: id,
    requestingUserId: userId,
  });
}

export async function resendTeamInvitation(invitationId: string) {
  const { userId, orgId } = await adminSession();
  const id = invitationIdSchema.parse(invitationId);
  const client = await clerkClient();
  const invitation = await client.organizations.getOrganizationInvitation({
    organizationId: orgId,
    invitationId: id,
  });
  if (invitation.organizationId !== orgId) {
    throw new Error("Convite não pertence a este escritório.");
  }
  if (invitation.status !== "pending" || invitation.expiresAt <= Date.now()) {
    throw new Error("Este convite já não está pendente. Atualize a lista.");
  }
  // Clerk has no resend method. Revoke the old ticket before creating a new
  // email request, preserving the server-read recipient, role and app callback.
  const origin = (await headers()).get("origin");
  if (!origin || !/^https?:\/\//.test(origin)) {
    throw new Error("Não foi possível determinar o endereço da aplicação.");
  }
  await client.organizations.revokeOrganizationInvitation({
    organizationId: orgId,
    invitationId: id,
    requestingUserId: userId,
  });
  try {
    const created = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: invitation.emailAddress,
      role: invitation.role,
      redirectUrl: new URL("/convite", origin).href,
    });
    return { sent: true as const, id: created.id };
  } catch {
    return { sent: false as const, previousRevoked: true as const };
  }
}

export async function replaceExpiredTeamInvitation(invitationId: string) {
  const { userId, orgId } = await adminSession();
  const id = invitationIdSchema.parse(invitationId);
  const client = await clerkClient();
  const invitation = await client.organizations.getOrganizationInvitation({
    organizationId: orgId,
    invitationId: id,
  });
  if (invitation.organizationId !== orgId) {
    throw new Error("Convite não pertence a este escritório.");
  }
  if (
    invitation.status !== "expired" &&
    !(invitation.status === "pending" && invitation.expiresAt <= Date.now())
  ) {
    throw new Error("Este convite já não está expirado. Atualize a lista.");
  }
  const origin = (await headers()).get("origin");
  if (!origin || !/^https?:\/\//.test(origin)) {
    throw new Error("Não foi possível determinar o endereço da aplicação.");
  }
  const created = await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress: invitation.emailAddress,
    role: invitation.role,
    redirectUrl: new URL("/convite", origin).href,
  });
  return { id: created.id };
}
