"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { z } from "zod";

const invitationSchema = z.object({
  organizationId: z.string().min(1),
  emailAddress: z.string().trim().toLowerCase().email(),
  role: z.enum(["org:admin", "org:member"]),
});

// The client SDK cannot set redirectUrl. Keep Clerk's email delivery and ticket
// validation, but send invitees back to the app instead of the Account Portal.
export async function inviteMember(input: {
  organizationId: string;
  emailAddress: string;
  role: string;
}) {
  const { userId, orgId, orgRole } = await auth();
  const invitation = invitationSchema.parse(input);
  if (
    !userId ||
    !orgId ||
    orgRole !== "org:admin" ||
    orgId !== invitation.organizationId
  ) {
    throw new Error(
      "Somente administradores do escritório podem convidar membros.",
    );
  }

  // Next validates Server Action Origin against Host/X-Forwarded-Host before
  // execution. Do not take the destination from the client payload or SITE_URL
  // (the latter belongs to the public marketing site).
  const origin = (await headers()).get("origin");
  if (!origin || !/^https?:\/\//.test(origin)) {
    throw new Error("Não foi possível determinar o endereço da aplicação.");
  }
  const client = await clerkClient();
  const created = await client.organizations.createOrganizationInvitation({
    ...invitation,
    organizationId: orgId,
    inviterUserId: userId,
    redirectUrl: new URL("/convite", origin).href,
  });
  return { id: created.id };
}
