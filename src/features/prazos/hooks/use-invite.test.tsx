// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orgId: "org_A",
  list: vi.fn(),
}));
vi.mock("@/features/organization/hooks/use-org-members", () => ({
  useOrgMembers: () => ({ organization: { id: mocks.orgId }, isAdmin: true }),
  roleLabel: (role: string) => role,
}));
vi.mock("@/features/organization/actions/team-invitations", () => ({
  listTeamInvitations: mocks.list,
  revokeTeamInvitation: vi.fn(),
  resendTeamInvitation: vi.fn(),
  replaceExpiredTeamInvitation: vi.fn(),
}));
vi.mock("@/features/organization/actions/invite-member", () => ({
  inviteMember: vi.fn(),
}));

import { useInvite } from "./use-invite";

let latest: ReturnType<typeof useInvite>;
function Probe() {
  const state = useInvite();
  useEffect(() => {
    latest = state;
  });
  return null;
}

function pageData(orgId: string, page: number, totalCount: number) {
  return {
    data:
      page * 20 < totalCount
        ? [
            {
              id: `${orgId}-${page}`,
              email: `${orgId}@example.com`,
              role: "org:member",
              status: "pending" as const,
              expiresAt: null,
            },
          ]
        : [],
    totalCount,
  };
}

describe("invitation pagination and org binding", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.orgId = "org_A";
    mocks.list
      .mockReset()
      .mockImplementation(
        async (orgId: string, _status: string, page: number) =>
          pageData(orgId, page, orgId === "org_A" ? 21 : 2),
      );
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    client.clear();
    vi.unstubAllGlobals();
  });
  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  async function render() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
  }
  it("clamps page 2 to page 1 when 21 invitations shrink to 20", async () => {
    await render();
    await settle();
    await act(async () => latest.nextInvitationPage());
    await settle();
    expect(latest.invitationPage).toBe(1);
    expect(latest.invitationTotal).toBe(21);
    mocks.list.mockImplementation(
      async (orgId: string, _status: string, page: number) =>
        pageData(orgId, page, 20),
    );
    await act(async () => {
      await client.invalidateQueries({
        queryKey: ["organization", "invitations", "org_A"],
      });
    });
    await vi.waitFor(() => expect(latest.invitationTotal).toBe(20));
    expect(latest.invitationPage).toBe(0);
    expect(latest.pendentes).toHaveLength(1);
  });
  it("starts a smaller organization on page 1 and passes its expected org to the action", async () => {
    await render();
    await act(async () => latest.nextInvitationPage());
    mocks.orgId = "org_B";
    await render();
    await settle();
    expect(latest.invitationPage).toBe(0);
    expect(latest.invitationTotal).toBe(2);
    expect(latest.pendentes[0]?.email).toBe("org_B@example.com");
    expect(mocks.list).toHaveBeenCalledWith("org_B", "pending", 0);
  });
  it("does not display a deferred A response after switching to B", async () => {
    let resolveA!: (value: ReturnType<typeof pageData>) => void;
    mocks.list.mockImplementation(
      (orgId: string, _status: string, page: number) =>
        orgId === "org_A"
          ? new Promise((resolve) => {
              resolveA = resolve;
            })
          : Promise.resolve(pageData(orgId, page, 2)),
    );
    await render();
    mocks.orgId = "org_B";
    await render();
    await act(async () => resolveA(pageData("org_A", 0, 21)));
    await settle();
    expect(latest.pendentes[0]?.email).toBe("org_B@example.com");
    expect(mocks.list).toHaveBeenCalledWith("org_A", "pending", 0);
    expect(mocks.list).toHaveBeenCalledWith("org_B", "pending", 0);
  });
});
