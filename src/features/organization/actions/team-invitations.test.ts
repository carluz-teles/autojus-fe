import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, headers, list, get, revoke, create } = vi.hoisted(() => ({
  auth: vi.fn(),
  headers: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  revoke: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth,
  clerkClient: async () => ({
    organizations: {
      getOrganizationInvitationList: list,
      getOrganizationInvitation: get,
      revokeOrganizationInvitation: revoke,
      createOrganizationInvitation: create,
    },
  }),
}));
vi.mock("next/headers", () => ({ headers }));

import {
  listTeamInvitations,
  replaceExpiredTeamInvitation,
  resendTeamInvitation,
  revokeTeamInvitation,
} from "./team-invitations";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({
    userId: "user_1",
    orgId: "org_1",
    orgRole: "org:admin",
  });
  headers.mockResolvedValue(new Headers({ origin: "https://app.example.com" }));
  get.mockResolvedValue({
    id: "inv_1",
    organizationId: "org_1",
    status: "pending",
    expiresAt: Date.now() + 86400000,
    emailAddress: "person@example.com",
    role: "org:member",
  });
  revoke.mockResolvedValue({});
  create.mockResolvedValue({ id: "inv_2" });
  list.mockResolvedValue({
    data: [
      {
        id: "inv_1",
        emailAddress: "person@example.com",
        role: "org:member",
        status: "accepted",
        expiresAt: Date.now() + 86400000,
        url: "secret",
      },
    ],
    totalCount: 42,
  });
});

describe("team invitation history", () => {
  it("uses status filters and bounded offset, without returning ticket URLs", async () => {
    const result = await listTeamInvitations("org_1", "accepted", 1);
    expect(list).toHaveBeenCalledWith({
      organizationId: "org_1",
      status: ["accepted"],
      limit: 20,
      offset: 20,
    });
    expect(result.totalCount).toBe(42);
    expect(result.data[0]).not.toHaveProperty("url");
    expect(result.data[0].status).toBe("accepted");
  });
  it("rejects a queued read if the active organization changed", async () => {
    auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_B",
      orgRole: "org:admin",
    });
    await expect(listTeamInvitations("org_A", "pending", 0)).rejects.toThrow(
      "escritório ativo mudou",
    );
    expect(list).not.toHaveBeenCalled();
  });
  it("rejects bad pagination and unauthenticated access", async () => {
    await expect(listTeamInvitations("org_1", "pending", -1)).rejects.toThrow();
    auth.mockResolvedValue({ userId: null, orgId: null });
    await expect(listTeamInvitations("org_1", "pending", 0)).rejects.toThrow();
    expect(list).not.toHaveBeenCalled();
  });
});

describe("team invitation mutations", () => {
  it("revokes then creates a replacement with server-read recipient and callback", async () => {
    await expect(resendTeamInvitation("inv_1")).resolves.toEqual({
      sent: true,
      id: "inv_2",
    });
    expect(revoke).toHaveBeenCalledWith({
      organizationId: "org_1",
      invitationId: "inv_1",
      requestingUserId: "user_1",
    });
    expect(create).toHaveBeenCalledWith({
      organizationId: "org_1",
      inviterUserId: "user_1",
      emailAddress: "person@example.com",
      role: "org:member",
      redirectUrl: "https://app.example.com/convite",
    });
    expect(revoke.mock.invocationCallOrder[0]).toBeLessThan(
      create.mock.invocationCallOrder[0],
    );
  });
  it("does not create when revoke fails", async () => {
    revoke.mockRejectedValue(new Error("conflict"));
    await expect(resendTeamInvitation("inv_1")).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it("reports partial failure when old invite is revoked but recreation fails", async () => {
    create.mockRejectedValue(new Error("delivery failed"));
    await expect(resendTeamInvitation("inv_1")).resolves.toEqual({
      sent: false,
      previousRevoked: true,
    });
  });
  it.each(["accepted", "revoked", "expired"])(
    "refuses resend of %s invitations",
    async (status) => {
      get.mockResolvedValue({
        organizationId: "org_1",
        status,
        expiresAt: Date.now() + 86400000,
      });
      await expect(resendTeamInvitation("inv_1")).rejects.toThrow();
      expect(revoke).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );
  it("refuses a cross-organization invitation even when its ID is supplied directly", async () => {
    get.mockResolvedValue({
      organizationId: "org_other",
      status: "pending",
      expiresAt: Date.now() + 86400000,
    });
    await expect(resendTeamInvitation("inv_1")).rejects.toThrow();
    expect(revoke).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects non-admin revocation", async () => {
    auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    await expect(revokeTeamInvitation("inv_1")).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });
  it("replaces an expired invitation without revoking it", async () => {
    get.mockResolvedValue({
      organizationId: "org_1",
      status: "expired",
      expiresAt: Date.now() - 1000,
      emailAddress: "person@example.com",
      role: "org:member",
    });
    await expect(replaceExpiredTeamInvitation("inv_1")).resolves.toEqual({
      id: "inv_2",
    });
    expect(revoke).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
  });
});
