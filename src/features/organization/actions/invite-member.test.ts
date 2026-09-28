import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, createInvitation, headers } = vi.hoisted(() => ({
  auth: vi.fn(),
  createInvitation: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth,
  clerkClient: async () => ({
    organizations: { createOrganizationInvitation: createInvitation },
  }),
}));
vi.mock("next/headers", () => ({ headers }));

import { inviteMember } from "./invite-member";

const input = {
  organizationId: "org_1",
  emailAddress: " Person@example.com ",
  role: "org:member",
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({
    userId: "user_1",
    orgId: "org_1",
    orgRole: "org:admin",
  });
  headers.mockResolvedValue(
    new Headers({ origin: "https://app.atjud.com.br" }),
  );
  createInvitation.mockResolvedValue({ id: "orginv_1", url: "secret-ticket" });
});

describe("organization invitation delivery", () => {
  it("creates the invitation for the authenticated organization with an app callback", async () => {
    await expect(inviteMember(input)).resolves.toEqual({ id: "orginv_1" });
    expect(createInvitation).toHaveBeenCalledExactlyOnceWith({
      organizationId: "org_1",
      inviterUserId: "user_1",
      emailAddress: "person@example.com",
      role: "org:member",
      redirectUrl: "https://app.atjud.com.br/convite",
    });
  });

  it("uses the current app origin in local development", async () => {
    headers.mockResolvedValue(new Headers({ origin: "http://localhost:3000" }));
    await inviteMember({ ...input, role: "org:admin" });
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: "http://localhost:3000/convite",
        role: "org:admin",
      }),
    );
  });

  it.each([
    { userId: null, orgId: null, orgRole: null },
    { userId: "user_1", orgId: null, orgRole: "org:admin" },
    { userId: "user_1", orgId: "org_1", orgRole: "org:member" },
    { userId: "user_1", orgId: "org_other", orgRole: "org:admin" },
  ])(
    "rejects unauthorized or stale organization context: %j",
    async (session) => {
      auth.mockResolvedValue(session);
      await expect(inviteMember(input)).rejects.toThrow();
      expect(createInvitation).not.toHaveBeenCalled();
    },
  );

  it.each([
    { emailAddress: "invalid" },
    { role: "org:owner" },
    { organizationId: "" },
  ])("rejects invalid input: %j", async (override) => {
    await expect(inviteMember({ ...input, ...override })).rejects.toThrow();
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("does not send when the callback origin is unavailable", async () => {
    headers.mockResolvedValue(new Headers());
    await expect(inviteMember(input)).rejects.toThrow();
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("propagates delivery failures without reporting success", async () => {
    createInvitation.mockRejectedValue(new Error("provider unavailable"));
    await expect(inviteMember(input)).rejects.toThrow();
  });
});
